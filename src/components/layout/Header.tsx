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
  Loader2,
  Heart,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo, FormEvent } from "react";
import { useCart } from "@/context/CartContext";
import { useMidrangeAuth, useMembership } from "@/context/MidrangeAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logo from "../../Image/JSGALORE.png";

const API_ADMIN = "https://api.jsgallor.com/api/admin";

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

  // Location state
  const [location, setLocation] = useState<{
    city?: string;
    loading: boolean;
    error?: string;
  }>({ loading: false });

  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  const { totalItems } = useCart();
  const { user, isAuthenticated, logout, loading } = useMidrangeAuth();
  const { level, badge, isPremium } = useMembership();
  const locationObj = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Search handler
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setIsSearchOpen(false); // close mobile search drawer
  };

  // Get user location
  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setLocation({ loading: false, error: "Geolocation not supported" });
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocation({ loading: true });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await res.json();
          const city = data.city || data.locality || data.principalSubdivision || "Unknown";
          setLocation({ city, loading: false });
          toast.success(`Location detected: ${city}`);
        } catch (error) {
          setLocation({ loading: false, error: "Failed to get city name" });
          toast.error("Could not determine your city");
        }
      },
      (error) => {
        let msg = "Location access denied";
        if (error.code === error.TIMEOUT) msg = "Location request timed out";
        else if (error.code === error.POSITION_UNAVAILABLE) msg = "Location unavailable";
        setLocation({ loading: false, error: msg });
        toast.error(msg);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

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

        const map = new Map<string, ApiCategory>();
        [...a1, ...a2].forEach((c) => {
          if (!c?.slug) return;
          map.set(c.slug, c);
        });

        let merged = Array.from(map.values());

        merged = merged
          .filter((c) => {
            if (c.status && c.status !== "active") return false;
            if (typeof c.showOnWebsite === "boolean" && !c.showOnWebsite) return false;
            if (typeof c.showInNavbar === "boolean" && !c.showInNavbar) return false;

            const seg = norm(c.segment);
            if (seg !== "all" && seg !== "midrange") return false;
            return true;
          })
          .sort(
            (a, b) =>
              Number(a.order || 0) - Number(b.order || 0) ||
              a.name.localeCompare(b.name)
          );

        setCats(merged);
      } catch {
        setCats([]);
      } finally {
        setCatLoading(false);
      }
    };

    fetchCats();
  }, []);

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

    for (const [k, v] of map.entries()) {
      v.sort(
        (a, b) =>
          Number(a.order || 0) - Number(b.order || 0) ||
          a.name.localeCompare(b.name)
      );
      map.set(k, v);
    }
    return map;
  }, [cats]);

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
        return "bg-gradient-to-r from-[#c69b3c] to-[#e0b84f]";
      case "elite":
        return "bg-gradient-to-r from-[#6b4fa3] to-[#a05ccf]";
      default:
        return "bg-gradient-to-r from-[#6e8b3d] to-[#88a84c]";
    }
  };

  const getMembershipIcon = () => {
    switch (level) {
      case "premium":
        return <Star className="w-3 h-3 text-[#d8a93a]" />;
      case "elite":
        return <Crown className="w-3 h-3 text-[#8f5cc2]" />;
      default:
        return null;
    }
  };

  const parentHref = (parentSlug: string) => `/categories/${parentSlug}`;
  const childHref = (parentSlug: string, childSlug: string) =>
    `/categories/${parentSlug}?sub=${encodeURIComponent(childSlug)}`;

  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-[#556b2f]/95 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-center">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f3deb0]/20 to-[#f3deb0]/10 animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-[#556b2f]/95 backdrop-blur-md border-b border-white/10 text-[#f7ecd7]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md overflow-hidden border border-white/10 bg-[#4d602c]">
              <img src={logo} alt="JS GALLOR Logo" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold text-[#f7ecd7] group-hover:text-[#ffe8b3] transition-colors">
                JSGALLOR
              </div>
              <div className="text-xs text-[#cdbf9e]">Mid-range Furniture</div>
            </div>
          </Link>

          {/* Desktop search form */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="search"
                placeholder="Search mid-range furniture..."
                className="w-full pl-4 pr-10 bg-white/10 border-white/15 text-[#f7ecd7] placeholder:text-[#cdbf9e] focus:border-[#f3deb0] focus:ring-1 focus:ring-[#f3deb0]/20"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#cdbf9e] hover:text-[#ffe8b3] transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden p-2 text-[#cdbf9e] hover:text-[#ffe8b3] transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            <div className="hidden md:flex items-center gap-2">
              <a
                href="https://essentialstudio.jsgallor.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-white/20 text-[#f7ecd7] hover:bg-white/10 transition-colors"
              >
                Essentials Studio
              </a>

              <a
                href="https://celestialiving.jsgallor.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-white/20 text-[#f7ecd7] hover:bg-white/10 transition-colors"
              >
                Celestia Living
              </a>
            </div>
            <Link to="/wishlist" className="relative text-[#d6dfbd] hover:text-[#eef4df] transition-colors">
              <Heart className="h-5 w-5" />
            </Link>
            {/* Location button with live detection */}
            <button
              onClick={getUserLocation}
              disabled={location.loading}
              className="hidden sm:flex items-center gap-1 text-sm text-[#cdbf9e] hover:text-[#ffe8b3] transition-colors disabled:opacity-50"
            >
              {location.loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              <span className="hidden lg:inline">
                {location.loading
                  ? "Detecting..."
                  : location.city
                  ? location.city
                  : location.error
                  ? "Location off"
                  : "Detect location"}
              </span>
            </button>

            <Link
              to="/cart"
              className="relative p-2 text-[#cdbf9e] hover:text-[#ffe8b3] transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#f3deb0] text-[#3f4f22] text-xs font-bold flex items-center justify-center shadow-sm">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </Link>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={handleUserClick}
                className="p-2 text-[#cdbf9e] hover:text-[#ffe8b3] transition-colors relative group"
              >
                {isAuthenticated && user ? (
                  <div className="relative">
                    <div
                      className={`w-8 h-8 rounded-full ${getMembershipColor()} flex items-center justify-center text-sm font-bold text-white shadow-sm`}
                    >
                      {getInitials(displayName)}
                    </div>
                    {isPremium && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#f3deb0] flex items-center justify-center shadow">
                        {getMembershipIcon()}
                      </div>
                    )}
                  </div>
                ) : (
                  <User className="w-5 h-5" />
                )}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#4b5e29] border border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-5 overflow-hidden">
                  {isAuthenticated && user ? (
                    <>
                      <div className="p-4 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-full ${getMembershipColor()} flex items-center justify-center text-lg font-bold text-white shadow-md`}
                          >
                            {getInitials(displayName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[#f7ecd7] truncate">
                                {displayName}
                              </p>
                              {getMembershipIcon()}
                            </div>
                            <p className="text-xs text-[#cdbf9e] truncate">{user.email}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  level === "elite"
                                    ? "bg-[#8f5cc2]/15 text-[#eadfff]"
                                    : level === "premium"
                                    ? "bg-[#d8a93a]/15 text-[#ffe8b3]"
                                    : "bg-[#f3deb0]/15 text-[#f3deb0]"
                                }`}
                              >
                                {badge} Member
                              </span>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-[#d8a93a]" />
                                <span className="text-xs font-medium text-[#f7ecd7]">
                                  {user.loyaltyPoints} pts
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          onClick={handleProfileClick}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#f7ecd7] hover:bg-white/10 rounded-md transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span>My Profile</span>
                          {user.isVerified && (
                            <span className="ml-auto text-xs bg-green-500/15 text-green-200 px-2 py-0.5 rounded-full">
                              Verified
                            </span>
                          )}
                        </button>
                        
                        {/* Mobile buttons */}
                        <div className="flex flex-col gap-2 mb-4">
                          <a
                            href="https://essentialstudio.jsgallor.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full text-center px-4 py-2 text-sm rounded-lg border border-white/20 text-[#f7ecd7] hover:bg-white/10 transition-colors"
                          >
                            Essentials Studio
                          </a>

                          <a
                            href="https://celestialiving.jsgallor.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full text-center px-4 py-2 text-sm rounded-lg border border-white/20 text-[#f7ecd7] hover:bg-white/10 transition-colors"
                          >
                            Celestia Living
                          </a>
                        </div>
                        <Link
                          to="/orders"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#f7ecd7] hover:bg-white/10 rounded-md transition-colors"
                        >
                          <Package className="w-4 h-4" />
                          <span>My Orders</span>
                          {user.totalOrders > 0 && (
                            <span className="ml-auto text-xs bg-[#f3deb0]/15 text-[#ffe8b3] px-2 py-0.5 rounded-full">
                              {user.totalOrders}
                            </span>
                          )}
                        </Link>

                        <div className="border-t border-white/10 my-2" />

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#ffb4b4] hover:bg-red-500/10 rounded-md transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4">
                      <p className="text-sm text-[#cdbf9e] mb-4">
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
                          className="w-full bg-[#f3deb0] text-[#3f4f22] hover:bg-[#e7d29d]"
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
                          className="w-full border-[#e7d8b4]/30 text-[#f7ecd7] hover:bg-white/10"
                        >
                          Create Account
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-[#cdbf9e] hover:text-[#ffe8b3] transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search drawer */}
        {isSearchOpen && (
          <div className="md:hidden pb-4 animate-in fade-in slide-in-from-top">
            <form onSubmit={handleSearch} className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="search"
                placeholder="Search mid-range furniture..."
                className="w-full bg-white/10 border-white/15 text-[#f7ecd7] placeholder:text-[#cdbf9e] focus:border-[#f3deb0]"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#cdbf9e] hover:text-[#ffe8b3] transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* FULL SCREEN MOBILE MENU with solid background */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-full min-h-[100dvh] bg-[#4b5e29] overflow-y-auto">
            <div className="container mx-auto px-4 py-6 min-h-[100dvh] flex flex-col">
              <div className="flex justify-end">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-[#cdbf9e] hover:text-[#ffe8b3] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-8 py-8">
                {/* Categories */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#cdbf9e] mb-4 text-center">
                    Categories
                  </h3>
                  {catLoading ? (
                    <div className="text-sm text-[#cdbf9e] text-center">Loading...</div>
                  ) : parents.length === 0 ? (
                    <div className="text-sm text-[#cdbf9e] text-center">No categories</div>
                  ) : (
                    <ul className="space-y-3 text-center">
                      {parents.map((parent) => {
                        const children = childrenByParent.get(String(parent.id)) || [];
                        return (
                          <li key={parent.id}>
                            <Link
                              to={parentHref(parent.slug)}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block py-2 text-lg font-medium text-[#f7ecd7] hover:text-[#ffe8b3] transition-colors"
                            >
                              {parent.name}
                            </Link>
                            {children.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {children.map((child) => (
                                  <li key={child.id}>
                                    <Link
                                      to={childHref(parent.slug, child.slug)}
                                      onClick={() => setIsMobileMenuOpen(false)}
                                      className="block py-1 text-sm text-[#cdbf9e] hover:text-[#ffe8b3]"
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Collections */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#cdbf9e] mb-4 text-center">
                    Collections
                  </h3>
                  <div className="space-y-2 text-center">
                    <a
                      href="https://essentialstudio.jsgallor.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[#f7ecd7] hover:text-[#ffe8b3] text-lg"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Essentials Studio
                    </a>
                    <a
                      href="https://celestialiving.jsgallor.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[#f7ecd7] hover:text-[#ffe8b3] text-lg"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Celestia Living
                    </a>
                  </div>
                </div>

                {/* Account */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#cdbf9e] mb-4 text-center">
                    Account
                  </h3>
                  {isAuthenticated ? (
                    <div className="space-y-2 text-center">
                      <button
                        onClick={() => {
                          navigate("/profile");
                          setIsMobileMenuOpen(false);
                        }}
                        className="block w-full text-center text-[#f7ecd7] hover:text-[#ffe8b3] text-lg"
                      >
                        My Profile
                      </button>
                      <button
                        onClick={() => {
                          navigate("/orders");
                          setIsMobileMenuOpen(false);
                        }}
                        className="block w-full text-center text-[#f7ecd7] hover:text-[#ffe8b3] text-lg"
                      >
                        My Orders
                      </button>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="block w-full text-center text-[#ffb4b4] hover:text-red-300 text-lg"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-center">
                      <button
                        onClick={() => {
                          navigate("/login");
                          setIsMobileMenuOpen(false);
                        }}
                        className="block w-full text-center text-[#f7ecd7] hover:text-[#ffe8b3] text-lg"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => {
                          navigate("/signup");
                          setIsMobileMenuOpen(false);
                        }}
                        className="block w-full text-center text-[#f7ecd7] hover:text-[#ffe8b3] text-lg"
                      >
                        Create Account
                      </button>
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      getUserLocation();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={location.loading}
                    className="flex items-center justify-center gap-2 text-sm text-[#cdbf9e] hover:text-[#ffe8b3] disabled:opacity-50 mx-auto"
                  >
                    {location.loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    <span>
                      {location.loading
                        ? "Detecting..."
                        : location.city
                        ? location.city
                        : location.error
                        ? "Location off"
                        : "Detect location"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="hidden md:block border-t border-white/10 bg-[#4b5e29]/90 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-1">
            {catLoading && parents.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[#cdbf9e]">Loading categories…</li>
            ) : parents.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[#cdbf9e]">No categories</li>
            ) : (
              parents.map((parent) => {
                const children = childrenByParent.get(String(parent.id)) || [];
                const parentActive = locationObj.pathname === parentHref(parent.slug);

                return (
                  <li key={parent.id} className="relative group">
                    <Link
                      to={parentHref(parent.slug)}
                      className={`block px-4 py-3 text-sm font-medium transition-colors relative ${
                        parentActive
                          ? "text-[#ffe8b3]"
                          : "text-[#f7ecd7] hover:text-[#ffe8b3]"
                      }`}
                    >
                      {parent.name}
                      {parentActive && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#f3deb0] rounded-full" />
                      )}
                    </Link>

                    {children.length > 0 && (
                      <div className="absolute left-0 top-full invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-50">
                        <div className="pt-2">
                          <ul className="bg-[#4b5e29] border border-white/10 rounded-xl shadow-2xl min-w-[220px] py-2 backdrop-blur-sm">
                            <li>
                              <Link
                                to={parentHref(parent.slug)}
                                className="block px-4 py-2 text-sm font-medium text-[#f7ecd7] hover:text-[#ffe8b3] hover:bg-white/10 transition-colors"
                              >
                                All in {parent.name}
                              </Link>
                            </li>
                            <div className="border-t border-white/10 my-1" />
                            {children.map((child) => (
                              <li key={child.id}>
                                <Link
                                  to={childHref(parent.slug, child.slug)}
                                  className="block px-4 py-2 text-sm text-[#cdbf9e] hover:text-[#ffe8b3] hover:bg-white/10 transition-colors"
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
          </ul>
        </div>
      </nav>
    </header>
  );
};