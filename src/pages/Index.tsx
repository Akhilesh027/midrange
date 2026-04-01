import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Truck, Shield, Headphones, RefreshCcw } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { ProductSlider } from "@/components/layout/ProductSlider"; // adjust path as needed
import IdeasSection from "./ideasection";
import { useMidrangeAuth } from "@/context/MidrangeAuthContext";
import { PhoneNumberModal } from "@/components/layout/PhoneNumberModal";

// ✅ APIs
const API_PRODUCTS = "https://api.jsgallor.com/api/midrange/products";
const API_ADMIN = "https://api.jsgallor.com/api/admin";

// ---------- types ----------
type ProductDB = {
  _id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  image: string;
  galleryImages?: string[];
  material?: string;
  color?: string;
  availability?: string;
  quantity?: number;
  description?: string;
  shortDescription?: string;
};

type CartProduct = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  finalPrice: number;
  discountPercent: number;
  discountAmount: number;
  image: string;
  galleryImages: string[];
  material?: string;
  color?: string;
  availability?: string;
  stockQty?: number;
  description?: string;
};

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
  productCount?: number;
  imageUrl?: string;
};

const DISCOUNT_PERCENT = 10;
const norm = (s?: string) => String(s || "").trim().toLowerCase();

function computeDiscount(price: number, percent: number) {
  const discountAmount = Math.round((Number(price || 0) * percent) / 100);
  const finalPrice = Number(price || 0) - discountAmount;
  return { discountAmount, finalPrice };
}

function mapDbToUI(p: ProductDB): CartProduct {
  const { discountAmount, finalPrice } = computeDiscount(
    p.price,
    DISCOUNT_PERCENT
  );

  return {
    id: p._id,
    name: p.name,
    category: p.category,
    subcategory: p.subcategory,
    price: Number(p.price || 0),
    finalPrice,
    discountPercent: DISCOUNT_PERCENT,
    discountAmount,
    image: p.image,
    galleryImages: Array.isArray(p.galleryImages) ? p.galleryImages : [],
    material: p.material,
    color: p.color,
    availability: p.availability,
    stockQty: p.quantity,
    description: p.description || p.shortDescription || "",
  };
}

const FALLBACK_CAT_IMAGES: Record<string, string> = {
  "living-room":
    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80",
  bedroom:
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80",
  dining:
    "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80",
  office:
    "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&q=80",
  outdoor:
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
};

