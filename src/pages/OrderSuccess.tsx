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
        <div className="container mx-auto px-4 py-10">
          <div className="bg-card border border-border/50 rounded-xl p-6 animate-pulse h-48" />
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10">
          <div className="bg-card border border-border/50 rounded-xl p-6">
            <p className="text-muted-foreground">Order not found.</p>
            <Button asChild variant="gold" className="mt-4">
              <Link to="/orders">Go to Orders</Link>
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
            <Link to="/" className="text-primary hover:underline">Home</Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Order Success</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-10">
        <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Order Placed Successfully!</h1>
              <p className="text-muted-foreground mt-1">
                Order ID: <span className="text-foreground font-medium">{order._id}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Status: <span className="text-foreground font-medium">{order.status}</span> • Payment:{" "}
                <span className="text-foreground font-medium">{order.payment?.method}</span>
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            {/* Items */}
            <div className="lg:col-span-2 bg-secondary/30 border border-border/50 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <h2 className="font-semibold text-foreground">Order Items</h2>
              </div>

              <div className="divide-y divide-border/40">
                {items.map((it: any) => (
                  <div key={it.productId} className="p-4 flex gap-4">
                    <img
                      src={it.image}
                      alt={it.name}
                      className="w-20 h-20 rounded-lg object-cover bg-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-1">{it.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {it.quantity}</p>
                      <p className="text-sm text-muted-foreground">
                        Price: <span className="text-foreground">{formatPrice(it.finalPrice)}</span>{" "}
                        <span className="line-through ml-2">{formatPrice(it.price)}</span>
                      </p>
                    </div>
                    <div className="font-semibold text-primary">
                      {formatPrice(it.finalPrice * it.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-card border border-border/50 rounded-xl p-5">
              <h2 className="font-semibold text-foreground mb-4">Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatPrice(totals.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground">
                    {totals.shipping === 0 ? "Free" : formatPrice(totals.shipping || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">{formatPrice(totals.tax || 0)}</span>
                </div>

                <div className="border-t border-border/50 pt-3 mt-3 flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-primary">{formatPrice(totals.total || 0)}</span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-foreground mb-2">Delivery Address</h3>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">{address.fullName}</span> • {address.phone}
                  <br />
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  {address.landmark ? `, ${address.landmark}` : ""}
                  <br />
                  {address.city}, {address.state} - {address.pincode}
                </p>
              </div>

              <div className="flex flex-col gap-2 mt-6">
                <Button asChild variant="gold">
                  <Link to="/orders">Go to My Orders</Link>
                </Button>
                <Button asChild variant="outline">
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
