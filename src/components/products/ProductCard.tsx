import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Unified product type (supports both local and API)
interface UnifiedProduct {
  id?: string;          // local product id
  _id?: string;         // API product id
  name: string;
  price: number;
  oldPrice?: number;    // local discount support
  newPrice?: number;    // local discount support
  image?: string;
  category?: string;
  rating?: number;
  reviews?: number;
  // Add any other fields used in your app
}

interface ProductCardProps {
  product: UnifiedProduct;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();

  // Get the correct id
  const productId = product.id || product._id || '';

  // Compute display price and discount
  const hasDiscount = product.oldPrice && product.oldPrice > product.price;
  const displayPrice = hasDiscount ? product.newPrice || product.price : product.price;
  const originalPrice = hasDiscount ? product.oldPrice : product.price;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;

  // Format price
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
    // Convert to the shape expected by your cart context
    const cartProduct = {
      id: productId,
      name: product.name,
      price: product.price,
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
            className="w-full h-full object-cover transition-opacity duration-500"
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
            <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
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

          {/* Price */}
          <div className="flex items-center gap-2">
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="text-lg font-bold text-primary">
              {formatPrice(displayPrice)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};