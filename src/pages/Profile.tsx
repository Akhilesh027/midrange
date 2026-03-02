// src/pages/Profile.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Package,
  Heart,
  MapPin,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  Camera,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const API_BASE = "https://api.jsgallor.com/api/midrange";
const TOKEN_KEY = "midrange_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
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

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  customer?: any;
  pagination?: any;
};

type ProfileUser = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isVerified?: boolean;
  membershipLevel?: "standard" | "premium" | "elite" | string;
  membershipBadge?: string;
  loyaltyPoints?: number;
  totalOrders?: number;
  totalSpent?: number;
};

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

type OrderItem = {
  productId?: string;
  name?: string;
  image?: string;
  quantity?: number;
  price?: number;
  discountPercent?: number;
  discountAmount?: number;
  finalPrice?: number;
};

type Order = {
  _id: string;
  status?: string;
  createdAt?: string;

  items?: OrderItem[];

  totals?: {
    subtotal?: number;
    shipping?: number;
    tax?: number;
    total?: number;
  };

  payment?: {
    method?: "COD" | "UPI" | "CARD" | string;
    status?: "pending" | "paid" | "failed" | string;
    transactionId?: string;
  };

  addressSnapshot?: {
    fullName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
};

function safeName(u: ProfileUser | null) {
  return u?.fullName || u?.name || "User";
}

function safeEmail(u: ProfileUser | null) {
  return u?.email || "";
}

function safeAvatar(u: ProfileUser | null) {
  return (
    u?.avatar ||
    (u?.email
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.email)}`
      : "https://via.placeholder.com/150")
  );
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(Number(n || 0));
}

function formatDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function statusBadge(status?: string) {
  const s = (status || "placed").toLowerCase();
  if (s === "delivered") return "bg-green-500/10 text-green-600";
  if (s === "shipped" || s === "in_transit") return "bg-blue-500/10 text-blue-600";
  if (s === "cancelled") return "bg-destructive/10 text-destructive";
  return "bg-primary/10 text-primary";
}

export default function Profile() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    "profile" | "orders" | "wishlist" | "addresses" | "payments" | "settings"
  >("profile");

  const tabs = useMemo(
    () => [
      { id: "profile", label: "My Profile", icon: User },
      { id: "orders", label: "My Orders", icon: Package },
      { id: "addresses", label: "Addresses", icon: MapPin },
      { id: "settings", label: "Settings", icon: Settings },
    ],
    []
  );

  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // ✅ FRONTEND PAGINATION (Orders)
  const ORDERS_PER_PAGE = 3; // ✅ updated from 5 -> 3
  const [ordersPage, setOrdersPage] = useState(1);

  const ordersTotalPages = useMemo(() => {
    const total = orders.length;
    return Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
  }, [orders.length]);

  const paginatedOrders = useMemo(() => {
    const page = Math.min(Math.max(1, ordersPage), ordersTotalPages);
    const start = (page - 1) * ORDERS_PER_PAGE;
    const end = start + ORDERS_PER_PAGE;
    return orders.slice(start, end);
  }, [orders, ordersPage, ordersTotalPages]);

  useEffect(() => {
    setOrdersPage((p) => Math.min(Math.max(1, p), ordersTotalPages));
  }, [ordersTotalPages]);

  const reloadAll = async () => {
    const token = getToken();
    if (!token) {
      toast.error("Please login");
      navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const [profileRes, addrRes, ordersRes] = await Promise.all([
        apiFetch("/profile"),
        apiFetch("/addresses"),
        apiFetch("/orders"),
      ]);

      const profileJson: ApiResponse<any> = await profileRes.json().catch(() => ({}));
      if (!profileRes.ok || profileJson.success === false) {
        const msg = profileJson?.message || "Session expired. Please login again.";
        if (profileRes.status === 401 || profileRes.status === 403) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem("midrange_user");
          toast.error(msg);
          navigate("/login");
          return;
        }
        toast.error(msg);
      } else {
        const u = profileJson.data || profileJson.customer || null;
        setUser(u);
      }

      const addrJson: ApiResponse<Address[]> = await addrRes.json().catch(() => ({}));
      setAddresses(addrRes.ok && addrJson.success !== false && Array.isArray(addrJson.data) ? addrJson.data : []);

      const ordersJson: ApiResponse<Order[]> = await ordersRes.json().catch(() => ({}));
      if (ordersRes.ok && ordersJson.success !== false) {
        const list = Array.isArray(ordersJson.data) ? ordersJson.data : [];
        setOrders(list);
        setOrdersPage(1);
      } else {
        setOrders([]);
        setOrdersPage(1);
      }
    } catch {
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch("/logout", { method: "POST" }).catch(() => null);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("midrange_user");
      toast.success("Logged out");
      navigate("/login");
    }
  };

  const setDefaultAddress = async (id: string) => {
    try {
      const res = await apiFetch(`/addresses/${id}/default`, { method: "PATCH" });
      const json: ApiResponse<any> = await res.json().catch(() => ({}));

      if (!res.ok || json.success === false) {
        toast.error(json?.message || "Failed to set default address");
        return;
      }

      toast.success("Default address updated");
      const r2 = await apiFetch("/addresses");
      const j2: ApiResponse<Address[]> = await r2.json().catch(() => ({}));
      setAddresses(Array.isArray(j2.data) ? j2.data : []);
    } catch {
      toast.error("Failed to set default address");
    }
  };

  // page buttons (max 5)
  const pageButtons = useMemo(() => {
    const total = ordersTotalPages;
    const current = ordersPage;

    const maxButtons = 5;
    if (total <= maxButtons) return Array.from({ length: total }, (_, i) => i + 1);

    const start = Math.max(1, Math.min(current - 2, total - (maxButtons - 1)));
    return Array.from({ length: maxButtons }, (_, i) => start + i);
  }, [ordersTotalPages, ordersPage]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-28">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">Unable to load profile.</p>
          <Button variant="gold" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
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
            <span className="text-muted-foreground">My Account</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
              <div className="p-6 border-b border-border/30 text-center">
                <div className="relative inline-block mb-4">
                  <img
                    src={safeAvatar(user)}
                    alt={safeName(user)}
                    className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
                  />
                  <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-semibold text-foreground">{safeName(user)}</h3>
                  {user.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : null}
                </div>

                <p className="text-sm text-muted-foreground">{safeEmail(user)}</p>

                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {(user.membershipBadge || "Standard") + " Member"}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-600">
                    {user.loyaltyPoints || 0} pts
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                  <div className="bg-surface-1 rounded-lg p-3 border border-border/40">
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="text-lg font-bold text-foreground">
                      {user.totalOrders ?? orders.length ?? 0}
                    </p>
                  </div>
                  <div className="bg-surface-1 rounded-lg p-3 border border-border/40">
                    <p className="text-xs text-muted-foreground">Spent</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatINR(user.totalSpent || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (tab.id === "orders") setOrdersPage(1);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-destructive hover:bg-destructive/10 transition-colors mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="lg:col-span-3">
            {/* PROFILE */}
            {activeTab === "profile" && (
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Personal Information</h2>
                  <Button variant="outline" size="sm" onClick={reloadAll}>
                    Refresh
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Full Name</label>
                    <Input value={safeName(user)} disabled className="bg-secondary" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Email</label>
                    <Input value={safeEmail(user)} disabled className="bg-secondary" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Phone</label>
                    <Input value={user.phone || ""} disabled className="bg-secondary" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Membership</label>
                    <Input value={(user.membershipLevel || "standard").toString()} disabled className="bg-secondary" />
                  </div>
                </div>
              </div>
            )}

            {/* ORDERS (3 per page) */}
            {activeTab === "orders" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold text-foreground">My Orders</h2>
                  <Button variant="outline" size="sm" onClick={reloadAll}>
                    Refresh
                  </Button>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-card rounded-xl border border-border/50 p-6 text-muted-foreground">
                    No orders found.
                  </div>
                ) : (
                  <>
                    {paginatedOrders.map((order) => {
                      const first = order.items?.[0];
                      const moreCount = Math.max(0, (order.items?.length || 0) - 1);

                      return (
                        <div
                          key={order._id}
                          className="bg-card rounded-xl border border-border/50 overflow-hidden"
                        >
                          <div className="bg-surface-1 p-4 flex flex-wrap items-center justify-between gap-4 border-b border-border/30">
                            <div className="flex flex-wrap items-center gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Order ID</p>
                                <p className="font-semibold text-foreground">
                                  #{order._id.slice(-6).toUpperCase()}
                                </p>
                              </div>

                              <div className="hidden sm:block h-8 w-px bg-border/50" />

                              <div>
                                <p className="text-sm text-muted-foreground">Placed on</p>
                                <p className="font-medium text-foreground">{formatDate(order.createdAt)}</p>
                              </div>

                              <div className="hidden sm:block h-8 w-px bg-border/50" />

                              <div>
                                <p className="text-sm text-muted-foreground">Total</p>
                                <p className="font-semibold text-primary">{formatINR(order.totals?.total || 0)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(order.status)}`}>
                                {order.status || "placed"}
                              </span>
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground">
                                {order.payment?.method || "COD"}
                              </span>
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="flex gap-4 items-center">
                              <img
                                src={first?.image || "https://via.placeholder.com/100"}
                                alt={first?.name || "Product"}
                                className="w-20 h-20 rounded-lg object-cover"
                              />
                              <div className="flex-1">
                                <p className="font-medium text-foreground">
                                  {first?.name || "Product"}
                                  {moreCount > 0 ? (
                                    <span className="text-sm text-muted-foreground"> (+{moreCount} more)</span>
                                  ) : null}
                                </p>

                                <p className="text-sm text-muted-foreground">
                                  Qty: {first?.quantity || 1} × {formatINR(first?.finalPrice || first?.price || 0)}
                                </p>

                                {order.addressSnapshot?.city ? (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Deliver to:{" "}
                                    <span className="text-foreground font-medium">
                                      {order.addressSnapshot.city}, {order.addressSnapshot.state}
                                    </span>
                                  </p>
                                ) : null}

                                <p className="text-xs text-muted-foreground mt-1">
                                  Payment:{" "}
                                  <span className="text-foreground font-medium">
                                    {order.payment?.status || "pending"}
                                  </span>
                                </p>
                              </div>

                              <Button variant="outline" size="sm" onClick={() => navigate(`/order-success/${order._id}`)}>
                                View
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pagination Controls */}
                    <div className="bg-card rounded-xl border border-border/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        Showing{" "}
                        <span className="text-foreground font-medium">
                          {(ordersPage - 1) * ORDERS_PER_PAGE + 1}–
                          {Math.min(ordersPage * ORDERS_PER_PAGE, orders.length)}
                        </span>{" "}
                        of <span className="text-foreground font-medium">{orders.length}</span> orders
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ordersPage <= 1}
                          onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                        >
                          Prev
                        </Button>

                        <div className="hidden sm:flex items-center gap-2">
                          {pageButtons.map((p) => (
                            <Button
                              key={p}
                              variant={p === ordersPage ? "gold" : "outline"}
                              size="sm"
                              onClick={() => setOrdersPage(p)}
                            >
                              {p}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ordersPage >= ordersTotalPages}
                          onClick={() => setOrdersPage((p) => Math.min(ordersTotalPages, p + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ADDRESSES */}
            {activeTab === "addresses" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Saved Addresses</h2>
                  <Button variant="outline" size="sm" onClick={() => navigate("/checkout")}>
                    Add New Address
                  </Button>
                </div>

                {addresses.length === 0 ? (
                  <div className="bg-card rounded-xl border border-border/50 p-6 text-muted-foreground">
                    No addresses saved.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {addresses.map((a) => (
                      <div
                        key={a._id}
                        className={`bg-card rounded-xl border p-5 ${
                          a.isDefault ? "border-primary/50" : "border-border/50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {a.isDefault ? (
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                                Default
                              </span>
                            ) : null}
                            <span className="font-medium text-foreground">{a.fullName}</span>
                          </div>

                          {!a.isDefault ? (
                            <Button variant="ghost" size="sm" onClick={() => setDefaultAddress(a._id)}>
                              Set Default
                            </Button>
                          ) : null}
                        </div>

                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ""}
                          {a.landmark ? `, ${a.landmark}` : ""}
                          <br />
                          {a.city}, {a.state} - {a.pincode}
                          <br />
                          Phone: {a.phone}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST */}
            {activeTab === "wishlist" && (
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">My Wishlist</h2>
                <p className="text-muted-foreground">Your wishlist is empty.</p>
              </div>
            )}

            {/* PAYMENTS */}
            {activeTab === "payments" && (
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Payment Methods</h2>
                <p className="text-muted-foreground">No saved payment methods.</p>
              </div>
            )}

            {/* SETTINGS */}
            {activeTab === "settings" && (
              <div className="bg-card rounded-xl border border-border/50 p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Account Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border/30">
                    <div>
                      <p className="font-medium text-foreground">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates about orders and promotions</p>
                    </div>
                    <input type="checkbox" defaultChecked className="accent-primary" />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/30">
                    <div>
                      <p className="font-medium text-foreground">SMS Alerts</p>
                      <p className="text-sm text-muted-foreground">Get delivery updates via SMS</p>
                    </div>
                    <input type="checkbox" defaultChecked className="accent-primary" />
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}
