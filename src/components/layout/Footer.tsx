import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, MapPin } from "lucide-react";
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

            {/* 🔥 Added line */}
            <p className="text-[#ffe8b3] text-sm mt-3 font-medium">
              We deal with premium manufacturers only.
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

          {/* Contact + Locations */}
          <div>
            <h4 className="text-[#f7ecd7] font-semibold mb-4">Contact</h4>

            <div className="flex gap-3 mb-6">
              <a
                href="https://www.facebook.com/profile.php?id=61586448690693"
                className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#cdbf9e] hover:bg-[#f3deb0] hover:text-[#3f4f22] transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>

              <a
                href="https://www.instagram.com/jsgallor/"
                className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#cdbf9e] hover:bg-[#f3deb0] hover:text-[#3f4f22] transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>

              <a
                href="https://www.youtube.com/@JSGALLOR"
                className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#cdbf9e] hover:bg-[#f3deb0] hover:text-[#3f4f22] transition-all"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>

            {/* Contact Info */}
            <p className="text-[#cdbf9e] text-sm leading-relaxed mb-4">
              support@jsgallor.com <br />
              +91 98765 43210
            </p>

            {/* Locations ✅ */}
            <div className="space-y-3 text-sm text-[#cdbf9e]">
              <div className="flex gap-2 items-start">
                <MapPin className="w-4 h-4 mt-1 text-[#ffe8b3]" />
                <span>
                  WorkFlo Bizness Square, 4th Floor, Jubilee Enclave,
                  Madhapur, Telangana – 500081
                </span>
              </div>

              <div className="flex gap-2 items-start">
                <MapPin className="w-4 h-4 mt-1 text-[#ffe8b3]" />
                <span>
                  Uppal, Hyderabad, Telangana – 500039
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4">
  <div className="text-center">
    <p className="text-[#bfae87] text-sm">
      © 2026 JSGALLOR || All rights reserved
    </p>
    <p className="text-[#bfae87] text-xs mt-1 opacity-80">
      Designed and Developed by <span className="font-medium">Digitalness</span>
    </p>
  </div>
</div>
      </div>
    </footer>
  );
};