// src/pages/Checkout.tsx
// ✅ Fully responsive (mobile, tablet, desktop)
// ✅ Fixed Checkout with proper tax calculation, and security
// ✅ Styled consistently with Index & Cart (earthy green theme)
// ✅ Displays variant attributes (size, color, fabric) in order summary
// ✅ Dynamic GST: calculated on discounted price per item
// ✅ Proper coupon validation and persistence
// ✅ ALL FRONTEND VALIDATION REMOVED (stock, address, total, form)
// ✅ FIXED: No oversizing on any screen size (down to 280px)
// ✅ FIXED: Long product names wrap properly, don't overflow or get truncated

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  Trash2,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";

// Environment configuration
const WEBSITE: "affordable" | "midrange" | "luxury" = "midrange";
const API_BASE = import.meta.env.VITE_API_BASE || "https://api.jsgallor.com/api";

// Types
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

type CartItem = {
  _id?: string;
  productId: string;
  product: {
    _id: string;
    name: string;
    price: number;
    finalPrice?: number;
    gst?: number;
    image?: string;
    stockQty?: number;
    isCustomized?: boolean;
    variantAttributes?: {
      color?: string;
      size?: string;
      fabric?: string;
    };
  };
  quantity: number;
  variantId?: string;
  variantStock?: number;
  attributes?: {
    color?: string;
    size?: string;
    fabric?: string;
  };
};

