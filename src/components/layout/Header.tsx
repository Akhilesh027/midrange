import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, MapPin, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const categories = [
  { name: 'Living Room', items: ['Sofas', 'Recliners', 'Coffee Tables', 'TV Units'] },
  { name: 'Bedroom', items: ['Beds', 'Wardrobes', 'Dressers'] },
  { name: 'Dining', items: ['Dining Sets', 'Chairs', 'Bar Stools'] },
  { name: 'Office', items: ['Desks', 'Office Chairs', 'Storage'] },
  { name: 'Outdoor', items: ['Patio Sets', 'Garden Chairs'] },
];

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { totalItems } = useCart();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      {/* Top bar */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-xl">
              JS
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                JS GALLOR
              </div>
              <div className="text-xs text-muted-foreground">Furniture & Interiors</div>
            </div>
          </Link>

          {/* Search bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="Search furniture, decor, collections..."
                className="w-full pl-4 pr-10 bg-secondary border-border/50 focus:border-primary"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile search toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Location */}
            <button className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
              <MapPin className="w-4 h-4" />
              <span className="hidden lg:inline">Location</span>
            </button>

            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-muted-foreground hover:text-primary transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* User */}
            <Link to="/login" className="p-2 text-muted-foreground hover:text-primary transition-colors">
              <User className="w-5 h-5" />
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {isSearchOpen && (
          <div className="md:hidden pb-4">
            <Input
              type="search"
              placeholder="Search furniture..."
              className="w-full bg-secondary border-border/50"
            />
          </div>
        )}
      </div>

      {/* Navigation - Desktop */}
      <nav className="hidden md:block border-t border-border/30 bg-surface-1">
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-1">
            {categories.map((cat) => (
              <li key={cat.name} className="relative group">
                <Link
                  to="/products"
                  className="block px-4 py-3 text-sm font-medium text-foreground hover:text-primary transition-colors gold-underline"
                >
                  {cat.name}
                </Link>
                {/* Dropdown */}
                <div className="absolute left-0 top-full invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 z-50">
                  <div className="pt-2">
                    <ul className="bg-card border border-border rounded-lg shadow-xl min-w-[180px] py-2">
                      {cat.items.map((item) => (
                        <li key={item}>
                          <Link
                            to="/products"
                            className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
                          >
                            {item}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
            <li>
              <Link
                to="/products"
                className="block px-4 py-3 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Decor
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                className="block px-4 py-3 text-sm font-bold text-destructive hover:text-destructive/80 transition-colors"
              >
                Sale
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border">
          <nav className="container mx-auto px-4 py-4">
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.name}>
                  <Link
                    to="/products"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block py-2 text-foreground hover:text-primary transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/products"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 text-destructive font-bold"
                >
                  Sale
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};
