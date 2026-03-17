// src/pages/Checkout.tsx
// ✅ Updated: Midrange Checkout with dynamic shipping by city + optional pincode
// ✅ Styled consistently with Index & Cart (earthy green theme)
// ✅ Now displays variant attributes (size, color, fabric) in order summary

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/context/CartContext";
import {
  ChevronRight,
  CheckCircle2,
  MapPin,
  CreditCard,
  Loader2,
  Truck,
} from "lucide-react";
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

type ShippingLookupResponse = {
  success: boolean;
  message?: string;
  data?: {
    _id: string;
    website: string;
    city: string;
    pincode?: string;
    amount: number;
    isActive: boolean;
  } | null;
  appliedRule?: string | null;
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

const steps = [
  { id: 1, title: "Address", icon: MapPin },
  { id: 2, title: "Payment", icon: CreditCard },
];

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

// Helper to get color name from hex
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

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as CheckoutState;

  const { items, totalPrice, refreshCartFromBackend, clearCart } = useCart();

  const [step, setStep] = useState(1);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

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

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [placing, setPlacing] = useState(false);

  const [appliedCoupon, setAppliedCoupon] = useState<CouponPayload | null>(null);
  const [discount, setDiscount] = useState(0);
  const [shippingDiscount, setShippingDiscount] = useState(0);

  // dynamic shipping state
  const [shippingBase, setShippingBase] = useState(0);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingMeta, setShippingMeta] = useState<{
    found: boolean;
    city: string;
    pincode: string;
    appliedRule: string;
  }>({
    found: false,
    city: "",
    pincode: "",
    appliedRule: "",
  });

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
  }, [navState]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);

  const selectedAddress = useMemo(() => {
    return addresses.find((a) => a._id === selectedAddressId) || null;
  }, [addresses, selectedAddressId]);

  const shipping = useMemo(() => {
    return Math.max(0, Number(shippingBase || 0) - Number(shippingDiscount || 0));
  }, [shippingBase, shippingDiscount]);

  const taxableAmount = useMemo(() => {
    return Math.max(0, totalPrice - discount) + shipping;
  }, [totalPrice, discount, shipping]);

  const tax = useMemo(() => {
    return Math.round(taxableAmount * 0.18);
  }, [taxableAmount]);

  const finalTotal = useMemo(() => {
    return Math.max(0, totalPrice - discount) + shipping + tax;
  }, [totalPrice, discount, shipping, tax]);

  useEffect(() => {
    if (!getToken()) {
      toast.error("Please login to checkout");
      navigate("/login");
      return;
    }
    refreshCartFromBackend();
  }, [navigate, refreshCartFromBackend]);

  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart");
    }
  }, [items.length, navigate]);

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await apiFetch("/midrange/addresses", { method: "GET" });
      if (!res.ok) {
        toast.error("Failed to load addresses");
        return;
      }

      const json = await res.json();
      const data: Address[] = json?.data || json || [];
      setAddresses(data);

      if (!selectedAddressId && data.length > 0) {
        const def = data.find((a) => a.isDefault) || data[0];
        setSelectedAddressId(def._id);
      }
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (step !== 1) return;
    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const fetchShippingCost = async (params: { city?: string; pincode?: string }) => {
    const city = String(params.city || "").trim();
    const pincode = String(params.pincode || "").trim();

    if (!city) {
      setShippingBase(0);
      setShippingMeta({
        found: false,
        city: "",
        pincode: "",
        appliedRule: "",
      });
      return;
    }

    try {
      setShippingLoading(true);

      const qs = new URLSearchParams({
        website: WEBSITE,
        city,
      });

      if (pincode) qs.set("pincode", pincode);

      const res = await apiFetch(`/shipping-costs/by-location?${qs.toString()}`, {
        method: "GET",
      });

      const data: ShippingLookupResponse = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch shipping cost");
      }

      if (data?.data) {
        setShippingBase(Number(data.data.amount || 0));
        setShippingMeta({
          found: true,
          city: data.data.city || city,
          pincode: data.data.pincode || pincode,
          appliedRule: data.appliedRule || "",
        });
      } else {
        setShippingBase(0);
        setShippingMeta({
          found: false,
          city,
          pincode,
          appliedRule: "",
        });
      }
    } catch {
      setShippingBase(0);
      setShippingMeta({
        found: false,
        city,
        pincode,
        appliedRule: "",
      });
    } finally {
      setShippingLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedAddress?.city) {
      setShippingBase(0);
      setShippingMeta({
        found: false,
        city: "",
        pincode: "",
        appliedRule: "",
      });
      return;
    }

    fetchShippingCost({
      city: selectedAddress.city,
      pincode: selectedAddress.pincode,
    });
  }, [selectedAddress?.city, selectedAddress?.pincode]);

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
    if (err) {
      toast.error(err);
      return;
    }

    try {
      setSavingAddress(true);

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

      await fetchAddresses();
    } catch {
      toast.error("Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

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
      // don't block order success
    }
  };

  const startRazorpayPayment = async (): Promise<{
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }> => {
    const ok = await loadRazorpay();
    if (!ok) throw new Error("Razorpay SDK failed to load");

    const createRes = await apiFetch("/payments/create-order", {
      method: "POST",
      body: JSON.stringify({
        amount: Number(finalTotal) || 0,
        currency: "INR",
        receipt: `mid_${Date.now()}`,
        notes: {
          website: WEBSITE,
          shippingCity: selectedAddress?.city || "",
          shippingPincode: selectedAddress?.pincode || "",
        },
      }),
    });

    const createJson = await createRes.json();
    if (!createRes.ok || !createJson?.success) {
      throw new Error(createJson?.message || "Failed to create payment order");
    }

    const rpOrder = createJson.order;
    const keyId = createJson.keyId;

    const user = getSavedUser();

    return new Promise((resolve, reject) => {
      const options: any = {
        key: keyId,
        order_id: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        name: "JSGALORE",
        description: "Order Payment",
        prefill: {
          name: user?.name || user?.fullName || selectedAddress?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || selectedAddress?.phone || "",
        },
        theme: { color: "#556b2f" },
        handler: async (resp: any) => {
          try {
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

      if (shippingLoading) {
        toast.error("Please wait, shipping is being calculated");
        return;
      }

      setPlacing(true);

      let razorpay: any = undefined;

      if (paymentMethod === "ONLINE") {
        razorpay = await startRazorpayPayment();
      }

      const res = await apiFetch("/midrange/orders", {
        method: "POST",
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod: paymentMethod === "ONLINE" ? "RAZORPAY" : "COD",

          coupon: appliedCoupon?.code
            ? { code: appliedCoupon.code, couponId: appliedCoupon.couponId }
            : undefined,

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

          pricing: {
            subtotal: Number(totalPrice) || 0,
            discount: Number(discount) || 0,
            shippingCost: Number(shippingBase) || 0,
            shippingDiscount: Number(shippingDiscount) || 0,
            shippingFinal: Number(shipping) || 0,
            tax: Number(tax) || 0,
            total: Number(finalTotal) || 0,
          },

          shipping: {
            website: WEBSITE,
            city: selectedAddress?.city || shippingMeta.city || "",
            pincode: selectedAddress?.pincode || shippingMeta.pincode || "",
            amount: Number(shippingBase) || 0,
            shippingDiscount: Number(shippingDiscount) || 0,
            finalShipping: Number(shipping) || 0,
            appliedRule: shippingMeta.appliedRule || "",
            matchedRuleFound: shippingMeta.found,
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

      if (orderId) await redeemCouponIfNeeded(orderId);

      localStorage.removeItem(`${WEBSITE}_coupon`);
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
      <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
        <nav className="bg-[#4b5e29] py-3 border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-[#eef4df] hover:underline">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-[#d6dfbd]" />
              <span className="text-[#d6dfbd]">Checkout</span>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-4 md:p-6 mb-8">
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
                          ? "bg-[#eef4df] text-[#3f4f22] border-[#eef4df]"
                          : active
                            ? "border-[#eef4df] text-[#eef4df]"
                            : "border-white/20 text-[#d6dfbd]"
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          active || done ? "text-[#f4f7ec]" : "text-[#d6dfbd]"
                        }`}
                      >
                        Step {s.id}
                      </p>
                      <p className="text-xs text-[#d6dfbd]">{s.title}</p>
                    </div>

                    {idx !== steps.length - 1 && (
                      <div className="hidden md:block flex-1 h-px bg-white/20 mx-3" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {step === 1 && (
                <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-semibold text-[#f4f7ec]">Choose Delivery Address</h2>
                      <p className="text-sm text-[#d6dfbd]">Select or add a new address</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddressForm(true)}
                      className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                    >
                      + Add Address
                    </Button>
                  </div>

                  {loadingAddresses ? (
                    <div className="p-4 rounded-lg bg-white/10 text-sm text-[#d6dfbd] inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading addresses...
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="p-4 rounded-lg bg-white/10 text-sm text-[#d6dfbd]">
                      No addresses found. Click <b className="text-[#f4f7ec]">Add Address</b> to continue.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((a) => (
                        <label
                          key={a._id}
                          className={`block p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedAddressId === a._id
                              ? "border-[#eef4df] bg-[#eef4df]/10"
                              : "border-white/10 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              checked={selectedAddressId === a._id}
                              onChange={() => setSelectedAddressId(a._id)}
                              className="mt-1 accent-[#eef4df]"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-[#f4f7ec]">
                                  {a.fullName}{" "}
                                  {a.isDefault ? (
                                    <span className="ml-2 text-xs text-[#eef4df]">(Default)</span>
                                  ) : null}
                                </p>
                                <p className="text-xs text-[#d6dfbd]">{a.phone}</p>
                              </div>
                              <p className="text-sm text-[#d6dfbd] mt-1">
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

                  {selectedAddress && (
                    <div className="mt-5 rounded-xl border border-white/10 p-4 bg-white/5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <Truck className="w-4 h-4 mt-0.5 text-[#d6dfbd]" />
                          <div>
                            <p className="font-medium text-[#f4f7ec]">Shipping for selected address</p>
                            <p className="text-sm text-[#d6dfbd] mt-1">
                              {selectedAddress.city}
                              {selectedAddress.pincode ? ` - ${selectedAddress.pincode}` : ""}
                            </p>

                            {!shippingLoading && shippingMeta.found && shippingMeta.appliedRule && (
                              <p className="text-xs text-[#d6dfbd] mt-1">
                                Applied rule: {shippingMeta.appliedRule.replace(/_/g, " ")}
                              </p>
                            )}

                            {!shippingLoading && !shippingMeta.found && (
                              <p className="text-xs text-[#d6dfbd] mt-1">
                                No shipping rule found. FREE shipping applied.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-[#d6dfbd]">Shipping</p>
                          <p className="font-semibold text-[#f4f7ec]">
                            {shippingLoading ? "Loading..." : shipping === 0 ? "Free" : formatPrice(shipping)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {showAddressForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowAddressForm(false)}
                      />
                      <div className="relative w-full max-w-xl">
                        <div className="bg-[#4b5e29] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-[#f4f7ec]">Add Address</h3>
                              <p className="text-sm text-[#d6dfbd]">
                                Delivery details for your order
                              </p>
                            </div>
                            <button
                              onClick={() => setShowAddressForm(false)}
                              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-[#d6dfbd] hover:text-[#f4f7ec]"
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
                                className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
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
                                className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
                              />

                              <div className="md:col-span-2">
                                <Input
                                  placeholder="Address Line 1 *"
                                  value={addressForm.line1}
                                  onChange={(e) =>
                                    setAddressForm((s) => ({ ...s, line1: e.target.value }))
                                  }
                                  className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <Input
                                  placeholder="Address Line 2 (optional)"
                                  value={addressForm.line2}
                                  onChange={(e) =>
                                    setAddressForm((s) => ({ ...s, line2: e.target.value }))
                                  }
                                  className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <Input
                                  placeholder="Landmark (optional)"
                                  value={addressForm.landmark}
                                  onChange={(e) =>
                                    setAddressForm((s) => ({ ...s, landmark: e.target.value }))
                                  }
                                  className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
                                />
                              </div>

                              <Input
                                placeholder="City *"
                                value={addressForm.city}
                                onChange={(e) =>
                                  setAddressForm((s) => ({ ...s, city: e.target.value }))
                                }
                                className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
                              />
                              <Input
                                placeholder="State *"
                                value={addressForm.state}
                                onChange={(e) =>
                                  setAddressForm((s) => ({ ...s, state: e.target.value }))
                                }
                                className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
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
                                className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
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
                                className="accent-[#eef4df]"
                              />
                              <label htmlFor="isDefault" className="text-sm text-[#d6dfbd]">
                                Set as default address
                              </label>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-5">
                              <Button
                                variant="outline"
                                className="w-full border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                                onClick={() => setShowAddressForm(false)}
                                disabled={savingAddress}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="w-full bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
                                onClick={handleAddAddress}
                                disabled={savingAddress}
                              >
                                {savingAddress ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                  </span>
                                ) : (
                                  "Save Address"
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-6">
                  <h2 className="text-lg font-semibold text-[#f4f7ec] mb-2">Payment</h2>
                  <p className="text-sm text-[#d6dfbd] mb-5">
                    Choose payment method & place order
                  </p>

                  {selectedAddress && (
                    <div className="mb-5 rounded-xl border border-white/10 p-4 bg-white/5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[#f4f7ec]">Deliver to</p>
                          <p className="text-sm text-[#d6dfbd] mt-1">
                            {selectedAddress.fullName}, {selectedAddress.city}, {selectedAddress.state} -{" "}
                            {selectedAddress.pincode}
                          </p>
                          {!shippingLoading && shippingMeta.found && shippingMeta.appliedRule && (
                            <p className="text-xs text-[#d6dfbd] mt-1">
                              Shipping rule: {shippingMeta.appliedRule.replace(/_/g, " ")}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-[#d6dfbd]">Shipping</p>
                          <p className="font-semibold text-[#f4f7ec]">
                            {shippingLoading ? "Loading..." : shipping === 0 ? "Free" : formatPrice(shipping)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    {(["COD", "ONLINE"] as const).map((m) => (
                      <label
                        key={m}
                        className={`block p-4 rounded-lg border cursor-pointer ${
                          paymentMethod === m
                            ? "border-[#eef4df] bg-[#eef4df]/10"
                            : "border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            checked={paymentMethod === m}
                            onChange={() => setPaymentMethod(m)}
                            className="accent-[#eef4df]"
                          />
                          <div>
                            <p className="font-semibold text-[#f4f7ec]">
                              {m === "COD" ? "Cash on Delivery" : "Online Payment (Razorpay)"}
                            </p>
                            <p className="text-sm text-[#d6dfbd]">
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
                    className="w-full bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
                    size="lg"
                    disabled={placing || shippingLoading}
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

                  <p className="text-xs text-[#d6dfbd] mt-3">
                    For online payments, your payment is verified on the server before order is created.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (step === 1) navigate("/cart");
                    else setStep((s) => Math.max(1, s - 1));
                  }}
                  className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                >
                  Back
                </Button>

                <Button
                  className="bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
                  onClick={() => setStep((s) => Math.min(2, s + 1))}
                  disabled={!canGoNext || step === 2 || shippingLoading}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-[#f4f7ec] mb-4">Order Summary</h2>

                <div className="space-y-4 mb-5">
                  {items.map((item: any) => {
                    const qty = item.quantity || 1;
                    const product = item.product || {};
                    const snapshot = item.productSnapshot || {};

                    const price =
                      typeof product.price === "number"
                        ? product.price
                        : snapshot.price || 0;

                    const name = product.name || snapshot.name || "Product";
                    const image = product.image || snapshot.image || "";

                    // ✅ Variant attributes (from product.variantAttributes or item.attributes)
                    const variantAttributes = product.variantAttributes || item.attributes || {};

                    return (
                      <div key={item._id || `${item.productId}-${product.variantId}`} className="flex gap-3 items-start">
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                          {image ? (
                            <img src={image} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-[#d6dfbd]">No Image</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#f4f7ec] truncate">{name}</p>

                          {/* ✅ Variant badges */}
                          {(variantAttributes.color || variantAttributes.size || variantAttributes.fabric) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {variantAttributes.color && (
                                <span className="inline-flex items-center gap-1 bg-[#3f4f22] px-2 py-0.5 rounded-full text-xs text-[#f4f7ec]">
                                  <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: variantAttributes.color }}
                                  />
                                  {getColorName(variantAttributes.color)}
                                </span>
                              )}
                              {variantAttributes.size && (
                                <span className="bg-[#3f4f22] px-2 py-0.5 rounded-full text-xs text-[#f4f7ec]">
                                  Size: {variantAttributes.size}
                                </span>
                              )}
                              {variantAttributes.fabric && (
                                <span className="bg-[#3f4f22] px-2 py-0.5 rounded-full text-xs text-[#f4f7ec] capitalize">
                                  {variantAttributes.fabric}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-[#d6dfbd]">Qty: {qty}</span>
                            <span className="text-sm font-semibold text-[#f4f7ec]">
                              {formatPrice(price * qty)}
                            </span>
                          </div>

                          <p className="text-xs text-[#d6dfbd] mt-1">{formatPrice(price)} each</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-white/10 p-3 mb-4 bg-white/5">
                  {!selectedAddress ? (
                    <p className="text-sm text-[#d6dfbd]">Select address to calculate shipping</p>
                  ) : shippingLoading ? (
                    <p className="text-sm text-[#d6dfbd] inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Calculating shipping...
                    </p>
                  ) : shippingMeta.found ? (
                    <div>
                      <p className="text-sm font-medium text-[#f4f7ec]">
                        Shipping for {selectedAddress.city}
                        {selectedAddress.pincode ? ` - ${selectedAddress.pincode}` : ""}
                      </p>
                      {shippingMeta.appliedRule && (
                        <p className="text-xs text-[#d6dfbd] mt-1">
                          Rule: {shippingMeta.appliedRule.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-green-300 font-medium">
                      No shipping rule matched. Free shipping applied.
                    </p>
                  )}
                </div>

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

                  <div className="flex justify-between text-sm">
                    <span className="text-[#d6dfbd]">Shipping</span>
                    <span className="text-[#f4f7ec]">
                      {shippingLoading ? "Loading..." : shipping === 0 ? "Free" : formatPrice(shipping)}
                    </span>
                  </div>

                  {shippingDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-300">
                      <span>Shipping Discount</span>
                      <span>-{formatPrice(shippingDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-[#d6dfbd]">Tax (18% GST)</span>
                    <span className="text-[#f4f7ec]">{formatPrice(tax)}</span>
                  </div>

                  {appliedCoupon?.code && (
                    <div className="text-xs text-[#d6dfbd]">
                      Coupon: <span className="text-[#f4f7ec] font-semibold">{appliedCoupon.code}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/20 pt-4 mb-6">
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#f4f7ec]">Total</span>
                    <span className="text-xl font-bold text-[#eef4df]">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                >
                  <Link to="/products">Continue Shopping</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}