// Utility functions
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

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as {
    coupon?: CouponPayload | null;
    discount?: number;
    shippingDiscount?: number;
  };

  const { items, totalPrice, refreshCartFromBackend, clearCart } = useCart();
  const shippingTimeoutRef = useRef<NodeJS.Timeout>();

  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

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
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [appliedCoupon, setAppliedCoupon] = useState<CouponPayload | null>(null);
  const [discount, setDiscount] = useState(0);
  const [shippingDiscount, setShippingDiscount] = useState(0);

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

  // selectedAddress memo
  const selectedAddress = useMemo(() => {
    return addresses.find((a) => a._id === selectedAddressId) || null;
  }, [addresses, selectedAddressId]);

  // Tax calculation on discounted price per item
  const tax = useMemo(() => {
    if (items.length === 0 || totalPrice === 0) return 0;

    let totalTax = 0;
    const discountedSubtotal = Math.max(0, totalPrice - discount);

    if (discountedSubtotal === 0) return 0;

    for (const item of items) {
      const product = item.product || {};
      const qty = item.quantity || 1;
      const itemPrice = product.finalPrice || product.price || 0;
      const gstPercent = product.gst || 0;

      if (gstPercent === 0) continue;

      const itemOriginalTotal = itemPrice * qty;
      const itemProportion = itemOriginalTotal / totalPrice;
      const itemDiscountedValue = discountedSubtotal * itemProportion;
      const itemTax = itemDiscountedValue * (gstPercent / 100);

      totalTax += itemTax;
    }

    return Math.round(totalTax * 100) / 100;
  }, [items, totalPrice, discount]);

  const shipping = useMemo(() => {
    return Math.max(0, Number(shippingBase || 0) - Number(shippingDiscount || 0));
  }, [shippingBase, shippingDiscount]);

  const finalTotal = useMemo(() => {
    const discountedSubtotal = Math.max(0, totalPrice - discount);
    return Math.max(0, discountedSubtotal + shipping + tax);
  }, [totalPrice, discount, shipping, tax]);

  // Authentication check
  useEffect(() => {
    if (!getToken()) {
      toast.error("Please login to checkout");
      navigate("/login");
      return;
    }
    refreshCartFromBackend();
  }, [navigate, refreshCartFromBackend]);

  // Cart empty check
  useEffect(() => {
    if (items.length === 0 && !placing) {
      navigate("/cart");
    }
  }, [items.length, navigate, placing]);

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
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
  }, [selectedAddressId]);

  useEffect(() => {
    if (step !== 1) return;
    fetchAddresses();
  }, [step, fetchAddresses]);

  // Debounced shipping calculation
  const fetchShippingCost = useCallback(async (params: { city?: string; pincode?: string }) => {
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
    } catch (error) {
      console.error("Shipping fetch error:", error);
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
  }, []);

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

    if (shippingTimeoutRef.current) {
      clearTimeout(shippingTimeoutRef.current);
    }

    shippingTimeoutRef.current = setTimeout(() => {
      fetchShippingCost({
        city: selectedAddress.city,
        pincode: selectedAddress.pincode,
      });
    }, 300);

    return () => {
      if (shippingTimeoutRef.current) {
        clearTimeout(shippingTimeoutRef.current);
      }
    };
  }, [selectedAddress?.city, selectedAddress?.pincode, fetchShippingCost]);

  // Coupon validation on load
  useEffect(() => {
    const validateSavedCoupon = async () => {
      try {
        const saved = localStorage.getItem(`${WEBSITE}_coupon`);
        if (!saved) return;

        const parsed = JSON.parse(saved);
        const savedCoupon = parsed?.coupon;

        if (savedCoupon?.code) {
          setValidatingCoupon(true);
          
          const res = await apiFetch("/midrange/coupons/validate", {
            method: "POST",
            body: JSON.stringify({
              code: savedCoupon.code,
              website: WEBSITE,
              cartTotal: totalPrice,
            }),
          });

          const data = await res.json();

          if (res.ok && data.valid) {
            setAppliedCoupon({
              couponId: savedCoupon?.couponId || savedCoupon?.id,
              code: savedCoupon.code,
              type: savedCoupon.type,
              value: savedCoupon.value,
            });
            setDiscount(Number(parsed?.discount || 0));
            setShippingDiscount(Number(parsed?.shippingDiscount || 0));
          } else {
            localStorage.removeItem(`${WEBSITE}_coupon`);
            toast.error(`Coupon "${savedCoupon.code}" is no longer valid`);
          }
        }
      } catch (error) {
        console.error("Coupon validation error:", error);
        localStorage.removeItem(`${WEBSITE}_coupon`);
      } finally {
        setValidatingCoupon(false);
      }
    };

    if (totalPrice > 0) {
      validateSavedCoupon();
    }
  }, [totalPrice]);

  // NO VALIDATION: can always go next
  const canGoNext = useMemo(() => true, []);

  // NO ADDRESS FORM VALIDATION
  const handleAddAddress = async () => {
    try {
      setSavingAddress(true);

      const url = editingAddress 
        ? `/midrange/addresses/${editingAddress._id}` 
        : "/midrange/addresses";
      const method = editingAddress ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(addressForm),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json?.message || `Failed to ${editingAddress ? "update" : "save"} address`);
        return;
      }

      toast.success(editingAddress ? "Address updated" : "Address saved");
      setShowAddressForm(false);
      setEditingAddress(null);

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
      toast.error(`Failed to ${editingAddress ? "update" : "save"} address`);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      setDeletingAddressId(addressId);
      const res = await apiFetch(`/midrange/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json?.message || "Failed to delete address");
        return;
      }

      toast.success("Address deleted");
      
      if (selectedAddressId === addressId) {
        setSelectedAddressId("");
      }
      
      await fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || "",
      landmark: address.landmark || "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault || false,
    });
    setShowAddressForm(true);
  };

  // NO ORDER VALIDATION – always proceed
  const handlePlaceOrder = async () => {
    // No validation whatsoever – directly place order
    // Only check shipping loading (UX, not validation)
    if (shippingLoading) {
      toast.error("Please wait, shipping is being calculated");
      return;
    }

    setPlacing(true);

    try {
      let razorpay: any = undefined;

      if (paymentMethod === "ONLINE") {
        razorpay = await startRazorpayPayment();
      }

      const res = await apiFetch("/midrange/orders", {
        method: "POST",
        body: JSON.stringify({
          addressId: selectedAddressId || null,
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
      toast.success(paymentMethod === "ONLINE" ? "Payment successful! Order placed!" : "Order placed successfully!");

      if (orderId && appliedCoupon?.code) {
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
        } catch (error) {
          console.error("Coupon redemption error:", error);
        }
      }

      localStorage.removeItem(`${WEBSITE}_coupon`);
      await clearCart();

      navigate(`/order-success/${orderId}`);
    } catch (e: any) {
      console.error("Order placement error:", e);
      toast.error(e?.message || "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const startRazorpayPayment = async () => {
    const ok = await loadRazorpay();
    if (!ok) throw new Error("Razorpay SDK failed to load.");

    const amountInRupees = finalTotal;
    console.log(`💰 Sending amount in rupees: ₹${amountInRupees}`);

    const createRes = await apiFetch("/payments/create-order", {
      method: "POST",
      body: JSON.stringify({
        amount: amountInRupees,
        currency: "INR",
        cartTotal: totalPrice,
        discount,
        shipping,
        tax,
        couponCode: appliedCoupon?.code,
        addressId: selectedAddressId,
        website: WEBSITE,
      }),
    });

    const createJson = await createRes.json();
    if (!createRes.ok || !createJson?.success) {
      throw new Error(createJson?.message || "Failed to create payment order");
    }

    // Server must return amount in paise
    const serverAmountPaise = createJson.amount;
    const expectedPaise = Math.round(amountInRupees * 100);
    if (Math.abs(serverAmountPaise - expectedPaise) > 1) {
      console.error("Amount mismatch:", { serverAmountPaise, expectedPaise });
      throw new Error("Order amount mismatch");
    }

    const rpOrder = createJson.order;
    const keyId = createJson.keyId;
    const user = getSavedUser();

    return new Promise((resolve, reject) => {
      const options = {
        key: keyId,
        order_id: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        name: "JSGALLOR",
        description: `Order #${rpOrder.receipt}`,
        prefill: {
          name: user?.name || user?.fullName || selectedAddress?.fullName || "",
          email: user?.email || "",
          contact: user?.phone || selectedAddress?.phone || "",
        },
        theme: { color: "#556b2f" },
        handler: async (resp) => {
          try {
            const verifyRes = await apiFetch("/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                ...resp,
                orderId: rpOrder.id,
                amount: rpOrder.amount,
              }),
            });
            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok || !verifyJson?.success) {
              throw new Error(verifyJson?.message || "Payment verification failed");
            }
            resolve(resp);
          } catch (e) {
            reject(e);
          }
        },
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => reject(new Error(response.error?.description)));
      rzp.open();
    });
  };

  const handleStepChange = (newStep: number) => {
    setStep(newStep);
  };

  if (validatingCoupon) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#556b2f] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#eef4df]" />
            <p className="text-[#f4f7ec]">Validating your coupon...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Added overflow-x-hidden to prevent horizontal scroll */}
      <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec] overflow-x-hidden">
        <nav className="bg-[#4b5e29] py-3 border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Link to="/" className="text-[#eef4df] hover:underline">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-[#d6dfbd] flex-shrink-0" />
              <Link to="/cart" className="text-[#eef4df] hover:underline">
                Cart
              </Link>
              <ChevronRight className="w-4 h-4 text-[#d6dfbd] flex-shrink-0" />
              <span className="text-[#d6dfbd] truncate">Checkout</span>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-4 md:py-8">
          {/* Progress Steps - Responsive */}
          <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-4 md:p-6 mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-3">
              {steps.map((s, idx) => {
                const active = step === s.id;
                const done = step > s.id;
                const Icon = s.icon;

                return (
                  <div key={s.id} className="flex-1 flex items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={() => handleStepChange(s.id)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors flex-shrink-0 ${
                        done
                          ? "bg-[#eef4df] text-[#3f4f22] border-[#eef4df] cursor-pointer"
                          : active
                            ? "border-[#eef4df] text-[#eef4df] cursor-pointer"
                            : "border-white/20 text-[#d6dfbd] cursor-pointer"
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </button>

                    <div className="min-w-0 flex-1">
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

          <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {step === 1 && (
                <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <h2 className="text-lg font-semibold text-[#f4f7ec]">Choose Delivery Address</h2>
                      <p className="text-sm text-[#d6dfbd]">Select or add a new address</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingAddress(null);
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
                        setShowAddressForm(true);
                      }}
                      className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22] w-full sm:w-auto"
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
                    <div className="p-4 rounded-lg bg-white/10 text-sm text-[#d6dfbd] break-words">
                      No addresses found. Click <b className="text-[#f4f7ec]">Add Address</b> to continue.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((a) => (
                        <div
                          key={a._id}
                          className={`block p-3 md:p-4 rounded-lg border transition-colors ${
                            selectedAddressId === a._id
                              ? "border-[#eef4df] bg-[#eef4df]/10"
                              : "border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {/* FIX: Always flex-row, never stack on mobile */}
                          <div className="flex flex-row items-start gap-3">
                            <input
                              type="radio"
                              checked={selectedAddressId === a._id}
                              onChange={() => setSelectedAddressId(a._id)}
                              className="mt-1 accent-[#eef4df] flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <p className="font-semibold text-[#f4f7ec] break-words">
                                  {a.fullName}{" "}
                                  {a.isDefault ? (
                                    <span className="ml-2 text-xs text-[#eef4df]">(Default)</span>
                                  ) : null}
                                </p>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditAddress(a)}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                    aria-label="Edit address"
                                  >
                                    <Edit2 className="w-4 h-4 text-[#d6dfbd]" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAddress(a._id)}
                                    disabled={deletingAddressId === a._id}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                    aria-label="Delete address"
                                  >
                                    {deletingAddressId === a._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-[#d6dfbd]" />
                                    ) : (
                                      <Trash2 className="w-4 h-4 text-red-400" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-[#d6dfbd] mt-1 break-words">
                                {a.line1}
                                {a.line2 ? `, ${a.line2}` : ""}
                                {a.landmark ? `, ${a.landmark}` : ""}, {a.city}, {a.state} -{" "}
                                {a.pincode}
                              </p>
                              <p className="text-xs text-[#d6dfbd] mt-1 break-words">📞 {a.phone}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedAddress && (
                    <div className="mt-5 rounded-xl border border-white/10 p-4 bg-white/5">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <Truck className="w-4 h-4 mt-0.5 text-[#d6dfbd] flex-shrink-0" />
                          <div className="min-w-0">
                            {/* FIX: responsive font size for shipping label */}
                            <p className="font-medium text-sm sm:text-base text-[#f4f7ec]">
                              Shipping for selected address
                            </p>
                            <p className="text-sm text-[#d6dfbd] mt-1 break-words">
                              {selectedAddress.city}
                              {selectedAddress.pincode ? ` - ${selectedAddress.pincode}` : ""}
                            </p>

                            {!shippingLoading && shippingMeta.found && shippingMeta.appliedRule && (
                              <p className="text-xs text-[#d6dfbd] mt-1 break-words">
                                Applied rule: {shippingMeta.appliedRule.replace(/_/g, " ")}
                              </p>
                            )}

                            {!shippingLoading && !shippingMeta.found && (
                              <p className="text-xs text-green-300 mt-1">
                                ✨ Free shipping applied
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className="text-xs text-[#d6dfbd]">Shipping</p>
                          <p className="font-semibold text-[#f4f7ec]">
                            {shippingLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin inline" />
                            ) : shipping === 0 ? (
                              "Free"
                            ) : (
                              formatPrice(shipping)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-4 md:p-6">
                  <h2 className="text-lg font-semibold text-[#f4f7ec] mb-2">Payment Method</h2>
                  <p className="text-sm text-[#d6dfbd] mb-5">
                    Choose how you want to pay
                  </p>

                  {selectedAddress && (
                    <div className="mb-5 rounded-xl border border-white/10 p-4 bg-white/5">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-[#f4f7ec]">Delivering to</p>
                          <p className="text-sm text-[#d6dfbd] mt-1 break-words">
                            {selectedAddress.fullName}, {selectedAddress.city}, {selectedAddress.state} -{" "}
                            {selectedAddress.pincode}
                          </p>
                          {!shippingLoading && shippingMeta.found && shippingMeta.appliedRule && (
                            <p className="text-xs text-[#d6dfbd] mt-1 break-words">
                              Shipping rule: {shippingMeta.appliedRule.replace(/_/g, " ")}
                            </p>
                          )}
                        </div>

                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className="text-xs text-[#d6dfbd]">Shipping</p>
                          <p className="font-semibold text-[#f4f7ec]">
                            {shippingLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin inline" />
                            ) : shipping === 0 ? (
                              "Free"
                            ) : (
                              formatPrice(shipping)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    {(["COD", "ONLINE"] as const).map((m) => (
                      <label
                        key={m}
                        className={`block p-4 rounded-lg border cursor-pointer transition-colors ${
                          paymentMethod === m
                            ? "border-[#eef4df] bg-[#eef4df]/10"
                            : "border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={paymentMethod === m}
                            onChange={() => setPaymentMethod(m)}
                            className="accent-[#eef4df] mt-1 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-[#f4f7ec] break-words">
                              {m === "COD" ? "Cash on Delivery" : "Online Payment (Razorpay)"}
                            </p>
                            <p className="text-sm text-[#d6dfbd] break-words">
                              {m === "COD"
                                ? "Pay when you receive the product"
                                : "UPI / Credit/Debit Card / NetBanking / Wallets"}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <Button
                    className="w-full bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2] disabled:opacity-50"
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
                      "Place Order (Cash on Delivery)"
                    )}
                  </Button>

                  <p className="text-xs text-[#d6dfbd] mt-3 text-center break-words">
                    By placing an order, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (step === 1) navigate("/cart");
                    else setStep((s) => Math.max(1, s - 1));
                  }}
                  className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22] w-full sm:w-auto"
                >
                  ← Back
                </Button>

                {step === 1 && (
                  <Button
                    className="bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2] disabled:opacity-50 w-full sm:w-auto"
                    onClick={() => handleStepChange(2)}
                    disabled={shippingLoading}
                  >
                    Continue to Payment →
                  </Button>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar - Responsive: becomes full width on mobile */}
            <div className="lg:col-span-1">
              <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-4 md:p-6 lg:sticky lg:top-24">
                <h2 className="text-lg font-semibold text-[#f4f7ec] mb-4">Order Summary</h2>

                {/* Order Items - Responsive images and long product names */}
                <div className="space-y-4 mb-5 max-h-96 overflow-y-auto pr-1">
                  {(items as CartItem[]).map((item: CartItem) => {
                    const qty = item.quantity || 1;
                    const product = item.product || {};
                    const price = product.finalPrice || product.price || 0;
                    const name = product.name || "Product";
                    const image = product.image || "";
                    const variantAttributes = product.variantAttributes || item.attributes || {};

                    return (
                      <div key={item._id || `${item.productId}-${Date.now()}`} className="flex gap-3 items-start">
                        {/* FIX: smaller image on mobile */}
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                          {image ? (
                            <img src={image} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-xs text-[#d6dfbd]">No img</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* FIX: product name uses break-words to wrap long names instead of truncating */}
                          <p className="text-sm font-semibold text-[#f4f7ec] break-words">
                            {name}
                          </p>

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

                          <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                            <span className="text-xs text-[#d6dfbd]">Qty: {qty}</span>
                            <span className="text-sm font-semibold text-[#f4f7ec]">
                              {formatPrice(price * qty)}
                            </span>
                          </div>

                          {product.isCustomized && (
                            <span className="inline-block mt-1 text-[10px] text-amber-300 bg-amber-900/30 px-2 py-0.5 rounded-full">
                              Customizable
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#d6dfbd]">Subtotal</span>
                    <span className="text-[#f4f7ec]">{formatPrice(totalPrice)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-300">
                      <span>Coupon Discount</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-[#d6dfbd]">Shipping</span>
                    <span className="text-[#f4f7ec]">
                      {shippingLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin inline" />
                      ) : shipping === 0 ? (
                        "Free"
                      ) : (
                        formatPrice(shipping)
                      )}
                    </span>
                  </div>

                  {shippingDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-300">
                      <span>Shipping Discount</span>
                      <span>-{formatPrice(shippingDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-[#d6dfbd]">GST (included)</span>
                    <span className="text-[#f4f7ec]">{formatPrice(tax)}</span>
                  </div>

                  {appliedCoupon?.code && (
                    <div className="text-xs text-[#d6dfbd] pt-2 border-t border-white/10 break-words">
                      Coupon applied: <span className="text-[#f4f7ec] font-semibold">{appliedCoupon.code}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-t border-white/20 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#f4f7ec]">Total Amount</span>
                    <span className="text-xl font-bold text-[#eef4df]">{formatPrice(finalTotal)}</span>
                  </div>
                  {paymentMethod === "COD" && (
                    <p className="text-xs text-[#d6dfbd] mt-2 break-words">
                      Pay {formatPrice(finalTotal)} when you receive your order
                    </p>
                  )}
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

      {/* Address Form Modal - Responsive: fits small screens */}
      {showAddressForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowAddressForm(false);
              setEditingAddress(null);
            }}
          />
          {/* FIX: modal width capped at 95% on mobile, max-w-lg on larger */}
          <div className="relative w-full max-w-[95%] md:max-w-lg my-4 md:my-8">
            <div className="bg-[#4b5e29] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#f4f7ec]">
                    {editingAddress ? "Edit Address" : "Add New Address"}
                  </h3>
                  <p className="text-sm text-[#d6dfbd]">
                    {editingAddress ? "Update your delivery address" : "Enter your delivery details"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddress(null);
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-[#d6dfbd] hover:text-[#f4f7ec]"
                >
                  ✕
                </button>
              </div>

              {/* FIX: added overflow-x-auto to prevent any horizontal scroll inside modal */}
              <div className="p-5 overflow-x-auto">
                <div className="grid grid-cols-1 gap-3">
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

                  <Input
                    placeholder="Address Line 1 *"
                    value={addressForm.line1}
                    onChange={(e) =>
                      setAddressForm((s) => ({ ...s, line1: e.target.value }))
                    }
                    className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
                  />

                  <Input
                    placeholder="Address Line 2 (optional)"
                    value={addressForm.line2}
                    onChange={(e) =>
                      setAddressForm((s) => ({ ...s, line2: e.target.value }))
                    }
                    className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
                  />

                  <Input
                    placeholder="Landmark (optional)"
                    value={addressForm.landmark}
                    onChange={(e) =>
                      setAddressForm((s) => ({ ...s, landmark: e.target.value }))
                    }
                    className="bg-white/10 border-white/20 text-[#f7faef] placeholder:text-[#d5dfbb]"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  </div>
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
                    onClick={() => {
                      setShowAddressForm(false);
                      setEditingAddress(null);
                    }}
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
                        {editingAddress ? "Updating..." : "Saving..."}
                      </span>
                    ) : (
                      editingAddress ? "Update Address" : "Save Address"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}