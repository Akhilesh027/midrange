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
  Loader2,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useCart, CartProduct } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { toast } from "@/hooks/use-toast";

const API_BASE = "https://api.jsgallor.com/api";

type ApiVariant = {
  _id?: string;
  attributes: {
    size?: string;
    color?: string;
    fabric?: string;
  };
  sku: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  image?: string;
};

type ProductDB = {
  _id: string;
  name: string;
  category: string;
  description?: string;
  shortDescription?: string;
  price: number;
  discount?: number;
  gst?: number;                 // ✅ ADDED
  isCustomized?: boolean;       // ✅ ADDED
  quantity: number;
  availability: "In Stock" | "Low Stock" | "Out of Stock";
  status: "pending" | "approved" | "rejected";
  tier: "affordable" | "mid_range" | "luxury";
  image: string;
  galleryImages?: string[];
  material?: string;
  color?: string | string[];
  size?: string | string[];
  fabricTypes?: string[];
  extraPillows?: number;
  hasVariants?: boolean;
  variants?: ApiVariant[];
  deliveryTime?: string;
};

type UiProduct = {
  id: string;
  _id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;           // original product price (without discount)
  discountPercent: number;
  gst: number;                 // ✅ ADDED
  isCustomized: boolean;       // ✅ ADDED
  image: string;
  images: string[];
  colors: string[];
  sizes: string[];
  fabrics: string[];
  totalStock: number;
  material: string;
  extraPillows?: number;
  hasVariants: boolean;
  variants?: ApiVariant[];
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

/**
 * Correct discount logic:
 * - Discount applies only to the base product price.
 * - Variant price = basePrice + adjustment (could be positive or negative).
 * - Final price = discountedBasePrice + (variantPrice - basePrice)
 */
function computeFinalPrice(
  basePrice: number,
  discountPercent: number,
  variantPrice?: number
): { originalPrice: number; finalPrice: number; discountAmount: number } {
  const safeBase = Number(basePrice) || 0;
  const safeDiscount = Number(discountPercent) || 0;
  const discountedBase = safeBase * (1 - safeDiscount / 100);
  const original = variantPrice !== undefined ? Number(variantPrice) : safeBase;
  const final =
    variantPrice !== undefined
      ? discountedBase + (Number(variantPrice) - safeBase)
      : discountedBase;
  const discountAmount = original - final;
  return { originalPrice: original, finalPrice: final, discountAmount };
}

function getToken() {
  return localStorage.getItem("midrange_token");
}

function toArray(value?: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,|]/g).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function isHexColor(v: string) {
  return /^#([0-9a-fA-F]{3}){1,2}$/.test(v.trim());
}

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

