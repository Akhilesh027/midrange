import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal, Search, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { products, categories, materials, colors } from '@/data/products';

const Products = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesMaterial = !selectedMaterial || product.material === selectedMaterial;
    const matchesColor = !selectedColor || product.color === selectedColor;
    return matchesSearch && matchesCategory && matchesMaterial && matchesColor;
  });

  const activeFilters = [selectedCategory, selectedMaterial, selectedColor].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedMaterial('');
    setSelectedColor('');
    setSearchTerm('');
  };

  return (
    <Layout>
      {/* Breadcrumb */}
      <nav className="bg-surface-1 py-3 border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-primary hover:underline">Home</Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Products</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-card rounded-xl border border-border/50 p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-foreground">Filters</h3>
                {activeFilters > 0 && (
                  <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                    Clear all
                  </button>
                )}
              </div>

              {/* Search */}
              <div className="relative mb-5">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-secondary border-border/50"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>

              {/* Category Filter */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Material Filter */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-foreground mb-2">Material</label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">All Materials</option>
                  {materials.map((mat) => (
                    <option key={mat} value={mat}>{mat}</option>
                  ))}
                </select>
              </div>

              {/* Color Filter */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-foreground mb-2">Color</label>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">All Colors</option>
                  {colors.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>

              <Button variant="gold" className="w-full">
                Apply Filters
                {activeFilters > 0 && (
                  <span className="ml-2 bg-primary-foreground/20 px-2 py-0.5 rounded text-xs">
                    {activeFilters}
                  </span>
                )}
              </Button>
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <p className="text-muted-foreground text-sm">{filteredProducts.length} products</p>
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(true)}
              className="gap-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilters > 0 && (
                <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs">
                  {activeFilters}
                </span>
              )}
            </Button>
          </div>

          {/* Mobile Filter Drawer */}
          {isFilterOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l border-border p-5 overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-foreground">Filters</h3>
                  <button onClick={() => setIsFilterOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Same filters as desktop */}
                <div className="space-y-5">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-secondary"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground"
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Material</label>
                    <select
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground"
                    >
                      <option value="">All Materials</option>
                      {materials.map((mat) => (
                        <option key={mat} value={mat}>{mat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Color</label>
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground"
                    >
                      <option value="">All Colors</option>
                      {colors.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={clearFilters} className="flex-1">
                      Clear
                    </Button>
                    <Button variant="gold" onClick={() => setIsFilterOpen(false)} className="flex-1">
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Our Collection</h1>
              <p className="hidden lg:block text-muted-foreground text-sm">{filteredProducts.length} products</p>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">No products found matching your filters.</p>
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Products;
