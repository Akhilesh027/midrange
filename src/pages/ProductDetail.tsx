import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Star, Minus, Plus, ShoppingCart, Heart, Truck, Shield, RotateCcw } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { products } from '@/data/products';
import { toast } from '@/hooks/use-toast';

const ProductDetail = () => {
  const { id } = useParams();
  const product = products.find((p) => p.id === Number(id)) || products[0];
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product.image);
  const { addToCart } = useCart();

  const relatedProducts = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const discount = Math.round(((product.oldPrice - product.newPrice) / product.oldPrice) * 100);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    toast({
      title: "Added to cart",
      description: `${quantity}x ${product.name} has been added to your cart.`,
    });
  };

  const images = [product.image, product.hoverImage, product.image, product.hoverImage];

  return (
    <Layout>
      {/* Breadcrumb */}
      <nav className="bg-surface-1 py-3 border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Link to="/" className="text-primary hover:underline">Home</Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Link to="/products" className="text-primary hover:underline">Products</Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{product.name}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-card">
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {discount > 0 && (
                <span className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-sm font-bold px-3 py-1 rounded">
                  -{discount}%
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === img ? 'border-primary' : 'border-transparent hover:border-muted'
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
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{product.name}</h1>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-primary text-primary' : 'text-muted'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.rating} ({product.reviews} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.oldPrice)}
                </span>
                <span className="text-3xl font-bold text-primary">
                  {formatPrice(product.newPrice)}
                </span>
              </div>
            </div>

            <p className="text-muted-foreground">{product.description}</p>

            {/* Details Table */}
            <div className="bg-card rounded-lg p-4 space-y-3">
              <div className="flex">
                <span className="w-32 text-muted-foreground text-sm">Material</span>
                <span className="text-foreground text-sm">{product.material}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-muted-foreground text-sm">Color</span>
                <span className="text-foreground text-sm">{product.color}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-muted-foreground text-sm">Availability</span>
                <span className={`text-sm ${product.inStock ? 'text-green-500' : 'text-destructive'}`}>
                  {product.inStock ? 'In Stock' : 'Out of Stock'}
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

              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="flex-1" onClick={handleAddToCart}>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </Button>
                <Button variant="gold" size="lg" className="flex-1">
                  Buy Now
                </Button>
                <Button variant="ghost" size="icon" className="h-12 w-12">
                  <Heart className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
              {[
                { icon: Truck, title: 'Free Delivery', desc: 'Orders over ₹10K' },
                { icon: Shield, title: '2 Year Warranty', desc: 'Full coverage' },
                { icon: RotateCcw, title: '30 Day Returns', desc: 'Easy returns' },
              ].map((feature) => (
                <div key={feature.title} className="text-center">
                  <feature.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs font-medium text-foreground">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-foreground mb-6">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetail;
