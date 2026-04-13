import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface UnifiedProduct {
  id?: string;
  _id?: string;
  name: string;
  price?: number;
  oldPrice?: number;
  newPrice?: number;
  discount?: number;
  image?: string;
  category?: string;
  rating?: number;
  reviews?: number;
}

// ----- DISCOUNT PRICE HELPERS WITH SAFE FALLBACKS -----
const getOldPrice = (product: UnifiedProduct): number | undefined => {
  // If oldPrice is directly provided
  if (typeof product.oldPrice === 'number') return product.oldPrice;
  
  // Calculate from price and discount if discount exists and > 0
  if (typeof product.price === 'number' && typeof product.discount === 'number' && product.discount > 0) {
    const calculated = Math.round(product.price / (1 - product.discount / 100));
    return calculated;
  }
  
  return undefined;
};

const getNewPrice = (product: UnifiedProduct): number | undefined => {
  // If newPrice is directly provided
  if (typeof product.newPrice === 'number') return product.newPrice;
  
  // Otherwise use price
  if (typeof product.price === 'number') return product.price;
  
  // No price available
  return undefined;
};

const getDiscountPercent = (product: UnifiedProduct): number => {
  // If discount is directly provided
  if (typeof product.discount === 'number') return product.discount;
  
  // Calculate from old/new price difference
  const oldP = getOldPrice(product);
  const newP = getNewPrice(product);
  if (oldP && newP && oldP > newP) {
    return Math.round(((oldP - newP) / oldP) * 100);
  }
  
  return 0;
};

export const ProductCard = ({ product }: { product: UnifiedProduct }) => {
  const { addToCart } = useCart();

  // Debug log to see incoming product
  console.log('ProductCard received:', product);

  const productId = product.id || product._id || '';
  const newPrice = getNewPrice(product);
  const oldPrice = getOldPrice(product);
  const discountPercent = getDiscountPercent(product);
  const hasDiscount = discountPercent > 0 && oldPrice !== undefined && oldPrice > (newPrice || 0);

  // Debug logs for prices
  console.log('Prices - newPrice:', newPrice, 'oldPrice:', oldPrice, 'discount%:', discountPercent);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!newPrice || newPrice <= 0) {
      toast({
        title: "Cannot add",
        description: "Price information is missing.",
        variant: "destructive",
      });
      return;
    }

    addToCart({
      id: productId,
      name: product.name,
      price: newPrice,
      image: product.image || '',
      category: product.category || '',
    });
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const showRating = product.rating && product.reviews;

  // If no price at all, show a placeholder
  const showPriceMissing = newPrice === undefined || newPrice === null;

  return (
    <Link to={`/product/${productId}`} className="block group">
      <article className="product-card overflow-hidden">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.image || '/placeholder-image.jpg'}
            alt={product.name}
            className="w-full h-full object-cover transition-opacity duration-500 group-hover:scale-105"
          />

          {hasDiscount && discountPercent > 0 && (
            <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
              -{discountPercent}%
            </span>
          )}

          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <Button
              onClick={handleAddToCart}
              size="icon"
              variant="gold"
              className="rounded-full w-10 h-10"
              disabled={showPriceMissing}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4">
          {product.category && (
            <p className="text-xs text-muted-foreground mb-1 capitalize">
              {product.category.replace(/-/g, ' ')}
            </p>
          )}
          <h3 className="font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {showRating && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-3.5 h-3.5 fill-primary text-primary" />
              <span className="text-xs text-muted-foreground">
                {product.rating} ({product.reviews} reviews)
              </span>
            </div>
          )}

          {/* PRICE SECTION - Always rendered, shows fallback if no price */}
          <div className="flex flex-wrap items-center gap-2">
            {showPriceMissing ? (
              <span className="text-sm text-muted-foreground">Price on request</span>
            ) : (
              <>
                {hasDiscount && oldPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(oldPrice)}
                  </span>
                )}
                <span className="text-lg font-bold text-primary">
                  {formatPrice(newPrice!)}
                </span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
};