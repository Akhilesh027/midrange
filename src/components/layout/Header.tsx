import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  User,
  Search,
  MapPin,
  Menu,
  X,
  LogOut,
  Settings,
  Package,
  Crown,
  Star,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useCart } from "@/context/CartContext";
import { useMidrangeAuth, useMembership } from "@/context/MidrangeAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logo from "../../Image/JSGALORE.png";

const API_ADMIN = "https://api.jsgallor.com/api/admin";

// ✅ category shape coming from admin categories api
type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  segment?: "all" | "affordable" | "midrange" | "luxury";
  parentId: string | null;
  status?: "active" | "hidden" | "disabled";
  showOnWebsite?: boolean;
  showInNavbar?: boolean;
  order?: number;
};

const norm = (s?: string) => String(s || "").trim().toLowerCase();

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ categories state (dynamic)
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  const { totalItems } = useCart();
  const { user, isAuthenticated, logout, loading } = useMidrangeAuth();
  const { level, badge, isPremium, isElite } = useMembership();
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // ✅ fetch navbar categories: segment=all + segment=midrange
  useEffect(() => {
    const fetchCats = async () => {
      try {
        setCatLoading(true);

        const urls = [
          `${API_ADMIN}/categories?segment=all&status=active&level=all&sort=order&limit=200`,
          `${API_ADMIN}/categories?segment=midrange&status=active&level=all&sort=order&limit=200`,
        ];

        const [r1, r2] = await Promise.all(urls.map((u) => fetch(u)));
        const j1 = await r1.json().catch(() => ({}));
        const j2 = await r2.json().catch(() => ({}));

        const a1: ApiCategory[] = Array.isArray(j1) ? j1 : j1?.data?.items || [];
        const a2: ApiCategory[] = Array.isArray(j2) ? j2 : j2?.data?.items || [];

        // merge unique by slug
        const map = new Map<string, ApiCategory>();
        [...a1, ...a2].forEach((c) => {
          if (!c?.slug) return;
          map.set(c.slug, c);
        });

        let merged = Array.from(map.values());

        // ✅ keep only categories that should appear in navbar
        merged = merged
          .filter((c) => {
            if (c.status && c.status !== "active") return false;
            if (typeof c.showOnWebsite === "boolean" && !c.showOnWebsite) return false;
            if (typeof c.showInNavbar === "boolean" && !c.showInNavbar) return false;

            const seg = norm(c.segment);
            if (seg !== "all" && seg !== "midrange") return false; // only all + midrange
            return true;
          })
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

        setCats(merged);
      } catch {
        setCats([]);
      } finally {
        setCatLoading(false);
      }
    };

    fetchCats();
  }, []);

  // ✅ build parents + children map for dropdown
  const parents = useMemo(() => cats.filter((c) => !c.parentId), [cats]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, ApiCategory[]>();
    cats.forEach((c) => {
      if (!c.parentId) return;
      const pid = String(c.parentId);
      const arr = map.get(pid) || [];
      arr.push(c);
      map.set(pid, arr);
    });
    // sort each child list by order/name
    for (const [k, v] of map.entries()) {
      v.sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.name.localeCompare(b.name));
      map.set(k, v);
    }
    return map;
  }, [cats]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    if (isAuthenticated) navigate("/profile");
    else navigate("/login");
    setIsUserMenuOpen(false);
  };

  const handleUserClick = () => setIsUserMenuOpen(!isUserMenuOpen);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      setIsUserMenuOpen(false);
      navigate("/");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.name ||
    user?.email ||
    "User";

  const getInitials = (fullName?: string) => {
    const safe = (fullName || "").trim();
    if (!safe) return "U";
    const parts = safe.split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || parts[0]?.[1] || "";
    return (first + second).toUpperCase() || "U";
  };

  const getMembershipColor = () => {
    switch (level) {
      case "premium":
        return "bg-gradient-to-r from-amber-500 to-yellow-500";
      case "elite":
        return "bg-gradient-to-r from-purple-600 to-pink-600";
      default:
        return "bg-gradient-to-r from-blue-500 to-cyan-500";
    }
  };

  const getMembershipIcon = () => {
    switch (level) {
      case "premium":
        return <Star className="w-3 h-3 text-amber-500" />;
      case "elite":
        return <Crown className="w-3 h-3 text-purple-500" />;
      default:
        return null;
    }
  };

  // ✅ helper to build URLs your CategoriesPage expects:
  // parent: /categories/:categorySlug
  // child : /categories/:categorySlug?sub=:subSlug
  const parentHref = (parentSlug: string) => `/categories/${parentSlug}`;
  const childHref = (parentSlug: string, childSlug: string) =>
    `/categories/${parentSlug}?sub=${encodeURIComponent(childSlug)}`;

  // Don't render while loading
  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-center">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      {/* Top bar */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg from-amber-500 to-amber-600 flex items-center justify-center font-bold text-white text-xl shadow-md shadow-amber-500/20">
              <img src={logo} alt="JS GALLOR Logo" />
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold text-foreground group-hover:text-amber-600 transition-colors">
                JS GALLOR
              </div>
              <div className="text-xs text-muted-foreground">Mid-range Furniture</div>
            </div>
          </Link>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="search"
                placeholder="Search mid-range furniture..."
                className="w-full pl-4 pr-10 bg-secondary border-border/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-amber-600 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile search toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-amber-600 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Location */}
            <button className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-amber-600 transition-colors">
              <MapPin className="w-4 h-4" />
              <span className="hidden lg:inline">Location</span>
            </button>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 text-muted-foreground hover:text-amber-600 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </Link>

            {/* User Profile - With dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={handleUserClick}
                className="p-2 text-muted-foreground hover:text-amber-600 transition-colors relative group"
              >
                {isAuthenticated && user ? (
                  <div className="relative">
                    <div
                      className={`w-8 h-8 rounded-full ${getMembershipColor()} flex items-center justify-center text-sm font-bold text-white shadow-sm`}
                    >
                      {getInitials(displayName)}
                    </div>
                    {isPremium && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                        {getMembershipIcon()}
                      </div>
                    )}
                  </div>
                ) : (
                  <User className="w-5 h-5" />
                )}
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-5">
                  {isAuthenticated && user ? (
                    <>
                      {/* User Info */}
                      <div className="p-4 border-b border-border/50">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-full ${getMembershipColor()} flex items-center justify-center text-lg font-bold text-white shadow-md`}
                          >
                            {getInitials(displayName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground truncate">
                                {displayName}
                              </p>
                              {getMembershipIcon()}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  level === "elite"
                                    ? "bg-purple-500/10 text-purple-600"
                                    : level === "premium"
                                    ? "bg-amber-500/10 text-amber-600"
                                    : "bg-blue-500/10 text-blue-600"
                                }`}
                              >
                                {badge} Member
                              </span>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-500" />
                                <span className="text-xs font-medium">
                                  {user.loyaltyPoints} pts
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        <button
                          onClick={handleProfileClick}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 rounded-md transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span>My Profile</span>
                          {user.isVerified && (
                            <span className="ml-auto text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                              Verified
                            </span>
                          )}
                        </button>

                        <Link
                          to="/orders"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 rounded-md transition-colors"
                        >
                          <Package className="w-4 h-4" />
                          <span>My Orders</span>
                          {user.totalOrders > 0 && (
                            <span className="ml-auto text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                              {user.totalOrders}
                            </span>
                          )}
                        </Link>

                        <Link
                          to="/membership"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 rounded-md transition-colors"
                        >
                          <Crown className="w-4 h-4" />
                          <span>Membership</span>
                          {!isPremium && (
                            <span className="ml-auto text-xs bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                              Upgrade
                            </span>
                          )}
                        </Link>

                        <Link
                          to="/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 rounded-md transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>

                        <div className="border-t border-border/50 my-2"></div>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Sign in to access premium features
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => {
                            navigate("/login");
                            setIsUserMenuOpen(false);
                          }}
                          variant="default"
                          size="sm"
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                        >
                          Sign In
                        </Button>
                        <Button
                          onClick={() => {
                            navigate("/signup");
                            setIsUserMenuOpen(false);
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                        >
                          Create Account
                        </Button>
                      </div>
                      <div className="mt-4 text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Join to get:</p>
                        <ul className="space-y-1">
                          <li className="flex items-center gap-2">
                            <Star className="w-3 h-3 text-amber-500" />
                            <span>Loyalty rewards</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Package className="w-3 h-3 text-amber-500" />
                            <span>Order tracking</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span>Membership benefits</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-amber-600 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {isSearchOpen && (
          <div className="md:hidden pb-4 animate-in fade-in slide-in-from-top">
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="search"
                placeholder="Search mid-range furniture..."
                className="w-full bg-secondary border-border/50 focus:border-amber-500"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-amber-600 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation - Desktop */}
      <nav className="hidden md:block border-t border-border/30 bg-surface-1/80 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-1">
            {catLoading && parents.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">Loading categories…</li>
            ) : parents.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">No categories</li>
            ) : (
              parents.map((parent) => {
                const children = childrenByParent.get(String(parent.id)) || [];
                const parentActive = location.pathname === parentHref(parent.slug);

                return (
                  <li key={parent.id} className="relative group">
                    <Link
                      to={parentHref(parent.slug)}
                      className={`block px-4 py-3 text-sm font-medium transition-colors relative ${
                        parentActive ? "text-amber-600" : "text-foreground hover:text-amber-600"
                      }`}
                    >
                      {parent.name}
                      {parentActive && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"></span>
                      )}
                    </Link>

                    {/* Dropdown */}
                    {children.length > 0 && (
                      <div className="absolute left-0 top-full invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-50">
                        <div className="pt-2">
                          <ul className="bg-card border border-border rounded-lg shadow-xl min-w-[200px] py-2 backdrop-blur-sm">
                            <li>
                              <Link
                                to={parentHref(parent.slug)}
                                className="block px-4 py-2 text-sm font-medium text-foreground hover:text-amber-600 hover:bg-muted/50 transition-colors"
                              >
                                All in {parent.name}
                              </Link>
                            </li>
                            <div className="border-t border-border/50 my-1" />
                            {children.map((child) => (
                              <li key={child.id}>
                                <Link
                                  to={childHref(parent.slug, child.slug)}
                                  className="block px-4 py-2 text-sm text-muted-foreground hover:text-amber-600 hover:bg-muted/50 transition-colors"
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })
            )}

            {/* keep your extra links */}
            <li>
              <Link
                to="/exclusive"
                className={`block px-4 py-3 text-sm font-medium transition-colors relative ${
                  location.pathname.includes("exclusive")
                    ? "text-purple-600"
                    : "text-purple-600 hover:text-purple-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-3 h-3" />
                  <span>Exclusive</span>
                </div>
              </Link>
            </li>
            <li>
              <Link
                to="/sale"
                className={`block px-4 py-3 text-sm font-bold transition-colors ${
                  location.pathname.includes("sale") ? "text-red-600" : "text-red-600 hover:text-red-500"
                }`}
              >
                Sale
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border animate-in slide-in-from-top">
          <nav className="container mx-auto px-4 py-4">
            <ul className="space-y-1">
              {parents.map((parent) => {
                const children = childrenByParent.get(String(parent.id)) || [];
                return (
                  <li key={parent.id}>
                    <Link
                      to={parentHref(parent.slug)}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block py-3 px-3 rounded-md transition-colors ${
                        location.pathname === parentHref(parent.slug)
                          ? "bg-amber-500/10 text-amber-600"
                          : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {parent.name}
                    </Link>

                    {children.length > 0 && (
                      <div className="ml-3 mb-2 border-l border-border/50">
                        {children.map((child) => (
                          <Link
                            key={child.id}
                            to={childHref(parent.slug, child.slug)}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block py-2 px-3 text-sm text-muted-foreground hover:text-amber-600 hover:bg-muted/50 rounded-md"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}

              <li>
                <Link
                  to="/exclusive"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-3 px-3 rounded-md text-purple-600 hover:bg-purple-500/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    <span>Exclusive</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link
                  to="/sale"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block py-3 px-3 rounded-md font-bold ${
                    location.pathname.includes("sale")
                      ? "bg-red-500/10 text-red-600"
                      : "text-red-600 hover:bg-red-500/10"
                  }`}
                >
                  Sale
                </Link>
              </li>
            </ul>

            {/* Mobile User Actions */}
            <div className="pt-4 mt-4 border-t border-border/50">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-3 px-3 rounded-md text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    My Profile
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-3 px-3 rounded-md text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Package className="w-5 h-5" />
                    My Orders
                  </Link>
                  <Link
                    to="/membership"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-3 px-3 rounded-md text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Crown className="w-5 h-5" />
                    Membership
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full py-3 px-3 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      navigate("/login");
                      setIsMobileMenuOpen(false);
                    }}
                    variant="default"
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => {
                      navigate("/signup");
                      setIsMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                  >
                    Create Account
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
