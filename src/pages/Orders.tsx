import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Package } from "lucide-react";

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
type MidrangeOrder = {
  _id: string;
  orderNumber?: string;
  totals?: { total?: number };
  totalAmount?: number;
  status: string;
  createdAt?: string;
  pricing?: { total?: number }; // (optional) if your backend uses pricing
  items?: Array<{
    productId: string;
    name?: string;
    image?: string;
    quantity: number;
    price?: number;
    finalPrice?: number;
    productSnapshot?: { name?: string; image?: string; price?: number };
  }>;
  payment?: { method?: string; status?: string };
};

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
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
    return <span className={`${base} bg-green-500/15 text-green-600`}>Delivered</span>;
  if (s === "shipped")
    return <span className={`${base} bg-blue-500/15 text-blue-600`}>Shipped</span>;
  if (s === "confirmed" || s === "approved")
    return <span className={`${base} bg-primary/10 text-primary`}>{s.toUpperCase()}</span>;
  if (s === "cancelled" || s === "rejected")
    return <span className={`${base} bg-red-500/15 text-red-600`}>{s.toUpperCase()}</span>;

  return <span className={`${base} bg-muted text-muted-foreground`}>{s ? s.toUpperCase() : "—"}</span>;
};

export default function MyOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<MidrangeOrder[]>([]);
  const [loading, setLoading] = useState(false);

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
            <span className="text-muted-foreground">My Orders</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground">My Orders</h1>
          </div>

          <Button variant="outline" onClick={loadOrders} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="py-10 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-card rounded-xl border border-border/50 p-6 text-muted-foreground">
            You don’t have any orders yet.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const first = o.items?.[0];
              const name = first?.name || first?.productSnapshot?.name || "Product";
              const image = first?.image || first?.productSnapshot?.image || "";
              const qty = first?.quantity || 1;
              const unit = Number(first?.finalPrice ?? first?.price ?? first?.productSnapshot?.price ?? 0);
              const total = Number(o.totals?.total ?? o.totalAmount ?? o.pricing?.total ?? unit * qty);

              return (
                <div key={o._id} className="bg-card rounded-xl border border-border/50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Order {o.orderNumber ? `#${o.orderNumber}` : getOrderNumber(o._id)}
                      </p>
                      <p className="text-xs text-muted-foreground">Placed on {formatDate(o.createdAt)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Payment: {(o.payment?.method || "-").toUpperCase()} /{" "}
                        {(o.payment?.status || "-").toUpperCase()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {statusPill(o.status)}
                      <span className="text-sm font-semibold">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-lg border border-border/50 bg-muted overflow-hidden flex items-center justify-center">
                      {image ? (
                        <img src={image} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">No Image</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-foreground">{name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {qty} × {formatPrice(unit)}
                      </p>
                    </div>

                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/order/${o._id}`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
