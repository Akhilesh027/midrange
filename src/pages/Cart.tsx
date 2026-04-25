import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Tag,
  X,
  Truck,
  Loader2,
  Gift,
  CreditCard,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

const WEBSITE: "affordable" | "midrange" | "luxury" = "midrange";
const API_BASE = `https://api.jsgallor.com/api/${WEBSITE}`;

function getToken() {
  return localStorage.getItem("midrange_token");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: any = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

type ApplyCouponResponse = {
  valid?: boolean;
  success?: boolean;
  message?: string;
  coupon?: {
    couponId?: string;
    id?: string;
    code: string;
    type: "percentage" | "flat" | "free_shipping";
    value: number;
    maxDiscount?: number;
    minOrder?: number;
    applyTo?: "all_categories" | "selected_categories";
    categories?: Array<{ id?: string; name?: string; slug?: string }>;
  };
  discount?: number;
  shippingDiscount?: number;
};

const LS_USER_KEY = "midrange_user";

function getSavedUserId(): string | null {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.id ? String(u.id) : u?._id ? String(u._id) : null;
  } catch {
    return null;
  }
}

const getColorName = (hex: string) => {
  const colors: Record<string, string> = {
    "#8B7355": "Brown",
    "#1C1C1C": "Black",
    "#F5E6D3": "White",
    "#4A4A4A": "Grey",
    "#4A6741": "Green",
    "#2C3E50": "Blue",
  };
  return colors[hex.toUpperCase()] || hex;
};

// ------------------------------------------------------------------
// Helper: get discounted price (handles inclusive/exclusive flag)
// ------------------------------------------------------------------
function getDiscountedPrice(
  originalPrice: number,
  discountPercent: number,
  priceIncludesGst: boolean,
  gstPercent: number
): { discountedInclusive: number; discountedExclusive: number } {
  const discountFactor = 1 - discountPercent / 100;
  if (priceIncludesGst) {
    const discountedInclusive = originalPrice * discountFactor;
    const discountedExclusive = discountedInclusive / (1 + gstPercent / 100);
    return { discountedInclusive, discountedExclusive };
  } else {
    const discountedExclusive = originalPrice * discountFactor;
    const discountedInclusive = discountedExclusive * (1 + gstPercent / 100);
    return { discountedInclusive, discountedExclusive };
  }
}

