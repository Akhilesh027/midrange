import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Package, X, Truck, CreditCard, Calendar, MapPin } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_BASE = "https://api.jsgallor.com/api/midrange";

function getToken() {
  return localStorage.getItem("midrange_token");
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

/** ---------- Types ---------- */
type OrderItem = {
  productId: string;
  name?: string;
  image?: string;
  quantity: number;
  price?: number;
  finalPrice?: number;
  productSnapshot?: { 
    name?: string; 
    image?: string; 
    price?: number;
    originalPrice?: number;
    discountPercent?: number;
    gst?: number;
    variantAttributes?: {
      size?: string;
      color?: string;
      fabric?: string;
    };
  };
  attributes?: {
    size?: string;
    color?: string;
    fabric?: string;
  };
};

type Address = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
};

type MidrangeOrder = {
  _id: string;
  orderNumber?: string;
  totals?: { total?: number };
  totalAmount?: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  pricing?: { 
    total?: number;
    subtotal?: number;
    discount?: number;
    shippingCost?: number;
    shippingDiscount?: number;
    shippingFinal?: number;
    tax?: number;
  };
  items?: OrderItem[];
  payment?: { method?: string; status?: string };
  shipping?: {
    city?: string;
    pincode?: string;
    amount?: number;
    finalShipping?: number;
    appliedRule?: string;
  };
  address?: Address;
  addressId?: string;
};

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(Number(price || 0));

const getOrderNumber = (id: string) => `#${id.slice(-8).toUpperCase()}`;

const statusPill = (status: string) => {
  const s = (status || "").toLowerCase();
  const base = "px-3 py-1 rounded-full text-xs font-medium";

  if (s === "delivered")
    return <span className={`${base} bg-green-500/15 text-green-300`}>Delivered</span>;
  if (s === "shipped")
    return <span className={`${base} bg-blue-500/15 text-blue-300`}>Shipped</span>;
  if (s === "confirmed" || s === "approved")
    return <span className={`${base} bg-[#eef4df]/15 text-[#eef4df]`}>{s.toUpperCase()}</span>;
  if (s === "cancelled" || s === "rejected")
    return <span className={`${base} bg-red-500/15 text-red-300`}>{s.toUpperCase()}</span>;

  return <span className={`${base} bg-white/10 text-[#d6dfbd]`}>{s ? s.toUpperCase() : "—"}</span>;
};

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

