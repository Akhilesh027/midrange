import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight } from "lucide-react";
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

export default function OrderSuccess() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);

  useEffect(() => {
    if (!getToken()) {
      toast.error("Please login");
      navigate("/login");
      return;
    }
    if (!orderId) return;

    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/orders/${orderId}`, { method: "GET" });
        const json = await res.json();

        if (!res.ok) {
          toast.error(json?.message || "Order not found");
          navigate("/orders");
          return;
        }

        setOrder(json?.data);
      } catch {
        toast.error("Failed to load order");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const totals = order?.totals || {};
  const address = order?.addressSnapshot || {};
  const items = order?.items || [];

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
          <div className="container mx-auto px-4 py-10">
            <div className="bg-[#4b5e29] border border-white/10 rounded-xl p-6 animate-pulse h-48" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
          <div className="container mx-auto px-4 py-10">
            <div className="bg-[#4b5e29] border border-white/10 rounded-xl p-6">
              <p className="text-[#d6dfbd]">Order not found.</p>
              <Button
                asChild
                className="mt-4 bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
              >
                <Link to="/orders">Go to Orders</Link>
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
        {/* Breadcrumb */}
        <nav className="bg-[#4b5e29] py-3 border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-[#eef4df] hover:underline">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-[#d6dfbd]" />
              <span className="text-[#d6dfbd]">Order Success</span>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-10">
          <div className="bg-[#4b5e29] border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#eef4df]/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-[#eef4df]" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#f4f7ec]">
                  Order Placed Successfully!
                </h1>
                <p className="text-[#d6dfbd] mt-1">
                  Order ID:{" "}
                  <span className="text-[#f4f7ec] font-medium">{order._id}</span>
                </p>
                <p className="text-sm text-[#d6dfbd] mt-1">
                  Status:{" "}
                  <span className="text-[#f4f7ec] font-medium">
                    {order.status}
                  </span>{" "}
                  • Payment:{" "}
                  <span className="text-[#f4f7ec] font-medium">
                    {order.payment?.method}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mt-8">
              {/* Items */}
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h2 className="font-semibold text-[#f4f7ec]">Order Items</h2>
                </div>

                <div className="divide-y divide-white/10">
                  {items.map((it: any) => (
                    <div key={it.productId} className="p-4 flex gap-4">
                      <img
                        src={it.image}
                        alt={it.name}
                        className="w-20 h-20 rounded-lg object-cover bg-[#3f4f22]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#f4f7ec] line-clamp-1">
                          {it.name}
                        </p>
                        <p className="text-sm text-[#d6dfbd]">Qty: {it.quantity}</p>
                        <p className="text-sm text-[#d6dfbd]">
                          Price:{" "}
                          <span className="text-[#f4f7ec]">
                            {formatPrice(it.finalPrice)}
                          </span>{" "}
                          <span className="line-through ml-2">
                            {formatPrice(it.price)}
                          </span>
                        </p>
                      </div>
                      <div className="font-semibold text-[#eef4df]">
                        {formatPrice(it.finalPrice * it.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-[#4b5e29] border border-white/10 rounded-xl p-5">
                <h2 className="font-semibold text-[#f4f7ec] mb-4">Summary</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#d6dfbd]">Subtotal</span>
                    <span className="text-[#f4f7ec]">
                      {formatPrice(totals.subtotal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#d6dfbd]">Shipping</span>
                    <span className="text-[#f4f7ec]">
                      {totals.shipping === 0
                        ? "Free"
                        : formatPrice(totals.shipping || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#d6dfbd]">Tax</span>
                    <span className="text-[#f4f7ec]">
                      {formatPrice(totals.tax || 0)}
                    </span>
                  </div>

                  <div className="border-t border-white/10 pt-3 mt-3 flex justify-between">
                    <span className="font-semibold text-[#f4f7ec]">Total</span>
                    <span className="font-bold text-[#eef4df]">
                      {formatPrice(totals.total || 0)}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-[#f4f7ec] mb-2">
                    Delivery Address
                  </h3>
                  <p className="text-sm text-[#d6dfbd]">
                    <span className="text-[#f4f7ec] font-medium">
                      {address.fullName}
                    </span>{" "}
                    • {address.phone}
                    <br />
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                    {address.landmark ? `, ${address.landmark}` : ""}
                    <br />
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                </div>

                <div className="flex flex-col gap-2 mt-6">
                  <Button
                    asChild
                    className="bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
                  >
                    <Link to="/orders">Go to My Orders</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                  >
                    <Link to="/products">Continue Shopping</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}