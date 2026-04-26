import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface UnifiedProduct {
  id?: string;
  _id?: string;
  name: string;
  price?: number;        // final discounted price (if using new shape)
  originalPrice?: number; // original pre‑discount price (new shape)
  discountPercent?: number; // discount % (new shape)
  oldPrice?: number;     // optional explicit original price (legacy)
  newPrice?: number;     // optional explicit discounted price (legacy)
  discount?: number;     // discount percentage (legacy)
  image?: string;
  category?: string;
  rating?: number;
  reviews?: number;
  gst?: number;          // GST percentage (default to 0 if missing)
  inStock?: boolean;     // not used in cart but can be kept
}

// ----- HELPER FUNCTIONS (compatible with both new and legacy product shapes) -----

// Returns the current (discounted) price
const getDiscountedPrice = (product: UnifiedProduct): number | undefined => {
  // Prefer explicit newPrice (legacy)
  if (typeof product.newPrice === 'number') return product.newPrice;
  // Prefer price field (new shape: price is final discounted)
  if (typeof product.price === 'number') return product.price;
  return undefined;
};

// Returns the original price (before discount)
const getOriginalPrice = (product: UnifiedProduct): number | undefined => {
  // Prefer explicit originalPrice (new shape)
  if (typeof product.originalPrice === 'number') return product.originalPrice;
  // Prefer explicit oldPrice (legacy)
  if (typeof product.oldPrice === 'number') return product.oldPrice;
  // Fallback: if price is available and discount exists, compute original
  if (typeof product.price === 'number') {
    const discountPercent = getDiscountPercent(product);
    if (discountPercent > 0) {
      return Math.round(product.price / (1 - discountPercent / 100) * 100) / 100;
    }
    return product.price;
  }
  return undefined;
};

// Returns discount percentage (either from product.discountPercent, product.discount, or calculated)
const getDiscountPercent = (product: UnifiedProduct): number => {
  // Prefer discountPercent (new shape)
  if (typeof product.discountPercent === 'number') return product.discountPercent;
  // Prefer discount (legacy)
  if (typeof product.discount === 'number') return product.discount;
  // Calculate from original and discounted prices
  const original = getOriginalPrice(product);
  const discounted = getDiscountedPrice(product);
  if (original && discounted && original > discounted) {
    return Math.round(((original - discounted) / original) * 100);
  }
  return 0;
};

// Returns GST (default to 0 if missing)
const getGst = (product: UnifiedProduct): number => {
  return typeof product.gst === 'number' ? product.gst : 0;
};

export const ProductCard = ({ product }: { product: UnifiedProduct }) => {
  const { addItem } = useCart();  // ✅ use addItem, not addToCart

  const productId = product.id || product._id || '';
  const newPrice = getDiscountedPrice(product);
  const oldPrice = getOriginalPrice(product);
  const discountPercent = getDiscountPercent(product);
  const gst = getGst(product);
  const hasDiscount = discountPercent > 0 && oldPrice !== undefined && oldPrice > (newPrice || 0);

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

    if (!newPrice || newPrice <= 0 || !productId) {
      toast({
        title: "Cannot add",
        description: "Product information is incomplete.",
        variant: "destructive",
      });
      return;
    }

    addItem({
      id: productId,
      name: product.name,
      price: newPrice,                     // final discounted price
      originalPrice: oldPrice ?? newPrice, // original price (fallback to final)
      discountPercent: discountPercent,
      gst: gst,
      isCustomized: false,
      image: product.image || '',
      variantId: null,
      attributes: {},
    }, 1);  // quantity = 1

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const showRating = product.rating && product.reviews;
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