function mapDbToUiProduct(p: ProductDB): UiProduct {
  const images = p.galleryImages && p.galleryImages.length > 0
    ? [p.image, ...p.galleryImages]
    : [p.image];

  const colors = toArray(p.color);
  const sizes = toArray(p.size);
  const fabrics = Array.isArray(p.fabricTypes) ? p.fabricTypes : (p.fabricTypes ? [p.fabricTypes] : []);

  const hasVariants = p.hasVariants && Array.isArray(p.variants) && p.variants.length > 0;

  let totalQty = 0;
  if (hasVariants && p.variants) {
    totalQty = p.variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
  } else {
    totalQty = Number(p.quantity ?? 0);
  }

  return {
    id: p._id,
    _id: p._id,
    name: p.name,
    category: p.category,
    description: p.description || p.shortDescription || "",
    basePrice: Number(p.price) || 0,
    discountPercent: Number(p.discount) || 0,
    gst: Number(p.gst) || 0,               // ✅ ADDED
    isCustomized: p.isCustomized || false, // ✅ ADDED
    image: p.image,
    images,
    colors,
    sizes,
    fabrics,
    totalStock: totalQty,
    material: p.material || "—",
    extraPillows: p.extraPillows,
    hasVariants,
    variants: p.variants,
    deliveryTime: p.deliveryTime,
  };
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, loading: wishlistLoading } = useWishlist();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productDb, setProductDb] = useState<ProductDB | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>("");

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedFabric, setSelectedFabric] = useState<string | null>(null);

  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

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

          // Auto-select first available options
          if (p.hasVariants && p.variants) {
            const firstVariant = p.variants[0];
            if (firstVariant) {
              setSelectedColor(firstVariant.attributes.color || null);
              setSelectedSize(firstVariant.attributes.size || null);
              setSelectedFabric(firstVariant.attributes.fabric || null);
            }
          } else {
            const ui = mapDbToUiProduct(p);
            if (ui.colors.length === 1) setSelectedColor(ui.colors[0]);
            if (ui.sizes.length === 1) setSelectedSize(ui.sizes[0]);
          }
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

  const uiProduct = useMemo(() => {
    return productDb ? mapDbToUiProduct(productDb) : null;
  }, [productDb]);

  const selectedVariant = useMemo(() => {
    if (!uiProduct?.hasVariants || !uiProduct.variants) return null;

    const match = uiProduct.variants.find(v => {
      const colorMatch = !selectedColor || v.attributes.color === selectedColor;
      const sizeMatch = !selectedSize || v.attributes.size === selectedSize;
      const fabricMatch = !selectedFabric || v.attributes.fabric === selectedFabric;
      return colorMatch && sizeMatch && fabricMatch;
    });
    return match || null;
  }, [uiProduct, selectedColor, selectedSize, selectedFabric]);

  // Compute correct price with discount on base + variant adjustment
  const { originalPrice, finalPrice, discountAmount } = useMemo(() => {
    if (!uiProduct) return { originalPrice: 0, finalPrice: 0, discountAmount: 0 };
    const variantPrice = selectedVariant?.price;
    return computeFinalPrice(
      uiProduct.basePrice,
      uiProduct.discountPercent,
      variantPrice
    );
  }, [uiProduct, selectedVariant]);

  const displayStock = useMemo(() => {
    if (selectedVariant) return selectedVariant.quantity;
    return uiProduct?.totalStock || 0;
  }, [uiProduct, selectedVariant]);

  const inStock = displayStock > 0;

  const displayImage = useMemo(() => {
    if (selectedVariant?.image) return selectedVariant.image;
    return selectedImage || uiProduct?.image || "";
  }, [selectedVariant, selectedImage, uiProduct]);

  const availableColors = useMemo(() => {
    if (!uiProduct?.hasVariants || !uiProduct.variants) return uiProduct?.colors || [];
    const colors = new Set<string>();
    uiProduct.variants.forEach(v => {
      if (v.attributes.color) colors.add(v.attributes.color);
    });
    return Array.from(colors);
  }, [uiProduct]);

  const availableSizes = useMemo(() => {
    if (!uiProduct?.hasVariants || !uiProduct.variants) return uiProduct?.sizes || [];
    const sizes = new Set<string>();
    uiProduct.variants.forEach(v => {
      if (v.attributes.size) sizes.add(v.attributes.size);
    });
    return Array.from(sizes);
  }, [uiProduct]);

  const availableFabrics = useMemo(() => {
    if (!uiProduct?.hasVariants || !uiProduct.variants) return uiProduct?.fabrics || [];
    const fabrics = new Set<string>();
    uiProduct.variants.forEach(v => {
      if (v.attributes.fabric) fabrics.add(v.attributes.fabric);
    });
    return Array.from(fabrics);
  }, [uiProduct]);

  const images = useMemo(() => {
    if (!uiProduct) return [];
    const list = [uiProduct.image, ...(uiProduct.images || [])].filter(Boolean);
    return Array.from(new Set(list));
  }, [uiProduct]);

  const rating = 4.5;
  const reviews = 120;

  const requireColor = availableColors.length > 1;
  const requireSize = availableSizes.length > 1;
  const requireFabric = availableFabrics.length > 1;

  const isWishlisted = uiProduct ? isInWishlist(uiProduct._id) : false;
  const isWishlistLoading = wishlistLoading || isTogglingWishlist;

  const handleWishlistToggle = async () => {
    if (!uiProduct) return;
    setIsTogglingWishlist(true);
    try {
      if (isWishlisted) {
        await removeFromWishlist(uiProduct._id);
        toast({ title: "Removed from wishlist", description: `${uiProduct.name} removed.` });
      } else {
        await addToWishlist(uiProduct as any);
        toast({ title: "Added to wishlist", description: `${uiProduct.name} added to wishlist.` });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update wishlist. Please try again." });
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  const validateSelections = () => {
    if (uiProduct?.hasVariants) {
      if (requireColor && !selectedColor) {
        toast({ title: "Select a color", description: "Please choose a color to continue." });
        return false;
      }
      if (requireSize && !selectedSize) {
        toast({ title: "Select a size", description: "Please choose a size to continue." });
        return false;
      }
      if (requireFabric && !selectedFabric) {
        toast({ title: "Select a fabric", description: "Please choose a fabric to continue." });
        return false;
      }
      if (!selectedVariant) {
        toast({ title: "Invalid combination", description: "The selected combination is not available." });
        return false;
      }
    }
    return true;
  };

  const handleAddToCart = async () => {
    if (!uiProduct) return;
    if (!validateSelections()) return;
    if (!inStock) {
      toast({ title: "Out of stock", description: "This product is currently unavailable." });
      return;
    }

    const attributes: { size?: string; color?: string; fabric?: string } = {};
    if (selectedSize) attributes.size = selectedSize;
    if (selectedColor) attributes.color = selectedColor;
    if (selectedFabric) attributes.fabric = selectedFabric;

    // Prepare cart product with correct pricing, GST, and customization flag
    const cartProduct = {
      id: uiProduct._id,
      name: uiProduct.name,
      category: uiProduct.category,
      basePrice: uiProduct.basePrice,
      price: originalPrice,           // display original price (with variant upcharge)
      finalPrice: finalPrice,         // discounted price
      discountPercent: uiProduct.discountPercent,
      discountAmount: discountAmount,
      gst: uiProduct.gst,             // ✅ ADDED
      isCustomized: uiProduct.isCustomized, // ✅ ADDED
      image: uiProduct.image,
      galleryImages: uiProduct.images,
      material: uiProduct.material,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
      fabric: selectedFabric || undefined,
      availability: inStock ? "In Stock" : "Out of Stock",
      stockQty: displayStock,
      description: uiProduct.description,
      variantSku: selectedVariant?.sku,
    };

    await addToCart(cartProduct, quantity, selectedVariant, attributes);

    toast({
      title: "Added to cart",
      description: `${quantity}x ${uiProduct.name}${
        selectedColor ? ` • Color: ${getColorName(selectedColor)}` : ""
      }${selectedSize ? ` • Size: ${selectedSize}` : ""}${selectedFabric ? ` • Fabric: ${selectedFabric}` : ""} added.`,
    });
  };

  const handleBuyNow = async () => {
    if (!uiProduct) return;
    if (!validateSelections()) return;
    if (!getToken()) {
      toast({ title: "Login required", description: "Please login to continue checkout." });
      navigate(`/login?redirect=/checkout`);
      return;
    }
    if (!inStock) {
      toast({ title: "Out of stock", description: "This product is currently unavailable." });
      return;
    }

    const attributes: { size?: string; color?: string; fabric?: string } = {};
    if (selectedSize) attributes.size = selectedSize;
    if (selectedColor) attributes.color = selectedColor;
    if (selectedFabric) attributes.fabric = selectedFabric;

    const cartProduct = {
      id: uiProduct._id,
      name: uiProduct.name,
      category: uiProduct.category,
      basePrice: uiProduct.basePrice,
      price: originalPrice,
      finalPrice: finalPrice,
      discountPercent: uiProduct.discountPercent,
      discountAmount: discountAmount,
      gst: uiProduct.gst,             // ✅ ADDED
      isCustomized: uiProduct.isCustomized, // ✅ ADDED
      image: uiProduct.image,
      galleryImages: uiProduct.images,
      material: uiProduct.material,
      color: selectedColor || undefined,
      size: selectedSize || undefined,
      fabric: selectedFabric || undefined,
      availability: inStock ? "In Stock" : "Out of Stock",
      stockQty: displayStock,
      description: uiProduct.description,
      variantSku: selectedVariant?.sku,
    };

    await addToCart(cartProduct, quantity, selectedVariant, attributes);
    toast({ title: "Proceeding to checkout", description: `${quantity}x ${uiProduct.name} added.` });
    navigate("/checkout");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
        {/* Breadcrumb */}
        <nav className="bg-[#4b5e29] py-3 border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Link to="/" className="text-[#eef4df] hover:underline">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-[#d6dfbd]" />
              <Link to="/products" className="text-[#eef4df] hover:underline">
                Products
              </Link>
              <ChevronRight className="w-4 h-4 text-[#d6dfbd]" />
              <span className="text-[#d6dfbd]">{uiProduct?.name || "Product"}</span>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              <div className="aspect-square rounded-xl bg-white/5 animate-pulse" />
              <div className="space-y-4">
                <div className="h-6 w-1/3 bg-white/5 rounded animate-pulse" />
                <div className="h-10 w-2/3 bg-white/5 rounded animate-pulse" />
                <div className="h-6 w-1/2 bg-white/5 rounded animate-pulse" />
                <div className="h-24 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-12 w-full bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ) : error || !uiProduct ? (
            <div className="text-center py-16">
              <p className="text-red-300 mb-3">{error || "Product not found"}</p>
              <Link to="/products">
                <Button
                  variant="outline"
                  className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                >
                  Back to Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Image Section */}
              <div className="space-y-4">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#4b5e29]">
                  <img
                    src={displayImage}
                    alt={uiProduct.name}
                    className="w-full h-full object-cover"
                  />
                  {uiProduct.discountPercent > 0 && (
                    <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded">
                      -{uiProduct.discountPercent}%
                    </span>
                  )}
                  {/* ✅ Customizable Badge */}
                  {uiProduct.isCustomized && (
                    <span className="absolute top-4 right-4 bg-amber-500 text-white text-sm font-bold px-3 py-1 rounded">
                      Customizable
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
                        displayImage === img
                          ? "border-[#eef4df]"
                          : "border-transparent hover:border-[#d6dfbd]"
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
                  <p className="text-sm text-[#eef4df] mb-2">{uiProduct.category}</p>
                  <h1 className="text-2xl md:text-3xl font-bold text-[#f4f7ec] mb-3">
                    {uiProduct.name}
                  </h1>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(rating)
                              ? "fill-[#eef4df] text-[#eef4df]"
                              : "text-[#d6dfbd]/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-[#d6dfbd]">
                      {rating} ({reviews} reviews)
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-3 flex-wrap">
                    {discountAmount > 0 && (
                      <span className="text-sm text-[#d6dfbd] line-through">
                        {formatINR(originalPrice)}
                      </span>
                    )}
                    <span className="text-3xl font-bold text-[#eef4df]">
                      {formatINR(finalPrice)}
                    </span>
                    {discountAmount > 0 && (
                      <span className="text-sm text-[#d6dfbd]">
                        You save {formatINR(discountAmount)}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[#d6dfbd]">{uiProduct.description}</p>

                {/* Color Selection */}
                {availableColors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#f4f7ec]">Color</p>
                      {selectedColor ? (
                        <p className="text-xs text-[#d6dfbd]">{getColorName(selectedColor)}</p>
                      ) : requireColor ? (
                        <p className="text-xs text-red-300">Required</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableColors.map((c) => {
                        const selected = selectedColor === c;
                        const isHex = isHexColor(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedColor(c)}
                            className={`relative h-10 rounded-lg border transition-all ${
                              selected ? "border-[#eef4df]" : "border-white/10 hover:border-[#d6dfbd]/40"
                            } ${isHex ? "w-10" : "px-3"}`}
                            aria-label={`Select color ${c}`}
                            title={getColorName(c)}
                          >
                            {isHex ? (
                              <span
                                className="absolute inset-1 rounded-md"
                                style={{ backgroundColor: c }}
                              />
                            ) : (
                              <span className="text-sm text-[#f4f7ec]">{getColorName(c)}</span>
                            )}
                            {selected && (
                              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#eef4df] text-[#3f4f22] flex items-center justify-center">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Size Selection */}
                {availableSizes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#f4f7ec]">Size</p>
                      {selectedSize ? (
                        <p className="text-xs text-[#d6dfbd]">{selectedSize}</p>
                      ) : requireSize ? (
                        <p className="text-xs text-red-300">Required</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map((s) => {
                        const selected = selectedSize === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSelectedSize(s)}
                            className={`h-10 px-3 rounded-lg border text-sm transition-all ${
                              selected
                                ? "border-[#eef4df] bg-[#eef4df]/10 text-[#f4f7ec]"
                                : "border-white/10 hover:border-[#d6dfbd]/40 text-[#d6dfbd] hover:text-[#f4f7ec]"
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Fabric Selection */}
                {availableFabrics.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#f4f7ec]">Fabric</p>
                      {selectedFabric ? (
                        <p className="text-xs text-[#d6dfbd] capitalize">{selectedFabric}</p>
                      ) : requireFabric ? (
                        <p className="text-xs text-red-300">Required</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableFabrics.map((f) => {
                        const selected = selectedFabric === f;
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setSelectedFabric(f)}
                            className={`h-10 px-3 rounded-lg border text-sm transition-all capitalize ${
                              selected
                                ? "border-[#eef4df] bg-[#eef4df]/10 text-[#f4f7ec]"
                                : "border-white/10 hover:border-[#d6dfbd]/40 text-[#d6dfbd] hover:text-[#f4f7ec]"
                            }`}
                          >
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Details */}
                <div className="bg-[#4b5e29] rounded-lg p-4 space-y-3">
                  <div className="flex">
                    <span className="w-32 text-[#d6dfbd] text-sm">Material</span>
                    <span className="text-[#f4f7ec] text-sm">{uiProduct.material || "-"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-[#d6dfbd] text-sm">GST</span>
                    <span className="text-[#f4f7ec] text-sm">{uiProduct.gst}%</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-[#d6dfbd] text-sm">Availability</span>
                    <span
                      className={`text-sm ${
                        inStock
                          ? "text-green-300"
                          : displayStock <= 0
                          ? "text-red-300"
                          : "text-yellow-500"
                      }`}
                    >
                      {inStock ? "In Stock" : displayStock > 0 ? "Low Stock" : "Out of Stock"}
                      {` (${displayStock})`}
                    </span>
                  </div>
                </div>

               {/* ✅ Customize Button (if customizable) */}
{uiProduct.isCustomized && (
  <div>
    <Button
      variant="outline"
      className="w-full border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
      onClick={() => {
        const message = `Hi, I'm interested in customizing this product:%0A%0A*Name:* ${encodeURIComponent(uiProduct.name)}%0A*ID:* ${uiProduct._id}%0A%0ACan you please share customization options?`;
        window.open(`https://wa.me/917075848516?text=${message}`, '_blank');
      }}
    >
      ✨ Customize This Product
    </Button>
    <p className="text-xs text-[#d6dfbd] mt-2">
      Choose size, color, fabric, and add personal touches.
    </p>
  </div>
)}

                {/* Quantity & Actions */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#d6dfbd]">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-[#eef4df]"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-semibold text-[#f4f7ec]">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(displayStock, quantity + 1))}
                        className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-[#eef4df]"
                        disabled={quantity >= displayStock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]"
                      onClick={handleAddToCart}
                      disabled={!inStock || (uiProduct.hasVariants && !selectedVariant)}
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Add to Cart
                    </Button>

                    <Button
                      variant="default"
                      size="lg"
                      className="flex-1 bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]"
                      onClick={handleBuyNow}
                      disabled={!inStock || (uiProduct.hasVariants && !selectedVariant)}
                    >
                      Buy Now
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 border border-white/10 hover:bg-white/10 text-[#d6dfbd] hover:text-[#f4f7ec] relative"
                      onClick={handleWishlistToggle}
                      disabled={isWishlistLoading}
                    >
                      {isWishlistLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Heart
                          className={`w-5 h-5 transition-all ${
                            isWishlisted ? "fill-[#eef4df] text-[#eef4df]" : ""
                          }`}
                        />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  {[
                    { icon: Truck, title: "Free Delivery", desc: "Orders over ₹10K" },
                    { icon: Shield, title: "2 Year Warranty", desc: "Full coverage" },
                    { icon: RotateCcw, title: "30 Day Returns", desc: "Easy returns" },
                  ].map((feature) => (
                    <div key={feature.title} className="text-center">
                      <feature.icon className="w-6 h-6 text-[#eef4df] mx-auto mb-2" />
                      <p className="text-xs font-medium text-[#f4f7ec]">{feature.title}</p>
                      <p className="text-xs text-[#d6dfbd]">{feature.desc}</p>
                    </div>
                  ))}
                </div>

                {uiProduct.deliveryTime && uiProduct.deliveryTime.trim() && (
                  <div className="text-sm text-[#d6dfbd]">
                    Delivery Time:{" "}
                    <span className="font-medium text-[#f4f7ec]">{uiProduct.deliveryTime}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;