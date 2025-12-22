import { Link } from 'react-router-dom';
import { ArrowRight, Star, Truck, Shield, Headphones } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { products } from '@/data/products';

const Index = () => {
  const featuredProducts = products.slice(0, 4);

  return (
    <Layout>
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-surface-1 to-background">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Hero Copy */}
            <div className="space-y-6 animate-fade-in">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                New Collection 2025
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Mid-Range Furniture{' '}
                <span className="text-primary">Crafted for Modern Homes</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Thoughtful design, sustainable materials, and smart pricing — furniture that
                fits your space and budget perfectly.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button asChild variant="gold" size="lg">
                  <Link to="/products">
                    Explore Collection
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/products">View Catalog</Link>
                </Button>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80"
                  alt="Luxury Sofa"
                  className="w-full h-[400px] md:h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                
                {/* Floating badge */}
                <div className="absolute bottom-6 left-6 right-6 glass-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Featured Product</p>
                      <p className="font-semibold text-foreground">Milano Velvet Sofa</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground line-through">₹1,49,900</p>
                      <p className="text-xl font-bold text-primary">₹1,29,900</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-surface-1 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Free Delivery', desc: 'On orders above ₹10,000' },
              { icon: Shield, title: '2 Year Warranty', desc: 'On all furniture' },
              { icon: Headphones, title: '24/7 Support', desc: 'Expert assistance' },
              { icon: Star, title: 'Premium Quality', desc: 'Handcrafted pieces' },
            ].map((feature, idx) => (
              <div
                key={feature.title}
                className="flex flex-col items-center text-center p-4 animate-fade-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Featured Collection</h2>
              <p className="text-muted-foreground mt-1">Handpicked pieces for your home</p>
            </div>
            <Button asChild variant="ghost-gold">
              <Link to="/products">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product, idx) => (
              <div
                key={product.id}
                className="animate-fade-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Banner */}
      <section className="py-16 bg-surface-1">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: 'Living Room', image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80' },
              { name: 'Bedroom', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&q=80' },
              { name: 'Dining', image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400&q=80' },
              { name: 'Office', image: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&q=80' },
              { name: 'Outdoor', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&q=80' },
            ].map((cat, idx) => (
              <Link
                key={cat.name}
                to="/products"
                className="group relative rounded-xl overflow-hidden aspect-square animate-fade-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                <div className="absolute inset-0 flex items-end p-4">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Stay Updated
            </h2>
            <p className="text-muted-foreground mb-6">
              Subscribe to get exclusive offers, design tips, and new arrivals straight to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
              <Button variant="gold" size="lg">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
