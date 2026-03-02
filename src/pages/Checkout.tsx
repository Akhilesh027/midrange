// src/pages/Checkout.tsx
// ✅ Updated: Midrange Checkout with Razorpay integration (Online Payment) + COD
// ✅ Keeps: 2 steps (Address -> Payment), Coupon passthrough + redeem after success
// ✅ Payment methods shown: COD + ONLINE (Razorpay)
// ✅ Flow:
//    - COD: POST /orders directly
//    - ONLINE: POST /payments/create-order -> open Razorpay -> POST /payments/verify -> POST /orders (paid)

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/CartContext";
import { ChevronRight, CheckCircle2, MapPin, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

const WEBSITE: "affordable" | "midrange" | "luxury" = "midrange";
const API_BASE = `https://api.jsgallor.com/api`;

type Address = {
  _id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
};

type CouponPayload = {
  couponId?: string;
  code: string;
  type?: "percentage" | "flat" | "free_shipping";
  value?: number;
};

type CheckoutState = {
  coupon?: CouponPayload | null;
  discount?: number;
  shippingDiscount?: number;
  cartTotal?: number;
  shippingBase?: number;
  shipping?: number;
  tax?: number;
  finalTotal?: number;
};

function getToken() {
  return localStorage.getItem("midrange_token");
}

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

function getSavedUser() {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: any = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// ✅ Only 2 steps
const steps = [
  { id: 1, title: "Address", icon: MapPin },
  { id: 2, title: "Payment", icon: CreditCard },
];

// Razorpay loader + typings
declare global {
  interface Window {
    Razorpay?: any;
  }
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);

    const id = "razorpay-checkout-js";
    if (document.getElementById(id)) return resolve(true);

    const script = document.createElement("script");
    script.id = id;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as CheckoutState;

  const { items, totalPrice, refreshCartFromBackend, clearCart } = useCart();

  // ✅ start at Address
  const [step, setStep] = useState(1);

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: true,
  });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [placing, setPlacing] = useState(false);

  // ✅ Coupon data (from navigation state OR localStorage fallback)
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPayload | null>(null);
  const [discount, setDiscount] = useState(0);
  const [shippingDiscount, setShippingDiscount] = useState(0);

  // ✅ Read coupon from navigation state (preferred), else fallback to localStorage
  useEffect(() => {
    const fromNavCoupon = navState?.coupon || null;
    const fromNavDiscount = Number(navState?.discount || 0);
    const fromNavShippingDiscount = Number(navState?.shippingDiscount || 0);

    if (fromNavCoupon?.code) {
      setAppliedCoupon(fromNavCoupon);
      setDiscount(fromNavDiscount);
      setShippingDiscount(fromNavShippingDiscount);
      return;
    }

    // fallback (if user refreshes Checkout page)
    try {
      const saved = localStorage.getItem(`${WEBSITE}_coupon`);
      if (!saved) return;
      const parsed = JSON.parse(saved);

      const savedCoupon = parsed?.coupon;
      if (savedCoupon?.code) {
        setAppliedCoupon({
          couponId: savedCoupon?.couponId || savedCoupon?.id,
          code: savedCoupon.code,
          type: savedCoupon.type,
          value: savedCoupon.value,
        });
        setDiscount(Number(parsed?.discount || 0));
        setShippingDiscount(Number(parsed?.shippingDiscount || 0));
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);

  // ✅ Pricing with coupon
  const shippingBase = totalPrice > 10000 ? 0 : 499;
  const shipping = Math.max(0, shippingBase - shippingDiscount);

  // ✅ tax on (subtotal - discount + shipping)
  const taxableAmount = Math.max(0, totalPrice - discount) + shipping;
  const tax = Math.round(taxableAmount * 0.18);

  // ✅ final total
  const finalTotal = Math.max(0, totalPrice - discount) + shipping + tax;

  // Guard + hydrate cart
  useEffect(() => {
    if (!getToken()) {
      toast.error("Please login to checkout");
      navigate("/login");
      return;
    }
    refreshCartFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If cart is empty, go back to cart page
  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart");
    }
  }, [items.length, navigate]);

  // Fetch addresses when on Address step
  useEffect(() => {
    if (step !== 1) return;

    (async () => {
      const res = await apiFetch("/midrange/addresses", { method: "GET" });
      if (!res.ok) {
        toast.error("Failed to load addresses");
        return;
      }
      const json = await res.json();
      const data: Address[] = json?.data || json || [];
      setAddresses(data);

      const def = data.find((a) => a.isDefault);
      if (def) setSelectedAddressId(def._id);
      else if (data[0]) setSelectedAddressId(data[0]._id);
    })();
  }, [step]);

  const canGoNext = useMemo(() => {
    if (step === 1) return !!selectedAddressId;
    return true;
  }, [step, selectedAddressId]);

  const validateAddressForm = () => {
    if (!addressForm.fullName.trim()) return "Full name is required";
    if (!/^\d{10}$/.test(addressForm.phone.trim())) return "Phone must be 10 digits";
    if (!addressForm.line1.trim()) return "Address line 1 is required";
    if (!addressForm.city.trim()) return "City is required";
    if (!addressForm.state.trim()) return "State is required";
    if (!/^\d{6}$/.test(addressForm.pincode.trim())) return "Pincode must be 6 digits";
    return null;
  };

  const handleAddAddress = async () => {
    const err = validateAddressForm();
    if (err) return toast.error(err);

    try {
      const res = await apiFetch("/midrange/addresses", {
        method: "POST",
        body: JSON.stringify(addressForm),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json?.message || "Failed to save address");
        return;
      }

      toast.success("Address saved");
      setShowAddressForm(false);

      setAddressForm({
        fullName: "",
        phone: "",
        line1: "",
        line2: "",
        landmark: "",
        city: "",
        state: "",
        pincode: "",
        isDefault: true,
      });

      // refresh list
      const res2 = await apiFetch("/addresses", { method: "GET" });
      const json2 = await res2.json();
      const data: Address[] = json2?.data || json2 || [];
      setAddresses(data);

      const def = data.find((a) => a.isDefault);
      if (def) setSelectedAddressId(def._id);
      else if (data[0]) setSelectedAddressId(data[0]._id);
    } catch {
      toast.error("Failed to save address");
    }
  };

  // ✅ Redeem coupon after order success
  const redeemCouponIfNeeded = async (orderId: string) => {
    if (!appliedCoupon?.code) return;

    try {
      const userId = getSavedUserId();
      await apiFetch("/midrange/coupons/redeem", {
        method: "POST",
        body: JSON.stringify({
          code: appliedCoupon.code,
          couponId: appliedCoupon.couponId,
          userId: userId || undefined,
          orderId,
          website: WEBSITE,
        }),
      });
    } catch {
      // don't block order success screen
    }
  };

  // -----------------------------
  // Razorpay flow
  // -----------------------------
  const startRazorpayPayment = async (): Promise<{
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }> => {
    const ok = await loadRazorpay();
    if (!ok) throw new Error("Razorpay SDK failed to load");

    // IMPORTANT: these endpoints must exist on your backend:
    // POST /api/midrange/payments/create-order  { amount, currency, receipt, notes }
    // POST /api/midrange/payments/verify        { razorpay_order_id, razorpay_payment_id, razorpay_signature }
    const createRes = await apiFetch("/payments/create-order", {
      method: "POST",
      body: JSON.stringify({
        amount: Number(finalTotal) || 0, // rupees
        currency: "INR",
        receipt: `mid_${Date.now()}`,
        notes: { website: WEBSITE },
      }),
    });

    const createJson = await createRes.json();
    if (!createRes.ok || !createJson?.success) {
      throw new Error(createJson?.message || "Failed to create payment order");
    }

    const rpOrder = createJson.order; // { id, amount, currency, ... }
    const keyId = createJson.keyId;

    const user = getSavedUser();
    const selectedAddr = addresses.find((a) => a._id === selectedAddressId);

    return new Promise((resolve, reject) => {
      const options: any = {
        key: keyId,
        order_id: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        name: "JSGALORE",
        description: "Order Payment",
        prefill: {
          name: user?.name || user?.fullName || selectedAddr?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || selectedAddr?.phone || "",
        },
        theme: { color: "#111827" },
        handler: async (resp: any) => {
          try {
            // verify signature server-side
            const verifyRes = await apiFetch("/payments/verify", {
              method: "POST",
              body: JSON.stringify(resp),
            });

            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok || !verifyJson?.success) {
              throw new Error(verifyJson?.message || "Payment verification failed");
            }

            resolve(resp);
          } catch (e: any) {
            reject(new Error(e?.message || "Payment verification failed"));
          }
        },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  };

  // -----------------------------
  // Place Order
  // -----------------------------
  const handlePlaceOrder = async () => {
    try {
      if (!selectedAddressId) {
        toast.error("Select address");
        setStep(1);
        return;
      }

      if (!items?.length) {
        toast.error("Your cart is empty");
        navigate("/cart");
        return;
      }

      // optional minimum payable guard
      // if (finalTotal < 10) return toast.error("Minimum payable amount is ₹10");

      setPlacing(true);

      // ✅ If ONLINE -> collect Razorpay payment first
      let razorpay: any = undefined;

      if (paymentMethod === "ONLINE") {
        razorpay = await startRazorpayPayment();
      }

      // ✅ Now place order (backend should recompute totals)
      const res = await apiFetch("/midrange/orders", {
        method: "POST",
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod: paymentMethod === "ONLINE" ? "RAZORPAY" : "COD",

          // ✅ Attach coupon info (backend verifies again)
          coupon: appliedCoupon?.code
            ? { code: appliedCoupon.code, couponId: appliedCoupon.couponId }
            : undefined,

          // ✅ Attach payment proof for backend storage (optional but recommended)
          payment:
            paymentMethod === "ONLINE"
              ? {
                  gateway: "razorpay",
                  status: "paid",
                  razorpayOrderId: razorpay.razorpay_order_id,
                  razorpayPaymentId: razorpay.razorpay_payment_id,
                  razorpaySignature: razorpay.razorpay_signature,
                }
              : { status: "pending" },

          // ✅ Optional: send computed totals for logging (backend should recompute anyway)
          pricing: {
            subtotal: Number(totalPrice) || 0,
            discount: Number(discount) || 0,
            shippingCost: Number(shipping) || 0,
            tax: Number(tax) || 0,
            total: Number(finalTotal) || 0,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json?.message || json?.error || "Order failed");
        return;
      }

      const orderId = json?.data?._id || json?.order?._id;
      toast.success(paymentMethod === "ONLINE" ? "Payment success! Order placed!" : "Order placed!");

      // ✅ redeem coupon AFTER order success
      if (orderId) await redeemCouponIfNeeded(orderId);

      // ✅ clear coupon storage after success
      localStorage.removeItem(`${WEBSITE}_coupon`);

      // ✅ clear cart
      await clearCart();

      navigate(`/order-success/${orderId}`);
    } catch (e: any) {
      toast.error(e?.message || "Order failed");
    } finally {
      setPlacing(false);
    }
  };

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
            <span className="text-muted-foreground">Checkout</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Stepper */}
        <div className="bg-card rounded-xl border border-border/50 p-4 md:p-6 mb-8">
          <div className="flex items-center justify-between gap-3">
            {steps.map((s, idx) => {
              const active = step === s.id;
              const done = step > s.id;
              const Icon = s.icon;

              return (
                <div key={s.id} className="flex-1 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                      done
                        ? "bg-primary text-primary-foreground border-primary"
                        : active
                        ? "border-primary text-primary"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        active || done ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Step {s.id}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.title}</p>
                  </div>

                  {idx !== steps.length - 1 && (
                    <div className="hidden md:block flex-1 h-px bg-border/60 mx-3" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-4">
            {/* STEP 1: ADDRESS */}
            {step === 1 && (
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Choose Delivery Address</h2>
                    <p className="text-sm text-muted-foreground">Select or add a new address</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowAddressForm(true)}>
                    + Add Address
                  </Button>
                </div>

                {addresses.length === 0 ? (
                  <div className="p-4 rounded-lg bg-secondary text-sm text-muted-foreground">
                    No addresses found. Click <b>Add Address</b> to continue.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((a) => (
                      <label
                        key={a._id}
                        className={`block p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedAddressId === a._id
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={selectedAddressId === a._id}
                            onChange={() => setSelectedAddressId(a._id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-foreground">
                                {a.fullName}{" "}
                                {a.isDefault ? (
                                  <span className="ml-2 text-xs text-primary">(Default)</span>
                                ) : null}
                              </p>
                              <p className="text-xs text-muted-foreground">{a.phone}</p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {a.line1}
                              {a.line2 ? `, ${a.line2}` : ""}
                              {a.landmark ? `, ${a.landmark}` : ""}, {a.city}, {a.state} -{" "}
                              {a.pincode}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Add Address Modal */}
                {showAddressForm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                      className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                      onClick={() => setShowAddressForm(false)}
                    />
                    <div className="relative w-full max-w-xl">
                      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">Add Address</h3>
                            <p className="text-sm text-muted-foreground">
                              Delivery details for your order
                            </p>
                          </div>
                          <button
                            onClick={() => setShowAddressForm(false)}
                            className="w-9 h-9 rounded-full bg-secondary hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="p-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                              placeholder="Full Name *"
                              value={addressForm.fullName}
                              onChange={(e) =>
                                setAddressForm((s) => ({ ...s, fullName: e.target.value }))
                              }
                            />
                            <Input
                              placeholder="Phone (10 digits) *"
                              value={addressForm.phone}
                              onChange={(e) =>
                                setAddressForm((s) => ({
                                  ...s,
                                  phone: e.target.value.replace(/[^\d]/g, "").slice(0, 10),
                                }))
                              }
                              maxLength={10}
                            />

                            <div className="md:col-span-2">
                              <Input
                                placeholder="Address Line 1 *"
                                value={addressForm.line1}
                                onChange={(e) =>
                                  setAddressForm((s) => ({ ...s, line1: e.target.value }))
                                }
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Input
                                placeholder="Address Line 2 (optional)"
                                value={addressForm.line2}
                                onChange={(e) =>
                                  setAddressForm((s) => ({ ...s, line2: e.target.value }))
                                }
                              />
                            </div>

                            <div className="md:col-span-2">
                              <Input
                                placeholder="Landmark (optional)"
                                value={addressForm.landmark}
                                onChange={(e) =>
                                  setAddressForm((s) => ({ ...s, landmark: e.target.value }))
                                }
                              />
                            </div>

                            <Input
                              placeholder="City *"
                              value={addressForm.city}
                              onChange={(e) =>
                                setAddressForm((s) => ({ ...s, city: e.target.value }))
                              }
                            />
                            <Input
                              placeholder="State *"
                              value={addressForm.state}
                              onChange={(e) =>
                                setAddressForm((s) => ({ ...s, state: e.target.value }))
                              }
                            />
                            <Input
                              placeholder="Pincode (6 digits) *"
                              value={addressForm.pincode}
                              onChange={(e) =>
                                setAddressForm((s) => ({
                                  ...s,
                                  pincode: e.target.value.replace(/[^\d]/g, "").slice(0, 6),
                                }))
                              }
                              maxLength={6}
                            />
                          </div>

                          <div className="flex items-center gap-2 mt-4">
                            <input
                              id="isDefault"
                              type="checkbox"
                              checked={!!addressForm.isDefault}
                              onChange={(e) =>
                                setAddressForm((s) => ({ ...s, isDefault: e.target.checked }))
                              }
                            />
                            <label htmlFor="isDefault" className="text-sm text-muted-foreground">
                              Set as default address
                            </label>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-5">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => setShowAddressForm(false)}
                            >
                              Cancel
                            </Button>
                            <Button variant="gold" className="w-full" onClick={handleAddAddress}>
                              Save Address
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: PAYMENT */}
            {step === 2 && (
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">Payment</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Choose payment method & place order
                </p>

                <div className="space-y-3 mb-6">
                  {(["COD", "ONLINE"] as const).map((m) => (
                    <label
                      key={m}
                      className={`block p-4 rounded-lg border cursor-pointer ${
                        paymentMethod === m
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          checked={paymentMethod === m}
                          onChange={() => setPaymentMethod(m)}
                        />
                        <div>
                          <p className="font-semibold text-foreground">
                            {m === "COD" ? "Cash on Delivery" : "Online Payment (Razorpay)"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {m === "COD"
                              ? "Pay when you receive the product"
                              : "UPI / Card / NetBanking / Wallets"}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <Button
                  variant="gold"
                  size="lg"
                  className="w-full"
                  disabled={placing}
                  onClick={handlePlaceOrder}
                >
                  {placing ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </span>
                  ) : paymentMethod === "ONLINE" ? (
                    "Pay & Place Order"
                  ) : (
                    "Place Order"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground mt-3">
                  For online payments, your payment is verified on the server before order is created.
                </p>
              </div>
            )}

            {/* Bottom actions */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 1) navigate("/cart");
                  else setStep((s) => Math.max(1, s - 1));
                }}
              >
                Back
              </Button>

              <Button
                variant="gold"
                onClick={() => setStep((s) => Math.min(2, s + 1))}
                disabled={!canGoNext || step === 2}
              >
                Next
              </Button>
            </div>
          </div>

          {/* RIGHT: Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border/50 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-foreground mb-4">Order Summary</h2>

              {/* Items */}
              <div className="space-y-4 mb-5">
                {items.map((item: any) => {
                  const qty = item.quantity || 1;
                  const price =
                    typeof item.product?.price === "number"
                      ? item.product.price
                      : item?.productSnapshot?.price || 0;

                  const name = item.product?.name || item?.productSnapshot?.name || "Product";
                  const image = item.product?.image || item?.productSnapshot?.image || "";

                  return (
                    <div key={item._id || item.productId || name} className="flex gap-3 items-start">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-border/50 bg-muted flex items-center justify-center">
                        {image ? (
                          <img src={image} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">No Image</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{name}</p>

                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">Qty: {qty}</span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatPrice(price * qty)}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1">{formatPrice(price)} each</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Breakdown */}
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

                {appliedCoupon?.code && (
                  <div className="text-xs text-muted-foreground">
                    Coupon: <span className="text-foreground font-semibold">{appliedCoupon.code}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-primary/30 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}