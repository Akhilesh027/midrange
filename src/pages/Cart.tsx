import { useEffect, useState } from "react";
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
  valid: boolean;
  message?: string;
  coupon?: {
    couponId: string;
    code: string;
    type: "percentage" | "flat" | "free_shipping";
    value: number;
    maxDiscount?: number;
    minOrder?: number;
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
    return u?.id ? String(u.id) : null;
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

  // ✅ Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponApplied, setCouponApplied] =
    useState<ApplyCouponResponse["coupon"] | null>(null);
  const [discount, setDiscount] = useState(0);
  const [shippingDiscount, setShippingDiscount] = useState(0);

  // ✅ Base charges
  const shippingBase = totalPrice > 10000 ? 0 : 499;
  const shipping = Math.max(0, shippingBase - shippingDiscount);

  // ✅ Tax on discounted subtotal + shipping
  const taxableAmount = Math.max(0, totalPrice - discount) + shipping;
  const tax = Math.round(taxableAmount * 0.18);

  const finalTotal = Math.max(0, totalPrice - discount) + shipping + tax;

  // ✅ Restore coupon from storage
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

  const userId = getSavedUserId();

  // ✅ Apply coupon via backend
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
          cartTotal: Number(totalPrice) || 0, // ✅ subtotal only
          shipping: Number(shippingBase) || 0, // ✅ base shipping
          userId: userId || undefined,
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

      // NOTE: your backend returns { success:true, coupon:{...}, discount, shippingDiscount }
      // Some of your types use "valid". We'll support both.
      const backendCoupon = data?.coupon || json?.coupon;
      const backendDiscount = Number(data?.discount ?? json?.discount ?? 0);
      const backendShippingDiscount = Number(data?.shippingDiscount ?? json?.shippingDiscount ?? 0);

      // If backend doesn't return "valid", assume success when res.ok
      if (!backendCoupon) {
        setCouponApplied(null);
        setDiscount(0);
        setShippingDiscount(0);
        clearCouponPersisted();
        if (!silent) toast.error(data?.message || json?.message || "Invalid coupon");
        return;
      }

      setCouponApplied(backendCoupon);
      setDiscount(backendDiscount);
      setShippingDiscount(backendShippingDiscount);

      persistCoupon({
        code: backendCoupon?.code || code,
        coupon: backendCoupon,
        discount: backendDiscount,
        shippingDiscount: backendShippingDiscount,
      });

      if (!silent) toast.success(`Coupon applied: ${backendCoupon?.code || code}`);
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

  // ✅ Re-check coupon if cart total changes
  useEffect(() => {
    if (!couponApplied?.code) return;
    applyCouponInternal(couponApplied.code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPrice, shippingBase]);

  // ✅ PROCEED TO CHECKOUT: send coupon + amounts
  const handleProceedToCheckout = () => {
    if (items.length === 0) return;

    if (couponApplied) {
      navigate("/checkout", {
        state: {
          coupon: {
            couponId: couponApplied.couponId,
            code: couponApplied.code,
            type: couponApplied.type,
            value: couponApplied.value,
          },
          discount,
          shippingDiscount,
          // optional: for display only
          cartTotal: totalPrice,
          shippingBase,
          shipping,
          tax,
          finalTotal,
        },
      });
      return;
    }

    // no coupon
    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <ShoppingBag className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-4">Your Cart is Empty</h1>
            <p className="text-muted-foreground mb-8">
              Looks like you haven&apos;t added any items to your cart yet.
            </p>
            <Button asChild variant="gold" size="lg">
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Breadcrumb */}
      <nav className="bg-surface-1 py-3 border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-primary hover:underline">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Cart</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">Your Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-surface-1 border-b border-border/50 text-sm font-medium text-muted-foreground">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 md:px-6 py-4 border-b border-border/30 last:border-b-0"
                >
                  <div className="md:col-span-6 flex gap-4">
                    <Link to={`/product/${item.product.id}`} className="flex-shrink-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${item.product.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.product.category}</p>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="mt-2 text-sm text-destructive hover:underline flex items-center gap-1 md:hidden"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between md:justify-center">
                    <span className="md:hidden text-muted-foreground text-sm">Price:</span>
                    <span className="text-foreground">{formatPrice(item.product.price)}</span>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between md:justify-center gap-2">
                    <span className="md:hidden text-muted-foreground text-sm">Quantity:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 rounded bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 rounded bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3">
                    <span className="md:hidden text-muted-foreground text-sm">Total:</span>
                    <span className="font-semibold text-primary">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="hidden md:block text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter coupon code"
                    className="bg-secondary pl-9"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={couponLoading}
                  />
                </div>

                {!couponApplied ? (
                  <Button variant="outline" onClick={handleApplyCoupon} disabled={couponLoading}>
                    {couponLoading ? "Applying..." : "Apply"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleRemoveCoupon} className="gap-2">
                    <X className="w-4 h-4" />
                    Remove
                  </Button>
                )}
              </div>

              {couponApplied ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  Applied: <span className="font-semibold text-foreground">{couponApplied.code}</span>
                  {discount > 0 ? <span className="ml-2 text-green-600">(-{formatPrice(discount)})</span> : null}
                  {shippingDiscount > 0 ? (
                    <span className="ml-2 text-green-600">(-{formatPrice(shippingDiscount)} shipping)</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border/50 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-foreground mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatPrice(totalPrice)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground">{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (18% GST)</span>
                  <span className="text-foreground">{formatPrice(tax)}</span>
                </div>
              </div>

              <div className="border-t border-primary/30 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              {/* ✅ navigate with coupon payload */}
              <Button
                variant="gold"
                size="lg"
                className="w-full mb-3"
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/products">Continue Shopping</Link>
              </Button>

              <Button
                variant="outline"
                className="w-full mt-3"
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
    </Layout>
  );
};

export default Cart;
