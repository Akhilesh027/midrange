import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Extended product type to support both local and API structures
interface UnifiedProduct {
  id?: string;           // local product id
  _id?: string;          // API product id
  name: string;
  price: number;
  oldPrice?: number;     // local discount support
  newPrice?: number;     // local discount support
  discount?: number;     // API discount percentage
  hasVariants?: boolean;
  variants?: Array<{
    price: number;
    attributes?: any;
    sku?: string;
  }>;
  image?: string;
  category?: string;
  rating?: number;
  reviews?: number;
}

interface ProductCardProps {
  product: UnifiedProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();

  // Get the correct id
  const productId = product.id || product._id || '';

  // Helper: get the cheapest available price (consider variants if any)
  const getCheapestPrice = (): number => {
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      const variantPrices = product.variants.map(v => v.price);
      return Math.min(...variantPrices, product.price);
    }
    return product.price;
  };

  // Helper: get original price (before discount)
  const getOriginalPrice = (): number => {
    const cheapest = getCheapestPrice();
    if (product.oldPrice) return product.oldPrice;
    if (product.discount && product.discount > 0) {
      // original = cheapest / (1 - discount/100)
      return Math.round(cheapest / (1 - product.discount / 100));
    }
    return cheapest;
  };

  const displayPrice = getCheapestPrice();
  const originalPrice = getOriginalPrice();
  const hasDiscount = originalPrice > displayPrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;

  // Check if variants have a price range
  let hasPriceRange = false;
  let minVariantPrice = displayPrice;
  let maxVariantPrice = displayPrice;
  if (product.hasVariants && product.variants && product.variants.length > 1) {
    const prices = product.variants.map(v => v.price);
    minVariantPrice = Math.min(...prices);
    maxVariantPrice = Math.max(...prices);
    hasPriceRange = minVariantPrice !== maxVariantPrice;
  }

  // Format price in Indian Rupees
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Add to cart handler
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Use the cheapest variant price for cart (or base price)
    const cartPrice = hasPriceRange ? minVariantPrice : displayPrice;

    const cartProduct = {
      id: productId,
      name: product.name,
      price: cartPrice,
      image: product.image || '',
      category: product.category || '',
    };
    addToCart(cartProduct);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  // Rating display (optional)
  const showRating = product.rating && product.reviews;

  return (
    <Link to={`/product/${productId}`} className="block group">
      <article className="product-card overflow-hidden">
        {/* Image container */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.image || '/placeholder-image.jpg'}
            alt={product.name}
            className="w-full h-full object-cover transition-opacity duration-500 group-hover:scale-105"
          />

          {/* Discount badge */}
          {discountPercent > 0 && (
            <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
              -{discountPercent}%
            </span>
          )}

          {/* Quick add button */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <Button
              onClick={handleAddToCart}
              size="icon"
              variant="gold"
              className="rounded-full w-10 h-10"
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {product.category && (
            <p className="text-xs text-muted-foreground mb-1 capitalize">
              {product.category.replace(/-/g, ' ')}
            </p>
          )}
          <h3 className="font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Rating (only if available) */}
          {showRating && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-3.5 h-3.5 fill-primary text-primary" />
              <span className="text-xs text-muted-foreground">
                {product.rating} ({product.reviews} reviews)
              </span>
            </div>
          )}

          {/* Price display */}
          <div className="flex flex-wrap items-center gap-2">
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
            {hasPriceRange ? (
              <span className="text-lg font-bold text-primary">
                {formatPrice(minVariantPrice)} – {formatPrice(maxVariantPrice)}
              </span>
            ) : (
              <span className="text-lg font-bold text-primary">
                {formatPrice(displayPrice)}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
};