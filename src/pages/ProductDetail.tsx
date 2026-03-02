// src/pages/ProductDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  Star,
  Minus,
  Plus,
  ShoppingCart,
  Heart,
  Truck,
  Shield,
  RotateCcw,
  Check,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useCart, CartProduct } from "@/context/CartContext";
import { toast } from "@/hooks/use-toast";

const API_BASE = "https://api.jsgallor.com/api";
const DISCOUNT_PERCENT = 10;

type ProductDB = {
  _id: string;
  name: string;
  category: string;
  description?: string;
  shortDescription?: string;

  price: number;
  quantity: number;
  availability: "In Stock" | "Low Stock" | "Out of Stock";

  status: "pending" | "approved" | "rejected";
  tier: "affordable" | "mid_range" | "luxury";

  image: string;
  galleryImages?: string[];

  material?: string;

  // in your schema these are strings; we’ll treat them as either single or CSV list
  color?: string; // e.g. "#4A4A4A" OR "#000,#fff"
  size?: string;  // e.g. "300" OR "S,M,L"

  deliveryTime?: string;
};

function formatINR(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function computeDiscount(price: number, percent: number) {
  const discountAmount = Math.round((Number(price || 0) * percent) / 100);
  const finalPrice = Number(price || 0) - discountAmount;
  return { discountAmount, finalPrice };
}

function getToken() {
  return localStorage.getItem("midrange_token");
}

function splitOptions(raw?: string) {
  if (!raw) return [];
  // supports "#000,#fff" OR "#000 | #fff" OR "S, M, L"
  return String(raw)
    .split(/[,|]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isHexColor(v: string) {
  return /^#([0-9a-fA-F]{3}){1,2}$/.test(v.trim());
}

function mapDbToCartProduct(
  p: ProductDB,
  selectedColor?: string,
  selectedSize?: string
): CartProduct {
  const { discountAmount, finalPrice } = computeDiscount(p.price, DISCOUNT_PERCENT);

  return {
    id: p._id,
    name: p.name,
    category: p.category,

    price: Number(p.price || 0),
    finalPrice,
    discountPercent: DISCOUNT_PERCENT,
    discountAmount,

    image: p.image,
    galleryImages: Array.isArray(p.galleryImages) ? p.galleryImages : [],

    material: p.material,
    // store the user’s selection (fallback to product value if single)
    color: selectedColor || p.color,
    // @ts-expect-error (depends on your CartProduct type; keep if you already allow)
    size: selectedSize,

    availability: p.availability,
    stockQty: p.quantity,

    description: p.description || p.shortDescription || "",
  };
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productDb, setProductDb] = useState<ProductDB | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>("");

  // ✅ NEW: selections
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  // ✅ fetch product by id
  useEffect(() => {
    let alive = true;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id) throw new Error("Product id missing");

        const res = await fetch(`${API_BASE}/midrange/products/${id}`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load product");
        }

        const json = await res.json();
        const p: ProductDB = json?.data ?? json;

        if (!p || p.tier !== "mid_range" || p.status !== "approved") {
          throw new Error("Product not available");
        }

        if (alive) {
          setProductDb(p);
          setSelectedImage(p.image);

          // ✅ Auto-select if only one option exists
          const colorOpts = splitOptions(p.color);
          const sizeOpts = splitOptions(p.size);

          setSelectedColor(colorOpts.length === 1 ? colorOpts[0] : "");
          setSelectedSize(sizeOpts.length === 1 ? sizeOpts[0] : "");
        }
      } catch (e: any) {
        if (alive) setError(e?.message || "Something went wrong");
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      alive = false;
    };
  }, [id]);

  const colorOptions = useMemo(() => splitOptions(productDb?.color), [productDb?.color]);
  const sizeOptions = useMemo(() => splitOptions(productDb?.size), [productDb?.size]);

  const product = useMemo(() => {
    return productDb ? mapDbToCartProduct(productDb, selectedColor, selectedSize) : null;
  }, [productDb, selectedColor, selectedSize]);

  const images = useMemo(() => {
    if (!product) return [];
    const list = [product.image, ...(product.galleryImages || [])].filter(Boolean);
    return Array.from(new Set(list));
  }, [product]);

  const rating = 4.5;
  const reviews = 120;

  const requireColor = colorOptions.length > 1; // if multiple, user must pick
  const requireSize = sizeOptions.length > 1;

  const validateSelections = () => {
    if (requireColor && !selectedColor) {
      toast({ title: "Select a color", description: "Please choose a color to continue." });
      return false;
    }
    if (requireSize && !selectedSize) {
      toast({ title: "Select a size", description: "Please choose a size to continue." });
      return false;
    }
    return true;
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (!validateSelections()) return;

    if (product.availability === "Out of Stock" || (product.stockQty ?? 1) <= 0) {
      toast({ title: "Out of stock", description: "This product is currently unavailable." });
      return;
    }

    await addToCart(product, quantity);

    toast({
      title: "Added to cart",
      description: `${quantity}x ${product.name}${
        selectedColor ? ` • Color: ${selectedColor}` : ""
      }${selectedSize ? ` • Size: ${selectedSize}` : ""} added.`,
    });
  };

  const handleBuyNow = async () => {
    if (!product) return;

    if (!validateSelections()) return;

    if (!getToken()) {
      toast({ title: "Login required", description: "Please login to continue checkout." });
      navigate(`/login?redirect=/checkout`);
      return;
    }

    if (product.availability === "Out of Stock" || (product.stockQty ?? 1) <= 0) {
      toast({ title: "Out of stock", description: "This product is currently unavailable." });
      return;
    }

    await addToCart(product, quantity);

    toast({
      title: "Proceeding to checkout",
      description: `${quantity}x ${product.name} added.`,
    });

    navigate("/checkout");
  };

  return (
    <Layout>
      {/* Breadcrumb */}
      <nav className="bg-surface-1 py-3 border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Link to="/" className="text-primary hover:underline">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Link to="/products" className="text-primary hover:underline">
              Products
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{product?.name || "Product"}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div className="aspect-square rounded-xl bg-muted animate-pulse" />
            <div className="space-y-4">
              <div className="h-6 w-1/3 bg-muted rounded animate-pulse" />
              <div className="h-10 w-2/3 bg-muted rounded animate-pulse" />
              <div className="h-6 w-1/2 bg-muted rounded animate-pulse" />
              <div className="h-24 w-full bg-muted rounded animate-pulse" />
              <div className="h-12 w-full bg-muted rounded animate-pulse" />
            </div>
          </div>
        ) : error || !product ? (
          <div className="text-center py-16">
            <p className="text-destructive mb-3">{error || "Product not found"}</p>
            <Link to="/products">
              <Button variant="outline">Back to Products</Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Section */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-card">
                <img
                  src={selectedImage || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />

                {product.discountPercent > 0 && (
                  <span className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1 rounded">
                    -{product.discountPercent}%
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              <div className="flex gap-3 flex-wrap">
                {images.map((img) => (
                  <button
                    key={img}
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === img
                        ? "border-primary"
                        : "border-transparent hover:border-muted"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Info Section */}
            <div className="space-y-6">
              <div>
                <p className="text-sm text-primary mb-2">{product.category}</p>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(rating)
                            ? "fill-primary text-primary"
                            : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {rating} ({reviews} reviews)
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-sm text-muted-foreground line-through">
                    {formatINR(product.price)}
                  </span>
                  <span className="text-3xl font-bold text-primary">
                    {formatINR(product.finalPrice)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    You save{" "}
                    <span className="font-semibold text-foreground">
                      {formatINR(product.discountAmount)}
                    </span>
                  </span>
                </div>
              </div>

              <p className="text-muted-foreground">{product.description}</p>

              {/* ✅ NEW: Color selector */}
              {colorOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Color</p>
                    {selectedColor ? (
                      <p className="text-xs text-muted-foreground">{selectedColor}</p>
                    ) : requireColor ? (
                      <p className="text-xs text-destructive">Required</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((c) => {
                      const selected = selectedColor === c;
                      const isHex = isHexColor(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(c)}
                          className={`relative h-10 rounded-lg border transition-all ${
                            selected ? "border-primary" : "border-border/50 hover:border-muted-foreground/40"
                          } ${isHex ? "w-10" : "px-3"}`}
                          aria-label={`Select color ${c}`}
                          title={c}
                        >
                          {isHex ? (
                            <span
                              className="absolute inset-1 rounded-md"
                              style={{ backgroundColor: c }}
                            />
                          ) : (
                            <span className="text-sm text-foreground">{c}</span>
                          )}

                          {selected && (
                            <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ✅ NEW: Size selector */}
              {sizeOptions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Size</p>
                    {selectedSize ? (
                      <p className="text-xs text-muted-foreground">{selectedSize}</p>
                    ) : requireSize ? (
                      <p className="text-xs text-destructive">Required</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sizeOptions.map((s) => {
                      const selected = selectedSize === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSize(s)}
                          className={`h-10 px-3 rounded-lg border text-sm transition-all ${
                            selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border/50 hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="bg-card rounded-lg p-4 space-y-3">
                <div className="flex">
                  <span className="w-32 text-muted-foreground text-sm">Material</span>
                  <span className="text-foreground text-sm">{product.material || "-"}</span>
                </div>

                <div className="flex">
                  <span className="w-32 text-muted-foreground text-sm">Availability</span>
                  <span
                    className={`text-sm ${
                      product.availability === "In Stock"
                        ? "text-green-500"
                        : product.availability === "Low Stock"
                        ? "text-amber-600"
                        : "text-destructive"
                    }`}
                  >
                    {product.availability || "—"}
                    {typeof product.stockQty === "number" ? ` (${product.stockQty})` : ""}
                  </span>
                </div>
              </div>

              {/* Quantity & Actions */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={handleAddToCart}
                    disabled={product.availability === "Out of Stock"}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                  </Button>

                  {/* If you want Buy Now enable it */}
                  {/* <Button
                    variant="default"
                    size="lg"
                    className="flex-1"
                    onClick={handleBuyNow}
                    disabled={product.availability === "Out of Stock"}
                  >
                    Buy Now
                  </Button> */}

                  <Button variant="ghost" size="icon" className="h-12 w-12">
                    <Heart className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                {[
                  { icon: Truck, title: "Free Delivery", desc: "Orders over ₹10K" },
                  { icon: Shield, title: "2 Year Warranty", desc: "Full coverage" },
                  { icon: RotateCcw, title: "30 Day Returns", desc: "Easy returns" },
                ].map((feature) => (
                  <div key={feature.title} className="text-center">
                    <feature.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-xs font-medium text-foreground">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                ))}
              </div>

              {/* Optional Delivery */}
              {productDb?.deliveryTime && productDb.deliveryTime.trim() && (
                <div className="text-sm text-muted-foreground">
                  Delivery Time:{" "}
                  <span className="font-medium text-foreground">{productDb.deliveryTime}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetail;