export default function Index() {
  const { user, isAuthenticated } = useMidrangeAuth();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState<CartProduct[]>([]);
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  // Show phone modal when authenticated, no phone, and not skipped
  useEffect(() => {
    if (isAuthenticated && user && !user.phone && !sessionStorage.getItem("skipPhoneModalMid")) {
      setShowPhoneModal(true);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    let alive = true;

    const fetchFeatured = async () => {
      try {
        setLoading(true);

        const res = await fetch(`${API_PRODUCTS}?limit=4`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error("Failed to load featured products");

        const json = await res.json().catch(() => ({}));
        const list: ProductDB[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.products)
          ? json.products
          : Array.isArray(json)
          ? json
          : [];

        const mapped = list.slice(0, 4).map(mapDbToUI);
        if (alive) setFeatured(mapped);
      } catch {
        if (alive) setFeatured([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchFeatured();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const fetchCats = async () => {
      try {
        setCatLoading(true);

        const urls = [
          `${API_ADMIN}/categories?segment=all&status=active&level=parent&sort=order&limit=200`,
          `${API_ADMIN}/categories?segment=midrange&status=active&level=parent&sort=order&limit=200`,
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
            if (
              typeof c.showOnWebsite === "boolean" &&
              !c.showOnWebsite
            )
              return false;

            const seg = norm(c.segment);
            if (seg !== "all" && seg !== "midrange") return false;
            return true;
          })
          .sort(
            (a, b) =>
              Number(a.order || 0) - Number(b.order || 0) ||
              a.name.localeCompare(b.name)
          );

        if (alive) setCats(merged);
      } catch {
        if (alive) setCats([]);
      } finally {
        if (alive) setCatLoading(false);
      }
    };

    fetchCats();
    return () => {
      alive = false;
    };
  }, []);

  // Prepare slider products from the featured array (first 4)
  const sliderProducts = useMemo(() => {
    return featured.slice(0, 4).map(p => ({
      id: p.id,
      name: p.name,
      image: p.image,
      price: { old: p.price, new: p.finalPrice }
    }));
  }, [featured]);

  return (
    <Layout>
      <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#4f622b] via-[#556b2f] to-[#3f4f22]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_25%)]" />

          <div className="container relative mx-auto px-4 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6 animate-fade-in">
                <span className="inline-block px-4 py-1.5 rounded-full bg-[#f3f6ea]/10 text-[#eef4df] text-sm font-medium border border-[#f3f6ea]/20 shadow-sm">
                  New Collection 2025
                </span>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#f8fbf2] leading-tight tracking-tight">
                  Mid-Range Furniture{" "}
                  <span className="text-[#e3eccb]">
                    Crafted for Modern Homes
                  </span>
                </h1>

                <p className="text-lg text-[#d8e2bf] max-w-lg leading-relaxed">
                  Thoughtful design, sustainable materials, and smart pricing —
                  furniture that fits your space and budget perfectly.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2] shadow-md"
                  >
                    <Link to="/products">
                      Explore Collection
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                  >
                    <Link to="/products">View Catalog</Link>
                  </Button>
                </div>
              </div>

              <div
                className="relative animate-slide-up"
                style={{ animationDelay: "0.2s" }}
              >
                {loading ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-800 h-[400px] md:h-[500px] flex items-center justify-center">
                    <p className="text-white/60">Loading products...</p>
                  </div>
                ) : sliderProducts.length > 0 ? (
                  <ProductSlider products={sliderProducts} autoSlideInterval={10000} />
                ) : (
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-800 h-[400px] md:h-[500px] flex items-center justify-center">
                    <p className="text-white/60">No products available</p>
                  </div>
                )}

                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-[#eef4df]/10 blur-3xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/10 blur-3xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-[#4b5e29] py-12 border-y border-white/10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                {
                  icon: Truck,
                  title: "Free Delivery",
                  desc: "On All Orders",
                },
                {
                  icon: Shield,
                  title: "5 Year Warranty",
                  desc: "On all furniture",
                },
                {
                  icon: Headphones,
                  title: "24/7 Support",
                  desc: "Expert assistance",
                },
                { icon: RefreshCcw, title: "Only Replacement", desc: "Replacement available for damaged items" },
              ].map((feature, idx) => (
                <div
                  key={feature.title}
                  className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/10 border border-white/10 shadow-sm animate-fade-in hover:bg-white/15 transition-colors"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-full bg-[#eef4df]/10 flex items-center justify-center mb-3 border border-white/10">
                    <feature.icon className="w-6 h-6 text-[#eef4df]" />
                  </div>
                  <h3 className="font-semibold text-[#f6f9ef] text-sm">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-[#d7e1be]">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <IdeasSection />

        {/* Featured Products */}
        <section className="py-16 md:py-24 bg-[#556b2f]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#f7faef]">
                  Featured Collection
                </h2>
                <p className="text-[#d6dfbd] mt-1">
                  Handpicked pieces for your home
                </p>
              </div>

              <Button
                asChild
                variant="outline"
                className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
              >
                <Link to="/products">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[340px] rounded-xl bg-white/10 animate-pulse"
                  />
                ))}
              </div>
            ) : featured.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featured.map((product, idx) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <ProductCard product={product as any} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-[#d6dfbd]">
                No featured products found.
              </div>
            )}
          </div>
        </section>

        {/* Categories Banner */}
        <section className="py-16 bg-[#4b5e29]">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#f7faef] text-center mb-8">
              Shop by Category
            </h2>

            {catLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl overflow-hidden aspect-square bg-white/10 animate-pulse"
                  />
                ))}
              </div>
            ) : cats.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {cats.slice(0, 10).map((cat, idx) => {
                  const img =
                    cat.imageUrl ||
                    FALLBACK_CAT_IMAGES[cat.slug] ||
                    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80";

                  return (
                    <Link
                      key={cat.id}
                      to={`/categories/${cat.slug}`}
                      className="group relative rounded-xl overflow-hidden aspect-square animate-fade-in shadow-md"
                      style={{ animationDelay: `${idx * 0.08}s` }}
                    >
                      <img
                        src={img}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#151b0c]/90 via-[#151b0c]/35 to-transparent" />
                      <div className="absolute inset-0 flex items-end p-4">
                        <h3 className="font-semibold text-[#f3f7e6] group-hover:text-[#dfe9c8] transition-colors">
                          {cat.name}
                        </h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-[#d6dfbd]">
                No categories found.
              </div>
            )}
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-16 md:py-24 bg-[#3f4f22]">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-[#f7faef] mb-4">
                Stay Updated
              </h2>
              <p className="text-[#d6dfbd] mb-6">
                Subscribe to get exclusive offers, design tips, and new arrivals
                straight to your inbox.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-[#eef4df] focus:outline-none focus:ring-1 focus:ring-[#eef4df] text-[#f7faef] placeholder:text-[#d5dfbb]"
                />
                <Button
                  size="lg"
                  className="bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2] shadow-md"
                >
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Phone Number Modal */}
      <PhoneNumberModal open={showPhoneModal} onOpenChange={setShowPhoneModal} />
    </Layout>
  );
}