// Order Details Modal Component
function OrderDetailsModal({ 
  order, 
  isOpen, 
  onClose 
}: { 
  order: MidrangeOrder | null; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  if (!isOpen || !order) return null;

  const orderTotal = Number(order.pricing?.total ?? order.totals?.total ?? order.totalAmount ?? 0);
  const subtotal = Number(order.pricing?.subtotal ?? 0);
  const discount = Number(order.pricing?.discount ?? 0);
  const shipping = Number(order.pricing?.shippingFinal ?? order.pricing?.shippingCost ?? 0);
  const tax = Number(order.pricing?.tax ?? 0);
  const address = order.address;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#4b5e29] rounded-xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#4b5e29] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#f4f7ec]">
              Order Details
            </h2>
            <p className="text-sm text-[#d6dfbd]">
              {order.orderNumber ? `Order #${order.orderNumber}` : getOrderNumber(order._id)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-[#d6dfbd] hover:text-[#f4f7ec]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Status & Date */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#d6dfbd]" />
              <div>
                <p className="text-xs text-[#d6dfbd]">Order Date</p>
                <p className="text-sm font-medium text-[#f4f7ec]">{formatDate(order.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-[#d6dfbd]">Status</p>
                {statusPill(order.status)}
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-lg font-semibold text-[#f4f7ec] mb-3">Items</h3>
            <div className="space-y-3">
              {order.items?.map((item, idx) => {
                const name = item.name || item.productSnapshot?.name || "Product";
                const image = item.image || item.productSnapshot?.image || "";
                const price = Number(item.finalPrice ?? item.price ?? item.productSnapshot?.price ?? 0);
                const quantity = item.quantity || 1;
                const variantAttributes = item.productSnapshot?.variantAttributes || item.attributes || {};
                
                return (
                  <div key={idx} className="flex gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                      {image ? (
                        <img src={image} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-[#d6dfbd]">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-[#f4f7ec]">{name}</p>
                      
                      {(variantAttributes.color || variantAttributes.size || variantAttributes.fabric) && (
                        <div className="flex flex-wrap gap-2 mt-1">
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
                      
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm text-[#d6dfbd]">Qty: {quantity}</p>
                        <p className="font-semibold text-[#f4f7ec]">{formatPrice(price * quantity)}</p>
                      </div>
                      <p className="text-xs text-[#d6dfbd]">{formatPrice(price)} each</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Address */}
          {address && (
            <div>
              <h3 className="text-lg font-semibold text-[#f4f7ec] mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </h3>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="font-medium text-[#f4f7ec]">{address.fullName}</p>
                <p className="text-sm text-[#d6dfbd] mt-1">📞 {address.phone}</p>
                <p className="text-sm text-[#d6dfbd] mt-1">
                  {address.line1}
                  {address.line2 && `, ${address.line2}`}
                  {address.landmark && `, ${address.landmark}`}
                </p>
                <p className="text-sm text-[#d6dfbd]">
                  {address.city}, {address.state} - {address.pincode}
                </p>
              </div>
            </div>
          )}

          {/* Payment Info */}
          {order.payment && (
            <div>
              <h3 className="text-lg font-semibold text-[#f4f7ec] mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Information
              </h3>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between">
                  <span className="text-[#d6dfbd]">Method</span>
                  <span className="text-[#f4f7ec] font-medium">
                    {order.payment.method?.toUpperCase() || "-"}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[#d6dfbd]">Status</span>
                  <span className={`font-medium ${
                    order.payment.status?.toLowerCase() === 'paid' 
                      ? 'text-green-300' 
                      : 'text-yellow-300'
                  }`}>
                    {order.payment.status?.toUpperCase() || "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Shipping Info */}
          {order.shipping && (
            <div>
              <h3 className="text-lg font-semibold text-[#f4f7ec] mb-3 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Shipping Information
              </h3>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-between">
                  <span className="text-[#d6dfbd]">City</span>
                  <span className="text-[#f4f7ec]">{order.shipping.city || "-"}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[#d6dfbd]">Pincode</span>
                  <span className="text-[#f4f7ec]">{order.shipping.pincode || "-"}</span>
                </div>
                {order.shipping.appliedRule && (
                  <div className="flex justify-between mt-2">
                    <span className="text-[#d6dfbd]">Applied Rule</span>
                    <span className="text-[#f4f7ec] text-sm">
                      {order.shipping.appliedRule.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Price Summary */}
          <div>
            <h3 className="text-lg font-semibold text-[#f4f7ec] mb-3">Price Summary</h3>
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2">
              {subtotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#d6dfbd]">Subtotal</span>
                  <span className="text-[#f4f7ec]">{formatPrice(subtotal)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-300">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[#d6dfbd]">Shipping</span>
                <span className="text-[#f4f7ec]">
                  {shipping === 0 ? "Free" : formatPrice(shipping)}
                </span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#d6dfbd]">Tax (GST)</span>
                  <span className="text-[#f4f7ec]">{formatPrice(tax)}</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-[#f4f7ec]">Total</span>
                  <span className="text-xl font-bold text-[#eef4df]">{formatPrice(orderTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#4b5e29] border-t border-white/10 px-6 py-4 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MyOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<MidrangeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MidrangeOrder | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // ✅ Guard
  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.error("Please login");
      navigate("/login");
    }
  }, [navigate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/orders", { method: "GET" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(json?.message || "Failed to load orders");
        setOrders([]);
        return;
      }

      const list: MidrangeOrder[] = Array.isArray(json?.data) ? json.data : [];
      setOrders(list);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewDetails = (order: MidrangeOrder) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrder(null);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
        {/* Breadcrumb */}
        <nav className="bg-[#4b5e29] py-3 border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-[#eef4df] hover:underline">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-[#d6dfbd]" />
              <span className="text-[#d6dfbd]">My Orders</span>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#d6dfbd]" />
              <h1 className="text-xl font-semibold text-[#f4f7ec]">My Orders</h1>
            </div>

            <Button
              variant="outline"
              onClick={loadOrders}
              disabled={loading}
              className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="py-10 flex items-center gap-2 text-[#d6dfbd]">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-[#4b5e29] rounded-xl border border-white/10 p-6 text-[#d6dfbd]">
              You don't have any orders yet.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => {
                const first = o.items?.[0];
                const name = first?.name || first?.productSnapshot?.name || "Product";
                const image = first?.image || first?.productSnapshot?.image || "";
                const qty = first?.quantity || 1;
                const unit = Number(first?.finalPrice ?? first?.price ?? first?.productSnapshot?.price ?? 0);
                const total = Number(o.pricing?.total ?? o.totals?.total ?? o.totalAmount ?? unit * qty);

                return (
                  <div key={o._id} className="bg-[#4b5e29] rounded-xl border border-white/10 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <p className="text-sm text-[#d6dfbd]">
                          Order {o.orderNumber ? `#${o.orderNumber}` : getOrderNumber(o._id)}
                        </p>
                        <p className="text-xs text-[#d6dfbd]">Placed on {formatDate(o.createdAt)}</p>
                        <p className="text-xs text-[#d6dfbd] mt-1">
                          Payment: {(o.payment?.method || "-").toUpperCase()} /{" "}
                          {(o.payment?.status || "-").toUpperCase()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {statusPill(o.status)}
                        <span className="text-sm font-semibold text-[#f4f7ec]">{formatPrice(total)}</span>
                      </div>
                    </div>

                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-lg border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
                        {image ? (
                          <img src={image} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-[#d6dfbd]">No Image</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-[#f4f7ec]">{name}</p>
                        <p className="text-sm text-[#d6dfbd]">
                          Qty: {qty} × {formatPrice(unit)}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(o)}
                        className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={modalOpen}
        onClose={handleCloseModal}
      />
    </Layout>
  );
}