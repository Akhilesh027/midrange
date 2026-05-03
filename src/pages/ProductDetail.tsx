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
  Share2,
  ArrowRight,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { toast } from "@/hooks/use-toast";

const API_BASE = "https://api.jsgallor.com/api";

type ApiVariant = {
  _id?: string;
  attributes: { size?: string; color?: string; fabric?: string };
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
  gst?: number;
  isCustomized?: boolean;
  quantity: number;
  availability: "In Stock" | "Low Stock" | "Out of Stock";
  status: "pending" | "approved" | "rejected";
  tier: "affordable" | "mid_range" | "luxury";
  image: string;
  galleryImages?: string[];
  material?: string;
  color?: string | string[];
  priceIncludesGst?: boolean;
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
  basePrice: number;
  discountPercent: number;
  gst: number;
  isCustomized: boolean;
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
  if (Array.isArray(value)) return value.filter(Boolean);
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
  const images = p.galleryImages?.length ? [p.image, ...p.galleryImages] : [p.image];
  const colors = toArray(p.color);
  const sizes = toArray(p.size);
  const fabrics = Array.isArray(p.fabricTypes) ? p.fabricTypes : (p.fabricTypes ? [p.fabricTypes] : []);
  const hasVariants = !!(p.hasVariants && Array.isArray(p.variants) && p.variants.length);
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
    gst: Number(p.gst) || 0,
    isCustomized: p.isCustomized || false,
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
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productDb, setProductDb] = useState<ProductDB | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<UiProduct[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedFabric, setSelectedFabric] = useState<string | null>(null);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

  // Fetch product
  useEffect(() => {
    let alive = true;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        setQuantity(1);
        if (!id) throw new Error("Product id missing");
        const res = await fetch(`${API_BASE}/midrange/products/${id}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(await res.text() || "Failed to load product");
        const json = await res.json();
        const p: ProductDB = json?.data ?? json;
        if (!p || p.tier !== "mid_range" || p.status !== "approved") {
          throw new Error("Product not available");
        }
        if (alive) {
          setProductDb(p);
          setSelectedImage(p.image);
          // ✅ NEVER pre-select any variant – clear all attributes
          if (p.hasVariants && p.variants) {
            setSelectedColor(null);
            setSelectedSize(null);
            setSelectedFabric(null);
          } else {
            const ui = mapDbToUiProduct(p);
            if (ui.colors.length === 1) setSelectedColor(ui.colors[0]);
            if (ui.sizes.length === 1) setSelectedSize(ui.sizes[0]);
            if (ui.fabrics.length === 1) setSelectedFabric(ui.fabrics[0]);
          }
        }
      } catch (e: any) {
        if (alive) setError(e?.message || "Something went wrong");
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchProduct();
    return () => { alive = false; };
  }, [id]);

  const uiProduct = useMemo(() => productDb ? mapDbToUiProduct(productDb) : null, [productDb]);

  // Fetch related products (unchanged)
  useEffect(() => {
    let alive = true;
    const fetchRelated = async () => {
      if (!uiProduct?.category || !uiProduct?._id) return;
      try {
        setRelatedLoading(true);
        const res = await fetch(`${API_BASE}/midrange/products`, { headers: { "Content-Type": "application/json" } });
        if (!res.ok) return;
        const json = await res.json();
        const products: ProductDB[] = json?.data ?? json ?? [];
        const related = products
          .filter(p => p._id !== uiProduct._id && p.category === uiProduct.category && p.tier === "mid_range" && p.status === "approved")
          .slice(0, 4)
          .map(mapDbToUiProduct);
        if (alive) setRelatedProducts(related);
      } catch (err) { console.error(err); }
      finally { if (alive) setRelatedLoading(false); }
    };
    fetchRelated();
    return () => { alive = false; };
  }, [uiProduct]);

  // Determine required attribute keys based on variants
  const requiredAttributeKeys = useMemo(() => {
    if (!uiProduct?.hasVariants || !uiProduct.variants) return [];
    const keys = new Set<string>();
    for (const v of uiProduct.variants) {
      if (v.attributes.color) keys.add("color");
      if (v.attributes.size) keys.add("size");
      if (v.attributes.fabric) keys.add("fabric");
    }
    return Array.from(keys);
  }, [uiProduct]);

  // Only consider a variant selected if ALL required attributes have non-null values
  const selectedVariant = useMemo(() => {
    if (!uiProduct?.hasVariants || !uiProduct.variants) return null;
    if (requiredAttributeKeys.includes("color") && !selectedColor) return null;
    if (requiredAttributeKeys.includes("size") && !selectedSize) return null;
    if (requiredAttributeKeys.includes("fabric") && !selectedFabric) return null;

    const match = uiProduct.variants.find(v => {
      const colorMatch = !requiredAttributeKeys.includes("color") || v.attributes.color === selectedColor;
      const sizeMatch = !requiredAttributeKeys.includes("size") || v.attributes.size === selectedSize;
      const fabricMatch = !requiredAttributeKeys.includes("fabric") || v.attributes.fabric === selectedFabric;
      return colorMatch && sizeMatch && fabricMatch;
    });
    return match || null;
  }, [uiProduct, requiredAttributeKeys, selectedColor, selectedSize, selectedFabric]);

  // Price data for base product (discounted) – always shown in UI
  const baseProductPriceData = useMemo(() => {
    if (!uiProduct) return null;
    return computeFinalPrice(uiProduct.basePrice, uiProduct.discountPercent);
  }, [uiProduct]);

  // Price data for cart (uses variant price if selected)
  const cartPriceData = useMemo(() => {
    if (!uiProduct) return null;
    if (selectedVariant) {
      return computeFinalPrice(uiProduct.basePrice, uiProduct.discountPercent, selectedVariant.price);
    }
    // Fallback (should not happen because variant is required for variant products)
    return baseProductPriceData;
  }, [uiProduct, selectedVariant, baseProductPriceData]);

  const displayStock = selectedVariant ? selectedVariant.quantity : (uiProduct?.totalStock || 0);
  const inStock = displayStock > 0;
  const displayImage = selectedVariant?.image || selectedImage || uiProduct?.image || "";

  const availableColors = useMemo(() => {
    if (!uiProduct?.variants) return uiProduct?.colors || [];
    const cols = new Set<string>();
    uiProduct.variants.forEach(v => { if (v.attributes.color) cols.add(v.attributes.color); });
    return Array.from(cols);
  }, [uiProduct]);

  const availableSizes = useMemo(() => {
    if (!uiProduct?.variants) return uiProduct?.sizes || [];
    const sz = new Set<string>();
    uiProduct.variants.forEach(v => { if (v.attributes.size) sz.add(v.attributes.size); });
    return Array.from(sz);
  }, [uiProduct]);

  const availableFabrics = useMemo(() => {
    if (!uiProduct?.variants) return uiProduct?.fabrics || [];
    const fb = new Set<string>();
    uiProduct.variants.forEach(v => { if (v.attributes.fabric) fb.add(v.attributes.fabric); });
    return Array.from(fb);
  }, [uiProduct]);

  const images = useMemo(() => {
    if (!uiProduct) return [];
    return Array.from(new Set([uiProduct.image, ...(uiProduct.images || [])]));
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

  const handleShare = async () => {
    if (!uiProduct) return;
    const url = window.location.href;
    const title = uiProduct.name;
    const text = `Check out ${uiProduct.name} on JSGALLOR! ${uiProduct.description?.slice(0, 100) || ""}`;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); }
      catch (err) { if (err instanceof Error && err.name !== "AbortError") toast({ title: "Sharing failed", description: err.message, variant: "destructive" }); }
    } else {
      try { await navigator.clipboard.writeText(url); toast({ title: "Link copied!", description: "Product link copied to clipboard." }); }
      catch (err) { toast({ title: "Copy failed", description: "Please copy the URL manually.", variant: "destructive" }); }
    }
  };

  const validateSelections = () => {
    if (uiProduct?.hasVariants) {
      if (requiredAttributeKeys.includes("color") && !selectedColor) {
        toast({ title: "Select a color", description: "Please choose a color to continue." });
        return false;
      }
      if (requiredAttributeKeys.includes("size") && !selectedSize) {
        toast({ title: "Select a size", description: "Please choose a size to continue." });
        return false;
      }
      if (requiredAttributeKeys.includes("fabric") && !selectedFabric) {
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

  const getCartProductPayload = () => {
    if (!uiProduct) return null;
    // For variant products, require a selected variant to add to cart.
    if (uiProduct.hasVariants && !selectedVariant) return null;
    if (!cartPriceData) return null;

    return {
      id: uiProduct._id,
      name: uiProduct.name,
      category: uiProduct.category,
      basePrice: uiProduct.basePrice,
      price: cartPriceData.originalPrice,
      finalPrice: cartPriceData.finalPrice,
      discountPercent: uiProduct.discountPercent,
      discountAmount: cartPriceData.discountAmount,
      gst: uiProduct.gst,
      priceIncludesGst: productDb?.priceIncludesGst ?? true,
      isCustomized: uiProduct.isCustomized,
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
  };

  const handleAddToCart = async () => {
    if (!uiProduct || !validateSelections()) return;
    if (!inStock) { toast({ title: "Out of stock", description: "This product is currently unavailable." }); return; }
    const cartProduct = getCartProductPayload();
    if (!cartProduct) return;
    await addToCart(cartProduct, quantity, selectedVariant, { color: selectedColor || undefined, size: selectedSize || undefined, fabric: selectedFabric || undefined });
    toast({ title: "Added to cart", description: `${quantity}x ${uiProduct.name} added.` });
  };

  const handleBuyNow = async () => {
    if (!uiProduct || !validateSelections()) return;
    if (!getToken()) { toast({ title: "Login required", description: "Please login to continue checkout." }); navigate(`/login?redirect=/checkout`); return; }
    if (!inStock) { toast({ title: "Out of stock", description: "This product is currently unavailable." }); return; }
    const cartProduct = getCartProductPayload();
    if (!cartProduct) return;
    await addToCart(cartProduct, quantity, selectedVariant, { color: selectedColor || undefined, size: selectedSize || undefined, fabric: selectedFabric || undefined });
    toast({ title: "Proceeding to checkout", description: `${quantity}x ${uiProduct.name} added.` });
    navigate("/checkout");
  };

  const isVariantSelectionRequired = uiProduct?.hasVariants && !selectedVariant;

  return (
    <Layout>
      <div className="min-h-screen bg-[#556b2f] text-[#f4f7ec]">
        <nav className="bg-[#4b5e29] py-3 border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Link to="/" className="text-[#eef4df] hover:underline">Home</Link>
              <ChevronRight className="w-4 h-4 text-[#d6dfbd]" />
              <Link to="/products" className="text-[#eef4df] hover:underline">Products</Link>
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
              <Link to="/products"><Button variant="outline" className="border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]">Back to Products</Button></Link>
            </div>
          ) : (
            <>
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Image Section */}
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-[#4b5e29]">
                    <img src={displayImage} alt={uiProduct.name} className="w-full h-full object-cover" />
                    {uiProduct.discountPercent > 0 && <span className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded">-{uiProduct.discountPercent}%</span>}
                    {uiProduct.isCustomized && <span className="absolute top-4 right-4 bg-amber-500 text-white text-sm font-bold px-3 py-1 rounded">Customizable</span>}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {images.map(img => (
                      <button key={img} onClick={() => setSelectedImage(img)} className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${displayImage === img ? "border-[#eef4df]" : "border-transparent hover:border-[#d6dfbd]"}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Section */}
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-[#eef4df] mb-2">{uiProduct.category}</p>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#f4f7ec] mb-3">{uiProduct.name}</h1>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.floor(rating) ? "fill-[#eef4df] text-[#eef4df]" : "text-[#d6dfbd]/30"}`} />)}</div>
                      <span className="text-sm text-[#d6dfbd]">{rating} ({reviews} reviews)</span>
                    </div>

                    {/* ✅ PRICE: always show base discounted price (never variant price) */}
                    <div className="flex items-baseline gap-3 flex-wrap">
                      {baseProductPriceData && (
                        <>
                          {baseProductPriceData.discountAmount > 0 && (
                            <span className="text-sm text-[#d6dfbd] line-through">{formatINR(baseProductPriceData.originalPrice)}</span>
                          )}
                          <span className="text-3xl font-bold text-[#eef4df]">{formatINR(baseProductPriceData.finalPrice)}</span>
                          {uiProduct.hasVariants && (
                            <span className="text-sm text-[#d6dfbd]">(select options)</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-[#d6dfbd] whitespace-pre-wrap">{uiProduct.description}</div>

                  {/* Color Selection */}
                  {availableColors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#f4f7ec]">Color</p>
                        {selectedColor ? <p className="text-xs text-[#d6dfbd]">{getColorName(selectedColor)}</p> : requireColor && <p className="text-xs text-red-300">Required</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableColors.map(c => {
                          const selected = selectedColor === c;
                          const hex = isHexColor(c);
                          return (
                            <button key={c} onClick={() => setSelectedColor(c)} className={`relative h-10 rounded-lg border transition-all ${selected ? "border-[#eef4df]" : "border-white/10 hover:border-[#d6dfbd]/40"} ${hex ? "w-10" : "px-3"}`}>
                              {hex ? <span className="absolute inset-1 rounded-md" style={{ backgroundColor: c }} /> : <span className="text-sm text-[#f4f7ec]">{getColorName(c)}</span>}
                              {selected && <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#eef4df] text-[#3f4f22] flex items-center justify-center"><Check className="h-3.5 w-3.5" /></span>}
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
                        {selectedSize ? <p className="text-xs text-[#d6dfbd]">{selectedSize}</p> : requireSize && <p className="text-xs text-red-300">Required</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableSizes.map(s => (
                          <button key={s} onClick={() => setSelectedSize(s)} className={`h-10 px-3 rounded-lg border text-sm transition-all ${selectedSize === s ? "border-[#eef4df] bg-[#eef4df]/10 text-[#f4f7ec]" : "border-white/10 hover:border-[#d6dfbd]/40 text-[#d6dfbd] hover:text-[#f4f7ec]"}`}>{s}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fabric Selection */}
                  {availableFabrics.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[#f4f7ec]">Fabric</p>
                        {selectedFabric ? <p className="text-xs text-[#d6dfbd] capitalize">{selectedFabric}</p> : requireFabric && <p className="text-xs text-red-300">Required</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableFabrics.map(f => (
                          <button key={f} onClick={() => setSelectedFabric(f)} className={`h-10 px-3 rounded-lg border text-sm transition-all capitalize ${selectedFabric === f ? "border-[#eef4df] bg-[#eef4df]/10 text-[#f4f7ec]" : "border-white/10 hover:border-[#d6dfbd]/40 text-[#d6dfbd] hover:text-[#f4f7ec]"}`}>{f}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product Details */}
                  <div className="bg-[#4b5e29] rounded-lg p-4 space-y-3">
                    <div className="flex"><span className="w-32 text-[#d6dfbd] text-sm">Material</span><span className="text-[#f4f7ec] text-sm">{uiProduct.material || "-"}</span></div>
                    <div className="flex"><span className="w-32 text-[#d6dfbd] text-sm">GST</span><span className="text-[#f4f7ec] text-sm">{uiProduct.gst}% {productDb?.priceIncludesGst ? "(Included)" : "(Excluded)"}</span></div>
                    <div className="flex">
                      <span className="w-32 text-[#d6dfbd] text-sm">Availability</span>
                      {!selectedVariant && uiProduct?.hasVariants ? <span className="text-sm text-yellow-300">Select variant to see stock</span> : <span className={`text-sm ${inStock ? "text-green-300" : displayStock <= 0 ? "text-red-300" : "text-yellow-500"}`}>{inStock ? "In Stock" : (displayStock > 0 ? "Low Stock" : "Out of Stock")} ({displayStock})</span>}
                    </div>
                  </div>

                  {uiProduct.isCustomized && (
                    <div>
                      <Button variant="outline" className="w-full border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]" onClick={() => window.open(`https://wa.me/917075848516?text=Hi, I'm interested in customizing this product:%0A%0A*Name:* ${encodeURIComponent(uiProduct.name)}%0A*ID:* ${uiProduct._id}%0A%0ACan you please share customization options?`, "_blank")}>✨ Customize This Product</Button>
                      <p className="text-xs text-[#d6dfbd] mt-2">Choose size, color, fabric, and add personal touches.</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-[#d6dfbd]">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-[#eef4df]" disabled={isVariantSelectionRequired || !inStock}><Minus className="w-4 h-4" /></button>
                        <span className="w-12 text-center font-semibold text-[#f4f7ec]">{quantity}</span>
                        <button onClick={() => setQuantity(Math.min(displayStock, quantity + 1))} className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-[#eef4df] disabled:opacity-50 disabled:cursor-not-allowed" disabled={isVariantSelectionRequired || !inStock || quantity >= displayStock}><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <Button variant="outline" size="lg" className="flex-1 border-[#dce6c3] text-[#f3f7e8] bg-transparent hover:bg-[#eef4df] hover:text-[#3f4f22]" onClick={handleAddToCart} disabled={isVariantSelectionRequired || !inStock}><ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart</Button>
                      <Button variant="default" size="lg" className="flex-1 bg-[#eef4df] text-[#3f4f22] hover:bg-[#dde8c2]" onClick={handleBuyNow} disabled={isVariantSelectionRequired || !inStock}>Buy Now</Button>
                      <Button variant="ghost" size="icon" className="h-12 w-12 border border-white/10 hover:bg-white/10 text-[#d6dfbd] hover:text-[#f4f7ec] relative" onClick={handleWishlistToggle} disabled={isWishlistLoading}>{isWishlistLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className={`w-5 h-5 transition-all ${isWishlisted ? "fill-[#eef4df] text-[#eef4df]" : ""}`} />}</Button>
                      <Button variant="ghost" size="icon" className="h-12 w-12 border border-white/10 hover:bg-white/10 text-[#d6dfbd] hover:text-[#f4f7ec]" onClick={handleShare}><Share2 className="w-5 h-5" /></Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                    {[{ icon: Truck, title: "Free Delivery", desc: "Orders over ₹10K" }, { icon: Shield, title: "2 Year Warranty", desc: "Full coverage" }, { icon: RotateCcw, title: "30 Day Returns", desc: "Easy returns" }].map(feature => (
                      <div key={feature.title} className="text-center"><feature.icon className="w-6 h-6 text-[#eef4df] mx-auto mb-2" /><p className="text-xs font-medium text-[#f4f7ec]">{feature.title}</p><p className="text-xs text-[#d6dfbd]">{feature.desc}</p></div>
                    ))}
                  </div>
                  {uiProduct.deliveryTime && uiProduct.deliveryTime.trim() && <div className="text-sm text-[#d6dfbd]">Delivery Time: <span className="font-medium text-[#f4f7ec]">{uiProduct.deliveryTime}</span></div>}
                </div>
              </div>

              {/* Related Products (unchanged) */}
              <div className="mt-16">
                <div className="flex items-center justify-between gap-4 mb-6"><div><p className="text-sm text-[#d6dfbd] mb-1">You may also like</p><h2 className="text-2xl md:text-3xl font-bold text-[#f4f7ec]">Related Category Products</h2></div><Link to="/products" className="hidden md:flex items-center gap-2 text-sm text-[#eef4df] hover:underline">View All <ArrowRight className="w-4 h-4" /></Link></div>
                {relatedLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{[...Array(4)].map((_, i) => <div key={i} className="bg-[#4b5e29] rounded-xl overflow-hidden border border-white/10"><div className="aspect-square bg-white/5 animate-pulse" /><div className="p-4 space-y-3"><div className="h-3 w-1/3 bg-white/5 rounded animate-pulse" /><div className="h-4 w-full bg-white/5 rounded animate-pulse" /><div className="h-5 w-1/2 bg-white/5 rounded animate-pulse" /></div></div>)}</div>
                ) : relatedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {relatedProducts.map(item => {
                      const priceData = computeFinalPrice(item.basePrice, item.discountPercent);
                      return (
                        <Link key={item._id} to={`/product/${item._id}`} className="group bg-[#4b5e29] rounded-xl overflow-hidden border border-white/10 hover:border-[#eef4df]/40 transition-all">
                          <div className="relative aspect-square overflow-hidden bg-white/5"><img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />{item.discountPercent > 0 && <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded">-{item.discountPercent}%</span>}</div>
                          <div className="p-4"><p className="text-xs text-[#d6dfbd] mb-1">{item.category}</p><h3 className="text-sm font-semibold text-[#f4f7ec] line-clamp-2 min-h-[40px]">{item.name}</h3><div className="flex items-center gap-2 mt-3 flex-wrap">{item.discountPercent > 0 && <span className="text-xs text-[#d6dfbd] line-through">{formatINR(priceData.originalPrice)}</span>}<span className="text-lg font-bold text-[#eef4df]">{formatINR(priceData.finalPrice)}</span></div>{item.discountPercent > 0 && <p className="text-xs text-green-300 mt-1">{item.discountPercent}% OFF</p>}<div className="mt-4 flex items-center justify-between text-xs text-[#d6dfbd]"><span>{item.totalStock > 0 ? "In Stock" : "Out of Stock"}</span><span className="inline-flex items-center gap-1 text-[#eef4df]">View <ArrowRight className="w-3.5 h-3.5" /></span></div></div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-[#4b5e29] p-6 text-center"><p className="text-sm text-[#d6dfbd]">No related products found in this category.</p></div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;