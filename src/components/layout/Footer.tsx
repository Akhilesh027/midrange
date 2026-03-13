import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube } from "lucide-react";
import logo from "../../Image/JSGALORE.png";

export const Footer = () => {
  return (
    <footer className="bg-[#3f4f22] border-t border-white/10 mt-auto text-[#f7ecd7]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo + About */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden border border-white/10 bg-white/5 shadow-sm">
                <img
                  src={logo}
                  alt="JSGALLOR Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </Link>

            <p className="text-[#cdbf9e] text-sm leading-relaxed">
              Mid-range furniture handcrafted for modern Indian homes. Quality,
              style, and affordability combined.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[#f7ecd7] font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {["About Us", "Contact", "FAQs", "Shipping Info"].map((link) => (
                <li key={link}>
                  <Link
                    to="#"
                    className="text-[#cdbf9e] hover:text-[#ffe8b3] text-sm transition-colors"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-[#f7ecd7] font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
              {["Living Room", "Bedroom", "Dining", "Office", "Outdoor"].map(
                (cat) => (
                  <li key={cat}>
                    <Link
                      to="/products"
                      className="text-[#cdbf9e] hover:text-[#ffe8b3] text-sm transition-colors"
                    >
                      {cat}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Social & Contact */}
          <div>
            <h4 className="text-[#f7ecd7] font-semibold mb-4">Follow Us</h4>

            <div className="flex gap-3 mb-6">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#cdbf9e] hover:bg-[#f3deb0] hover:text-[#3f4f22] transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>

              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#cdbf9e] hover:bg-[#f3deb0] hover:text-[#3f4f22] transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>

              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#cdbf9e] hover:bg-[#f3deb0] hover:text-[#3f4f22] transition-all"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>

            <p className="text-[#cdbf9e] text-sm leading-relaxed">
              support@jsgallor.com
              <br />
              +91 98765 43210
            </p>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-[#bfae87] text-sm">
            © 2025 JSGALLOR || All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
};