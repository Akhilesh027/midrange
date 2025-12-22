import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-surface-1 border-t border-border/30 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-xl">
                JS
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Mid-range furniture handcrafted for modern Indian homes. Quality, style, and affordability combined.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-foreground font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {['About Us', 'Contact', 'FAQs', 'Shipping Info'].map((link) => (
                <li key={link}>
                  <Link
                    to="#"
                    className="text-muted-foreground hover:text-primary text-sm transition-colors"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-foreground font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
              {['Living Room', 'Bedroom', 'Dining', 'Office', 'Outdoor'].map((cat) => (
                <li key={cat}>
                  <Link
                    to="/products"
                    className="text-muted-foreground hover:text-primary text-sm transition-colors"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Contact */}
          <div>
            <h4 className="text-foreground font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-3 mb-6">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
            <p className="text-muted-foreground text-sm">
              support@jsgallor.com<br />
              +91 98765 43210
            </p>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border/30">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-muted-foreground text-sm">
            © 2025 JSGALLOR || All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
};
