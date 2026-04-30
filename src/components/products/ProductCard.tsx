import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface UnifiedProduct {
  id?: string;
  _id?: string;
  name: string;
  price?: number;          // original price
  discount?: number;       // discount %
  discountPercent?: number;
  originalPrice?: number;
  oldPrice?: number;
  newPrice?: number;
  image?: string;
  category?: string;
  gst?: number;
  priceIncludesGst?: boolean;
  isCustomized?: boolean;
}

export const ProductCard = ({ product }: { product: UnifiedProduct }) => {
  const { addItem } = useCart();

  const productId = product.id || product._id || "";

  // ✅ ORIGINAL PRICE
  const originalPrice =
    product.originalPrice ??
    product.oldPrice ??
    product.price ??
    0;

  // ✅ DISCOUNT %
  const discount =
    product.discount ??
    product.discountPercent ??
    0;

  // ✅ FINAL PRICE (CORRECT CALCULATION)
  const finalPrice =
    discount > 0
      ? Math.round(originalPrice * (1 - discount / 100))
      : originalPrice;

  const hasDiscount = discount > 0;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!productId || finalPrice <= 0) {
      toast({
        title: "Error",
        description: "Invalid product data",
        variant: "destructive",
      });
      return;
    }

    addItem(
      {
        id: productId,
        name: product.name,
        price: finalPrice,                // ✅ discounted price
        originalPrice: originalPrice,     // ✅ original price
        discountPercent: discount,
        gst: product.gst ?? 0,
        priceIncludesGst: product.priceIncludesGst ?? true,
        isCustomized: product.isCustomized ?? false,
        image: product.image || "",
        variantId: null,
        attributes: {},
      },
      1
    );

    toast({
      title: "Added to cart",
      description: `${product.name} added successfully`,
    });
  };

  return (
    <Link to={`/product/${productId}`} className="block group">
      <div className="product-card overflow-hidden">

        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.image || "/placeholder.jpg"}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Discount Badge */}
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded">
              -{discount}%
            </span>
          )}

          {/* Add to Cart */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition">
            <Button
              size="icon"
              onClick={handleAddToCart}
              className="rounded-full w-10 h-10"
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold mb-2 line-clamp-1">
            {product.name}
          </h3>

          <div className="flex items-center gap-2">
            {/* Original Price */}
            {hasDiscount && (
              <span className="text-sm line-through text-gray-500">
                {formatPrice(originalPrice)}
              </span>
            )}

            {/* Final Price */}
            <span className="text-lg font-bold text-primary">
              {formatPrice(finalPrice)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};