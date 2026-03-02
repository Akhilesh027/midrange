// src/pages/Products.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronRight, SlidersHorizontal, Search, X } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ✅ products + categories APIs
const API_PRODUCTS = "https://api.jsgallor.com/api/midrange/products";
const API_ADMIN = "https://api.jsgallor.com/api/admin";

// ---------- types ----------
type ProductDB = {
  _id: string;
  name: string;
  category: string; // slug
  subcategory?: string; // slug
  price: number;
  image: string;
  galleryImages?: string[];
  material?: string;
  color?: string;
  status?: string;
  tier?: string;
  availability?: string;
  quantity?: number;
  description?: string;
  shortDescription?: string;
};

type CartProduct = {
  id: string;
  name: string;
  category: string; // slug
  subcategory?: string; // slug
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
};

const DISCOUNT_PERCENT = 10;
const norm = (s?: string) => String(s || "").trim().toLowerCase();

function computeDiscount(price: number, percent: number) {
  const discountAmount = Math.round((Number(price || 0) * percent) / 100);
  const finalPrice = Number(price || 0) - discountAmount;
  return { discountAmount, finalPrice };
}

function mapDbToUI(p: ProductDB): CartProduct {
  const { discountAmount, finalPrice } = computeDiscount(p.price, DISCOUNT_PERCENT);

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

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ supports BOTH:
  // 1) /products?cat=dining&sub=chairs
  // 2) /categories/dining or /categories/dining/chairs
  const { categorySlug, subSlug } = useParams() as {
    categorySlug?: string;
    subSlug?: string;
  };

  // URL sources (priority: path params > query params)
  const urlCategory = categorySlug || searchParams.get("cat") || "";
  const urlSub = subSlug || searchParams.get("sub") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rawProducts, setRawProducts] = useState<ProductDB[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState(urlSub);
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ✅ categories for building dropdowns (segment=all + segment=midrange)
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  // keep local selects in sync if URL changes
  useEffect(() => {
    setSelectedCategory(urlCategory);
    setSelectedSubcategory(urlSub);
  }, [urlCategory, urlSub]);

  // ✅ fetch categories (for midrange)
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

        merged = merged
          .filter((c) => {
            if (c.status && c.status !== "active") return false;
            if (typeof c.showOnWebsite === "boolean" && !c.showOnWebsite) return false;

            // ✅ keep this only if you *really* set showInNavbar on admin
            // if it hides everything, comment it out
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

  const parentCats = useMemo(() => cats.filter((c) => !c.parentId), [cats]);

  const selectedParentObj = useMemo(() => {
    if (!selectedCategory) return null;
    return parentCats.find((p) => p.slug === selectedCategory) || null;
  }, [parentCats, selectedCategory]);

  const subCatsOfSelected = useMemo(() => {
    if (!selectedParentObj) return [];
    return cats
      .filter((c) => String(c.parentId) === String(selectedParentObj.id))
      .sort(
        (a, b) =>
          Number(a.order || 0) - Number(b.order || 0) ||
          a.name.localeCompare(b.name)
      );
  }, [cats, selectedParentObj]);

  // ✅ fetch products with server-side category/subcategory
  useEffect(() => {
    let alive = true;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams();
        if (selectedCategory) qs.set("category", selectedCategory);
        if (selectedCategory && selectedSubcategory) qs.set("subcategory", selectedSubcategory);

        const url = qs.toString() ? `${API_PRODUCTS}?${qs.toString()}` : API_PRODUCTS;

        const res = await fetch(url, { headers: { "Content-Type": "application/json" } });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load products");
        }

        const json = await res.json().catch(() => ({}));
        const list: ProductDB[] = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.products)
          ? json.products
          : Array.isArray(json)
          ? json
          : [];

        if (alive) setRawProducts(list);
      } catch (e: any) {
        if (alive) setError(e?.message || "Something went wrong");
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      alive = false;
    };
  }, [selectedCategory, selectedSubcategory]);

  // ✅ Map to UI product type
  const products = useMemo(() => rawProducts.map(mapDbToUI), [rawProducts]);

  // ✅ Filters lists from loaded products
  const materials = useMemo(() => {
    const set = new Set(products.map((p) => p.material).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [products]);

  const colors = useMemo(() => {
    const set = new Set(products.map((p) => p.color).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [products]);

  // ✅ client-side filters (search/material/color)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMaterial = !selectedMaterial || p.material === selectedMaterial;
      const matchesColor = !selectedColor || p.color === selectedColor;
      return matchesSearch && matchesMaterial && matchesColor;
    });
  }, [products, searchTerm, selectedMaterial, selectedColor]);

  const activeFilters = [
    selectedCategory,
    selectedSubcategory,
    selectedMaterial,
    selectedColor,
    searchTerm,
  ].filter(Boolean).length;

  // ✅ Keep query params in sync (for /products route).
  // If you're on /categories/:slug route, you can still use query params for "sub".
  const syncUrl = (cat: string, sub: string) => {
    const next = new URLSearchParams(searchParams);
    if (cat) next.set("cat", cat);
    else next.delete("cat");
    if (sub) next.set("sub", sub);
    else next.delete("sub");
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedMaterial("");
    setSelectedColor("");
    setSearchTerm("");
    syncUrl("", "");
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedSubcategory("");
    syncUrl(cat, "");
  };

  const handleSubcategoryChange = (sub: string) => {
    setSelectedSubcategory(sub);
    syncUrl(selectedCategory, sub);
  };

  const pageTitle = useMemo(() => {
    const parentName = selectedParentObj?.name || "Products";
    const subName = subCatsOfSelected.find((s) => s.slug === selectedSubcategory)?.name;
    if (subName) return `${parentName} / ${subName}`;
    if (selectedParentObj) return parentName;
    return "Our Collection";
  }, [selectedParentObj, selectedSubcategory, subCatsOfSelected]);

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
            <span className="text-muted-foreground">Products</span>
            {selectedCategory ? (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{selectedParentObj?.name || selectedCategory}</span>
              </>
            ) : null}
            {selectedSubcategory ? (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {subCatsOfSelected.find((s) => s.slug === selectedSubcategory)?.name || selectedSubcategory}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-card rounded-xl border border-border/50 p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-foreground">Filters</h3>
                {activeFilters > 0 && (
                  <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                    Clear all
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="relative mb-5">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-secondary border-border/50"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>

              {/* Category */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">{catLoading ? "Loading..." : "All Categories"}</option>
                  {parentCats.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-foreground mb-2">Subcategory</label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => handleSubcategoryChange(e.target.value)}
                  disabled={!selectedCategory || subCatsOfSelected.length === 0}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                >
                  <option value="">
                    {!selectedCategory
                      ? "Select category first"
                      : subCatsOfSelected.length
                      ? "All Subcategories"
                      : "No subcategories"}
                  </option>
                  {subCatsOfSelected.map((sub) => (
                    <option key={sub.id} value={sub.slug}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-foreground mb-2">Material</label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">All Materials</option>
                  {materials.map((mat) => (
                    <option key={mat} value={mat}>
                      {mat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-foreground mb-2">Color</label>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">All Colors</option>
                  {colors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="gold"
                className="w-full"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Apply Filters
                {activeFilters > 0 && (
                  <span className="ml-2 bg-primary-foreground/20 px-2 py-0.5 rounded text-xs">
                    {activeFilters}
                  </span>
                )}
              </Button>
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <p className="text-muted-foreground text-sm">
              {loading ? "Loading..." : `${filteredProducts.length} products`}
            </p>
            <Button variant="outline" onClick={() => setIsFilterOpen(true)} className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilters > 0 && (
                <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs">
                  {activeFilters}
                </span>
              )}
            </Button>
          </div>

          {/* Mobile Filter Drawer */}
          {isFilterOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={() => setIsFilterOpen(false)}
              />
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l border-border p-5 overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-foreground">Filters</h3>
                  <button onClick={() => setIsFilterOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-secondary"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground"
                    >
                      <option value="">{catLoading ? "Loading..." : "All Categories"}</option>
                      {parentCats.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Subcategory</label>
                    <select
                      value={selectedSubcategory}
                      onChange={(e) => handleSubcategoryChange(e.target.value)}
                      disabled={!selectedCategory || subCatsOfSelected.length === 0}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground disabled:opacity-60"
                    >
                      <option value="">
                        {!selectedCategory
                          ? "Select category first"
                          : subCatsOfSelected.length
                          ? "All Subcategories"
                          : "No subcategories"}
                      </option>
                      {subCatsOfSelected.map((sub) => (
                        <option key={sub.id} value={sub.slug}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Material</label>
                    <select
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground"
                    >
                      <option value="">All Materials</option>
                      {materials.map((mat) => (
                        <option key={mat} value={mat}>
                          {mat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Color</label>
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground"
                    >
                      <option value="">All Colors</option>
                      {colors.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={clearFilters} className="flex-1">
                      Clear
                    </Button>
                    <Button variant="gold" onClick={() => setIsFilterOpen(false)} className="flex-1">
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{pageTitle}</h1>
              <p className="hidden lg:block text-muted-foreground text-sm">
                {loading ? "Loading..." : `${filteredProducts.length} products`}
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 mb-6">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-[320px] rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">
                  No products found matching your filters.
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
