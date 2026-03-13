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
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
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
    categories?: Array<{
      id?: string;
      name?: string;
      slug?: string;
    }>;
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

const Cart = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, totalPrice, clearCart } = useCart();

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
  const [discount, setDiscount] = useState(0);
  const [shippingDiscount, setShippingDiscount] = useState(0);

  const shippingBase = totalPrice > 10000 ? 0 : 499;
  const shipping = Math.max(0, shippingBase - shippingDiscount);

  const taxableAmount = Math.max(0, totalPrice - discount) + shipping;
  const tax = Math.round(taxableAmount * 0.18);

  const finalTotal = Math.max(0, totalPrice - discount) + shipping + tax;

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

  // ✅ build rich cart item payload for category-specific coupons
  const buildCouponItemsPayload = () => {
    return items.map((item: any) => {
      const product = item?.product || {};
      const snap = item?.productSnapshot || {};
      const qty = Number(item?.quantity || 1);

      const unitPrice = Number(
        product?.price ??
          snap?.afterDiscount ??
          snap?.finalPrice ??
          snap?.salesPrice ??
          snap?.price ??
          0
      );

      return {
        productId: item?.productId || item?.product?.id || item?.product?._id,
        quantity: qty,
        price: unitPrice,
        lineTotal: unitPrice * qty,

        categoryId:
          item?.categoryId ||
          product?.categoryId ||
          snap?.categoryId ||
          product?.subcategoryId ||
          snap?.subcategoryId ||
          (typeof product?.category === "object"
            ? product?.category?._id || product?.category?.id
            : undefined) ||
          (typeof snap?.category === "object"
            ? snap?.category?._id || snap?.category?.id
            : undefined) ||
          (typeof product?.subcategory === "object"
            ? product?.subcategory?._id || product?.subcategory?.id
            : undefined) ||
          (typeof snap?.subcategory === "object"
            ? snap?.subcategory?._id || snap?.subcategory?.id
            : undefined) ||
          (typeof product?.category === "string" ? product.category : undefined) ||
          (typeof snap?.category === "string" ? snap.category : undefined) ||
          (typeof product?.subcategory === "string" ? product.subcategory : undefined) ||
          (typeof snap?.subcategory === "string" ? snap.subcategory : undefined),

        category: product?.category ?? snap?.category ?? undefined,

        subcategoryId:
          product?.subcategoryId ||
          snap?.subcategoryId ||
          (typeof product?.subcategory === "object"
            ? product?.subcategory?._id || product?.subcategory?.id
            : undefined) ||
          (typeof snap?.subcategory === "object"
            ? snap?.subcategory?._id || snap?.subcategory?.id
            : undefined),

        subcategory: product?.subcategory ?? snap?.subcategory ?? undefined,

        product: {
          categoryId:
            product?.categoryId ||
            snap?.categoryId ||
            (typeof product?.category === "object"
              ? product?.category?._id || product?.category?.id
              : undefined) ||
            (typeof snap?.category === "object"
              ? snap?.category?._id || snap?.category?.id
              : undefined),
          category: product?.category ?? snap?.category,
          subcategoryId:
            product?.subcategoryId ||
            snap?.subcategoryId ||
            (typeof product?.subcategory === "object"
              ? product?.subcategory?._id || product?.subcategory?.id
              : undefined) ||
            (typeof snap?.subcategory === "object"
              ? snap?.subcategory?._id || snap?.subcategory?.id
              : undefined),
          subcategory: product?.subcategory ?? snap?.subcategory,
          price: unitPrice,
        },

        productSnapshot: {
          categoryId: snap?.categoryId,
          category: snap?.category,
          subcategoryId: snap?.subcategoryId,
          subcategory: snap?.subcategory,
          price: snap?.price,
          finalPrice: snap?.finalPrice,
          afterDiscount: snap?.afterDiscount,
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
          cartTotal: Number(totalPrice) || 0,
          shipping: Number(shippingBase) || 0,
          userId: userId || undefined,
          items: buildCouponItemsPayload(), // ✅ required for category coupons
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

  // ✅ re-check coupon whenever price/cart changes
  useEffect(() => {
    if (!couponApplied?.code) return;
    applyCouponInternal(couponApplied.code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPrice, shippingBase, items.length]);

  const handleProceedToCheckout = () => {
    if (items.length === 0) return;

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
          cartTotal: totalPrice,
          shippingBase,
          shipping,
          tax,
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
                  const snap = item.productSnapshot || {};
                  const productId = product.id || product._id || item.productId;
                  const image = product.image || snap.image || "";
                  const name = product.name || snap.name || "Product";
                  const category =
                    product.category ||
                    (typeof snap.category === "object"
                      ? snap.category?.name || snap.category?.slug
                      : snap.category) ||
                    "";

                  const price = Number(
                    product.price ??
                      snap.afterDiscount ??
                      snap.finalPrice ??
                      snap.salesPrice ??
                      snap.price ??
                      0
                  );

                  return (
                    <div
                      key={productId}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 md:px-6 py-4 border-b border-white/10 last:border-b-0"
                    >
                      <div className="md:col-span-6 flex gap-4">
                        <Link to={`/product/${productId}`} className="flex-shrink-0">
                          <img
                            src={image}
                            alt={name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/product/${productId}`}
                            className="font-medium text-[#f4f7ec] hover:text-[#eef4df] transition-colors line-clamp-1"
                          >
                            {name}
                          </Link>
                          <p className="text-sm text-[#d6dfbd]">
                            {typeof category === "string" ? category : ""}
                          </p>
                          <button
                            onClick={() => removeFromCart(productId)}
                            className="mt-2 text-sm text-red-300 hover:underline flex items-center gap-1 md:hidden"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between md:justify-center">
                        <span className="md:hidden text-[#d6dfbd] text-sm">Price:</span>
                        <span className="text-[#f4f7ec]">{formatPrice(price)}</span>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between md:justify-center gap-2">
                        <span className="md:hidden text-[#d6dfbd] text-sm">Quantity:</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(productId, item.quantity - 1)}
                            className="w-8 h-8 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-[#eef4df]"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-10 text-center text-sm text-[#f4f7ec]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(productId, item.quantity + 1)}
                            className="w-8 h-8 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-[#eef4df]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3">
                        <span className="md:hidden text-[#d6dfbd] text-sm">Total:</span>
                        <span className="font-semibold text-[#eef4df]">
                          {formatPrice(price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(productId)}
                          className="hidden md:block text-[#d6dfbd] hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

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

                {couponApplied ? (
                  <div className="mt-2 text-xs text-[#d6dfbd]">
                    Applied:{" "}
                    <span className="font-semibold text-[#f4f7ec]">{couponApplied.code}</span>
                    {discount > 0 ? (
                      <span className="ml-2 text-green-300">(-{formatPrice(discount)})</span>
                    ) : null}
                    {shippingDiscount > 0 ? (
                      <span className="ml-2 text-green-300">
                        (-{formatPrice(shippingDiscount)} shipping)
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-[#f4f7ec] mb-4">Order Summary</h2>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#d6dfbd]">Subtotal</span>
                    <span className="text-[#f4f7ec]">{formatPrice(totalPrice)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-300">
                      <span>Discount</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}

                  {shippingDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-300">
                      <span>Shipping Discount</span>
                      <span>-{formatPrice(shippingDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-[#d6dfbd]">Shipping</span>
                    <span className="text-[#f4f7ec]">
                      {shipping === 0 ? "Free" : formatPrice(shipping)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-[#d6dfbd]">Tax (18% GST)</span>
                    <span className="text-[#f4f7ec]">{formatPrice(tax)}</span>
                  </div>
                </div>

                <div className="border-t border-white/20 pt-4 mb-6">
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#f4f7ec]">Total</span>
                    <span className="text-xl font-bold text-[#eef4df]">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full mb-3 bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
                  size="lg"
                  onClick={handleProceedToCheckout}
                >
                  Proceed to Checkout
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                >
                  <Link to="/products">Continue Shopping</Link>
                </Button>

                <Button
                  variant="outline"
                  className="w-full mt-3 border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                  onClick={() => {
                    clearCart();
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
    </Layout>
  );
};

export default Cart;