// ------------------------------------------------------------------
// Dynamic shipping (based on discounted exclusive subtotal)
// ------------------------------------------------------------------
const getShippingCost = (tier: typeof WEBSITE, subtotalExclusive: number) => {
  if (tier === "affordable") return subtotalExclusive >= 5000 ? 0 : 99;
  if (tier === "midrange") return subtotalExclusive >= 10000 ? 0 : 499;
  return subtotalExclusive >= 20000 ? 0 : 999; // luxury
};

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart, refreshCartFromBackend } =
    useCart();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponApplied, setCouponApplied] =
    useState<ApplyCouponResponse["coupon"] | null>(null);
  const [discount, setDiscount] = useState(0); // coupon discount (subtracted from inclusive total)
  const [shippingDiscount, setShippingDiscount] = useState(0);

  // ------------------------------------------------------------------
  // Compute all pricing variants (inclusive & exclusive, before/after product discount)
  // ------------------------------------------------------------------
  const pricing = useMemo(() => {
    let originalExclusiveTotal = 0;
    let originalInclusiveTotal = 0;
    let discountedExclusiveTotal = 0;
    let discountedInclusiveTotal = 0;
    let productDiscountInclusiveTotal = 0;
    let productDiscountExclusiveTotal = 0;

    // Store per‑item details for later coupon allocation
    const itemDetails: Array<{
      discountedExclusive: number;
      discountedInclusive: number;
      gstPercent: number;
      quantity: number;
    }> = [];

    for (const item of items) {
      const product = item.product || {};
      const origPrice = product.originalPrice || 0;
      const discPercent = product.discountPercent || 0;
      const gstPercent = product.gst || 0;
      const priceIncludesGst = product.priceIncludesGst ?? true; // default true for existing data
      const qty = item.quantity;

      const { discountedInclusive, discountedExclusive } = getDiscountedPrice(
        origPrice,
        discPercent,
        priceIncludesGst,
        gstPercent
      );

      let originalInclusive, originalExclusive;
      if (priceIncludesGst) {
        originalInclusive = origPrice;
        originalExclusive = origPrice / (1 + gstPercent / 100);
      } else {
        originalExclusive = origPrice;
        originalInclusive = origPrice * (1 + gstPercent / 100);
      }

      const lineOriginalExclusive = originalExclusive * qty;
      const lineOriginalInclusive = originalInclusive * qty;
      const lineDiscountedExclusive = discountedExclusive * qty;
      const lineDiscountedInclusive = discountedInclusive * qty;
      const lineProductDiscountExclusive = lineOriginalExclusive - lineDiscountedExclusive;
      const lineProductDiscountInclusive = lineOriginalInclusive - lineDiscountedInclusive;

      originalExclusiveTotal += lineOriginalExclusive;
      originalInclusiveTotal += lineOriginalInclusive;
      discountedExclusiveTotal += lineDiscountedExclusive;
      discountedInclusiveTotal += lineDiscountedInclusive;
      productDiscountExclusiveTotal += lineProductDiscountExclusive;
      productDiscountInclusiveTotal += lineProductDiscountInclusive;

      itemDetails.push({
        discountedExclusive: lineDiscountedExclusive,
        discountedInclusive: lineDiscountedInclusive,
        gstPercent,
        quantity: qty,
      });
    }

    return {
      originalExclusiveTotal,
      originalInclusiveTotal,
      discountedExclusiveTotal,
      discountedInclusiveTotal,
      productDiscountExclusiveTotal,
      productDiscountInclusiveTotal,
      itemDetails,
    };
  }, [items]);

  // ------------------------------------------------------------------
  // GST after product discount (before coupon) - used in UI
  // ------------------------------------------------------------------
  const gstAmount = useMemo(() => {
    return pricing.discountedInclusiveTotal - pricing.discountedExclusiveTotal;
  }, [pricing]);

  // ------------------------------------------------------------------
  // Apply coupon discount on **inclusive** discounted total (standard behaviour)
  // You can change this to exclusive by altering the next two lines.
  // ------------------------------------------------------------------
  const afterCouponInclusive = Math.max(0, pricing.discountedInclusiveTotal - discount);

  // Shipping (based on exclusive subtotal after product discount)
  const shippingBase = useMemo(() => {
    return getShippingCost(WEBSITE, pricing.discountedExclusiveTotal);
  }, [pricing.discountedExclusiveTotal]);

  const shipping = Math.max(0, shippingBase - shippingDiscount);

  // Grand total
  const finalTotal = afterCouponInclusive + shipping;

  // ------------------------------------------------------------------
  // Coupon persistence & API
  // ------------------------------------------------------------------
  const userId = getSavedUserId();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${WEBSITE}_coupon`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setCouponCode(parsed?.code || "");
      setCouponApplied(parsed?.coupon || null);
      setDiscount(Number(parsed?.discount || 0));
      setShippingDiscount(Number(parsed?.shippingDiscount || 0));
    } catch {
      // ignore
    }
  }, []);

  const persistCoupon = (payload: {
    code: string;
    coupon: any;
    discount: number;
    shippingDiscount: number;
  }) => {
    localStorage.setItem(`${WEBSITE}_coupon`, JSON.stringify(payload));
  };

  const clearCouponPersisted = () => {
    localStorage.removeItem(`${WEBSITE}_coupon`);
  };

  const buildCouponItemsPayload = () => {
    return items.map((item: any) => {
      const product = item?.product || {};
      const qty = Number(item?.quantity || 1);
      const origPrice = product.originalPrice || 0;
      const discPercent = product.discountPercent || 0;
      const gstPercent = product.gst || 0;
      const priceIncludesGst = product.priceIncludesGst ?? true;
      const { discountedExclusive } = getDiscountedPrice(
        origPrice,
        discPercent,
        priceIncludesGst,
        gstPercent
      );

      return {
        productId: product.id || product._id,
        quantity: qty,
        price: discountedExclusive, // send exclusive price to backend
        lineTotal: discountedExclusive * qty,
        categoryId: product.categoryId,
        category: product.category,
        subcategoryId: product.subcategoryId,
        subcategory: product.subcategory,
        product: {
          categoryId: product.categoryId,
          category: product.category,
          subcategoryId: product.subcategoryId,
          subcategory: product.subcategory,
          price: discountedExclusive,
        },
        productSnapshot: {
          categoryId: product.categoryId,
          category: product.category,
          subcategoryId: product.subcategoryId,
          subcategory: product.subcategory,
          price: product.price,
          finalPrice: discountedExclusive,
        },
      };
    });
  };

  const applyCouponInternal = async (codeRaw: string, silent = false) => {
    const code = codeRaw.trim().toUpperCase();
    if (!code) {
      if (!silent) toast.error("Enter coupon code");
      return;
    }
    if (items.length === 0) {
      if (!silent) toast.error("Cart is empty");
      return;
    }

    try {
      setCouponLoading(true);
      const res = await apiFetch("/coupons/apply", {
        method: "POST",
        body: JSON.stringify({
          code,
          cartTotal: pricing.discountedExclusiveTotal, // exclusive total after product discount
          shipping: shippingBase,
          userId: userId || undefined,
          items: buildCouponItemsPayload(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setCouponApplied(null);
        setDiscount(0);
        setShippingDiscount(0);
        clearCouponPersisted();
        if (!silent) toast.error(json?.error || json?.message || "Invalid coupon");
        return;
      }

      const data: ApplyCouponResponse = json?.data || json;
      const backendCoupon = data?.coupon || json?.coupon;
      const backendDiscount = Number(data?.discount ?? json?.discount ?? 0);
      const backendShippingDiscount = Number(
        data?.shippingDiscount ?? json?.shippingDiscount ?? 0
      );

      if (!backendCoupon) {
        setCouponApplied(null);
        setDiscount(0);
        setShippingDiscount(0);
        clearCouponPersisted();
        if (!silent) toast.error(data?.message || json?.message || "Invalid coupon");
        return;
      }

      const normalizedCoupon = {
        couponId: backendCoupon?.couponId || backendCoupon?.id,
        id: backendCoupon?.id,
        code: backendCoupon.code,
        type: backendCoupon.type,
        value: backendCoupon.value,
        maxDiscount: backendCoupon.maxDiscount,
        minOrder: backendCoupon.minOrder,
        applyTo: backendCoupon.applyTo,
        categories: backendCoupon.categories || [],
      };

      setCouponApplied(normalizedCoupon);
      setDiscount(backendDiscount);
      setShippingDiscount(backendShippingDiscount);
      persistCoupon({
        code: normalizedCoupon.code || code,
        coupon: normalizedCoupon,
        discount: backendDiscount,
        shippingDiscount: backendShippingDiscount,
      });

      if (!silent) {
        toast.success(`Coupon applied: ${normalizedCoupon.code || code}`);
      }
    } catch (e: any) {
      if (!silent) toast.error(e?.message || "Failed to apply coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    await applyCouponInternal(couponCode, false);
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponApplied(null);
    setDiscount(0);
    setShippingDiscount(0);
    clearCouponPersisted();
    toast.message("Coupon removed");
  };

  useEffect(() => {
    if (!couponApplied?.code) return;
    applyCouponInternal(couponApplied.code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing.discountedExclusiveTotal, shippingBase, items.length]);

  // Cart item helpers
  const getItemId = (item: any): string => {
    if (item._id) return item._id;
    const productId = item.product.id;
    const variantId = item.product.variantId;
    return variantId ? `${productId}:${variantId}` : productId;
  };

  const handleUpdateQuantity = async (item: any, newQuantity: number) => {
    if (newQuantity < 1) {
      await handleRemoveItem(item);
      return;
    }
    const itemId = getItemId(item);
    await updateQuantity(itemId, newQuantity);
    await refreshCartFromBackend();
  };

  const handleRemoveItem = async (item: any) => {
    const itemId = getItemId(item);
    await removeFromCart(itemId);
    await refreshCartFromBackend();
    toast.success("Item removed from cart");
  };

  const handleProceedToCheckout = async () => {
    if (items.length === 0) return;
    await refreshCartFromBackend();
    if (couponApplied) {
      navigate("/checkout", {
        state: {
          coupon: {
            couponId: couponApplied.couponId || couponApplied.id,
            id: couponApplied.id,
            code: couponApplied.code,
            type: couponApplied.type,
            value: couponApplied.value,
          },
          discount,
          shippingDiscount,
          cartTotal: pricing.discountedExclusiveTotal,
          shippingBase,
          shipping,
          tax: gstAmount,
          finalTotal,
        },
      });
      return;
    }
    navigate("/checkout");
  };

  const cartCount = useMemo(
    () => items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0),
    [items]
  );

  if (items.length === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-md mx-auto text-center">
              <ShoppingBag className="w-24 h-24 text-[#d6dfbd] mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-[#f4f7ec] mb-4">Your Cart is Empty</h1>
              <p className="text-[#d6dfbd] mb-8">
                Looks like you haven&apos;t added any items to your cart yet.
              </p>
              <Button
                asChild
                className="bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
                size="lg"
              >
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
        <nav className="bg-[#4b5e29] py-3 border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-[#eef4df] hover:underline">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-[#d6dfbd]" />
              <span className="text-[#d6dfbd]">Cart</span>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#f4f7ec] mb-2">Your Cart</h1>
          <p className="text-sm text-[#d6dfbd] mb-8">
            {cartCount} item{cartCount > 1 ? "s" : ""} in your cart
          </p>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items - Left Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#4b5e29] rounded-xl border border-white/10 overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-[#3f4f22] border-b border-white/10 text-sm font-medium text-[#d6dfbd]">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                {items.map((item: any) => {
                  const product = item.product || {};
                  const image = product.image || "";
                  const name = product.name || "Product";
                  const category = product.category || "";
                  const origPrice = product.originalPrice || 0;
                  const discPercent = product.discountPercent || 0;
                  const gstPercent = product.gst || 0;
                  const priceIncludesGst = product.priceIncludesGst ?? true;

                  const { discountedInclusive, discountedExclusive } = getDiscountedPrice(
                    origPrice,
                    discPercent,
                    priceIncludesGst,
                    gstPercent
                  );

                  const variantAttributes = product.variantAttributes || {};
                  const itemId = getItemId(item);
                  const hasDiscount = discPercent > 0;

                  return (
                    <div
                      key={itemId}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 md:px-6 py-4 border-b border-white/10 last:border-b-0"
                    >
                      <div className="md:col-span-6 flex gap-4">
                        <Link to={`/product/${product.id}`} className="flex-shrink-0">
                          <img
                            src={image}
                            alt={name}
                            className="w-20 h-20 rounded-lg object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://via.placeholder.com/80?text=No+Image";
                            }}
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/product/${product.id}`}
                            className="font-medium text-[#f4f7ec] hover:text-[#eef4df] transition-colors line-clamp-1"
                          >
                            {name}
                          </Link>
                          <p className="text-sm text-[#d6dfbd]">{category}</p>
                          {hasDiscount && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs line-through text-[#b7c49a]">
                                {formatPrice(origPrice)}
                              </span>
                              <span className="text-xs bg-green-700 px-1.5 py-0.5 rounded-full text-white">
                                {discPercent}% OFF
                              </span>
                            </div>
                          )}
                          {(variantAttributes.color ||
                            variantAttributes.size ||
                            variantAttributes.fabric) && (
                            <div className="flex flex-wrap gap-2 mt-1 text-xs">
                              {variantAttributes.color && (
                                <span className="inline-flex items-center gap-1 bg-[#3f4f22] px-2 py-0.5 rounded-full">
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: variantAttributes.color }}
                                  />
                                  {getColorName(variantAttributes.color)}
                                </span>
                              )}
                              {variantAttributes.size && (
                                <span className="bg-[#3f4f22] px-2 py-0.5 rounded-full">
                                  Size: {variantAttributes.size}
                                </span>
                              )}
                              {variantAttributes.fabric && (
                                <span className="bg-[#3f4f22] px-2 py-0.5 rounded-full capitalize">
                                  {variantAttributes.fabric}
                                </span>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => handleRemoveItem(item)}
                            className="mt-2 text-sm text-red-300 hover:underline flex items-center gap-1 md:hidden"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between md:justify-center">
                        <span className="md:hidden text-[#d6dfbd] text-sm">Price:</span>
                        <span className="text-[#f4f7ec]">{formatPrice(discountedInclusive)}</span>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between md:justify-center gap-2">
                        <span className="md:hidden text-[#d6dfbd] text-sm">Quantity:</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                            className="w-8 h-8 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-[#eef4df] disabled:opacity-50"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-10 text-center text-sm text-[#f4f7ec]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                            className="w-8 h-8 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-[#eef4df]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3">
                        <span className="md:hidden text-[#d6dfbd] text-sm">Total:</span>
                        <span className="font-semibold text-[#eef4df]">
                          {formatPrice(discountedInclusive * item.quantity)}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="hidden md:block text-[#d6dfbd] hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Input */}
              <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#d6dfbd]" />
                    <Input
                      placeholder="Enter coupon code"
                      className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb] pl-9"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={couponLoading}
                    />
                  </div>
                  {!couponApplied ? (
                    <Button
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                    >
                      {couponLoading ? "Applying..." : "Apply"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleRemoveCoupon}
                      className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22] gap-2"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </Button>
                  )}
                </div>
                {couponApplied && (
                  <div className="mt-2 text-xs text-[#d6dfbd]">
                    Applied:{" "}
                    <span className="font-semibold text-[#f4f7ec]">{couponApplied.code}</span>
                    {discount > 0 && (
                      <span className="ml-2 text-green-300">
                        (-{formatPrice(discount)})
                      </span>
                    )}
                    {shippingDiscount > 0 && (
                      <span className="ml-2 text-green-300">
                        (-{formatPrice(shippingDiscount)} shipping)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ========== ORDER SUMMARY (with inclusive flag support) ========== */}
            <div className="lg:col-span-1">
              <div className="bg-[#4b5e29] rounded-2xl border border-white/10 p-4 sm:p-6 lg:sticky lg:top-24">
                <h2 className="text-lg sm:text-xl font-bold mb-5 sm:mb-6">Order Summary</h2>

                <div className="flex items-start gap-3 p-3 bg-amber-50/10 rounded-xl mb-6">
                  <Truck className="h-5 w-5 text-[#eef4df] shrink-0 mt-0.5" />
                  <div className="text-sm w-full text-[#d6dfbd]">
                    {!userId ? "Login to calculate shipping" : "Shipping calculated at checkout"}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  {/* 1. Original Total (inclusive) */}
                  <div className="flex justify-between gap-3">
                    <span className="text-[#d6dfbd]">Original Total</span>
                    <span className="text-right line-through text-[#d6dfbd]">
                      {formatPrice(pricing.originalInclusiveTotal)}
                    </span>
                  </div>

                  {/* 2. Product Discount (inclusive) */}
                  {pricing.productDiscountInclusiveTotal > 0 && (
                    <div className="flex justify-between gap-3 text-green-300">
                      <span>
                        Discount ({(items[0]?.product?.discountPercent || 0)}% off)
                      </span>
                      <span className="text-right">
                        -{formatPrice(pricing.productDiscountInclusiveTotal)}
                      </span>
                    </div>
                  )}

                  {/* 3. Price after product discount (inclusive) */}
                  <div className="flex justify-between gap-3 pt-1 border-t border-white/10">
                    <span className="text-[#d6dfbd] font-medium">Price after discount</span>
                    <span className="font-bold text-right text-[#f4f7ec]">
                      {formatPrice(pricing.discountedInclusiveTotal)}
                    </span>
                  </div>

                  {/* 4. GST (split out from the inclusive price) */}
                  <div className="flex justify-between gap-3 text-xs text-[#d6dfbd]">
                    <span>(inclusive of GST)</span>
                    <span>{formatPrice(gstAmount)}</span>
                  </div>

                  {/* 5. Coupon Discount */}
                  {discount > 0 && (
                    <div className="flex justify-between gap-3 text-green-300">
                      <span>Coupon Discount</span>
                      <span className="text-right">-{formatPrice(discount)}</span>
                    </div>
                  )}

                  {/* 6. Shipping */}
                  <div className="flex justify-between gap-3">
                    <span className="text-[#d6dfbd]">Shipping</span>
                    <span className="text-right text-[#f4f7ec]">
                      {shipping === 0 ? "FREE" : formatPrice(shipping)}
                    </span>
                  </div>

                  {shippingDiscount > 0 && (
                    <div className="flex justify-between gap-3 text-green-300">
                      <span>Shipping Discount</span>
                      <span className="text-right">-{formatPrice(shippingDiscount)}</span>
                    </div>
                  )}

                  {/* 7. Applied Coupon Code */}
                  {(discount > 0 || shippingDiscount > 0) && couponApplied?.code && (
                    <div className="text-xs text-[#d6dfbd] break-words flex items-center gap-1">
                      <Gift className="h-3 w-3 text-[#eef4df]" />
                      <span>
                        Coupon: <span className="font-medium text-[#f4f7ec]">{couponApplied.code}</span>
                      </span>
                    </div>
                  )}

                  {/* 8. Grand Total */}
                  <div className="border-t border-white/20 pt-3 mt-3">
                    <div className="flex justify-between gap-3 text-base sm:text-lg font-bold">
                      <span className="text-[#f4f7ec]">Total Amount</span>
                      <span className="text-right text-[#eef4df]">{formatPrice(finalTotal)}</span>
                    </div>
                    <p className="text-xs text-[#d6dfbd] mt-1">GST included | Coupon applied after GST</p>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
                    onClick={handleProceedToCheckout}
                  >
                    Proceed to Checkout
                  </Button>
                  <Link to="/products">
                    <Button
                      variant="ghost"
                      className="w-full border border-white/20 text-[#f4f7ec] hover:bg-white/10"
                    >
                      Continue Shopping
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full border border-white/20 text-red-300 hover:bg-red-900/20"
                    onClick={async () => {
                      await clearCart();
                      handleRemoveCoupon();
                      toast.message("Cart cleared");
                    }}
                  >
                    Clear Cart
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;