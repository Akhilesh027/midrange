import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import logo from "../../Image/JSGALORE.png";

const API_ADMIN = "https://api.jsgallor.com/api/admin";

type ApiCategory = {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  segment?: "all" | "affordable" | "midrange" | "luxury";
  parentId?: string | null;
  parent?: string | null;
  parentCategory?: string | null;
  status?: "active" | "hidden" | "disabled";
  showOnWebsite?: boolean;
  showInNavbar?: boolean;
  order?: number;
};

const norm = (s?: string | null) => String(s || "").trim().toLowerCase();

const getCatId = (c: ApiCategory) => String(c.id || c._id || c.slug);

const getParentId = (c: ApiCategory) =>
  String(c.parentId || c.parent || c.parentCategory || "");

export const Footer = () => {
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        setCatLoading(true);

        const urls = [
          `${API_ADMIN}/categories?segment=all&status=active&level=all&sort=order&limit=200`,
          `${API_ADMIN}/categories?segment=midrange&status=active&level=all&sort=order&limit=200`,
        ];

        const [r1, r2] = await Promise.all(urls.map((u) => fetch(u)));

        const j1 = await r1.json().catch(() => ({}));
        const j2 = await r2.json().catch(() => ({}));

        const a1: ApiCategory[] = Array.isArray(j1)
          ? j1
          : j1?.data?.items || j1?.data || [];

        const a2: ApiCategory[] = Array.isArray(j2)
          ? j2
          : j2?.data?.items || j2?.data || [];

        const map = new Map<string, ApiCategory>();

        [...a1, ...a2].forEach((cat) => {
          if (!cat?.slug) return;

          const key = getCatId(cat);

          map.set(key, {
            ...cat,
            id: cat.id || cat._id || cat.slug,
            _id: cat._id || cat.id || cat.slug,
          });
        });

        const merged = Array.from(map.values())
          .filter((cat) => {
            if (cat.status && cat.status !== "active") return false;
            if (typeof cat.showOnWebsite === "boolean" && !cat.showOnWebsite)
              return false;
            if (typeof cat.showInNavbar === "boolean" && !cat.showInNavbar)
              return false;

            const seg = norm(cat.segment);
            if (seg && seg !== "all" && seg !== "midrange") return false;

            return true;
          })
          .sort(
            (a, b) =>
              Number(a.order || 0) - Number(b.order || 0) ||
              a.name.localeCompare(b.name)
          );

        setCats(merged);
      } catch (error) {
        console.error("Footer categories error:", error);
        setCats([]);
      } finally {
        setCatLoading(false);
      }
    };

    fetchCats();
  }, []);

  const footerCategories = useMemo(() => {
    return cats.filter((cat) => !getParentId(cat)).slice(0, 5);
  }, [cats]);

  return (
    <footer className="bg-[#3f4f22] border-t border-white/10 mt-auto text-[#f7ecd7]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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

            <p className="text-[#ffe8b3] text-sm mt-3 font-medium">
              We deal with premium manufacturers only.
            </p>
          </div>

          <div>
            <h4 className="text-[#f7ecd7] font-semibold mb-4">Quick Links</h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {[
                { name: "About Us", path: "/about" },
                { name: "Contact", path: "/contact" },
                { name: "FAQs", path: "/faqs" },
                { name: "Shipping Info", path: "/shipping" },
                { name: "Privacy Policy", path: "/privacy-policy" },
                { name: "Delivery Policy", path: "/delivery-policy" },
                { name: "Warranty & Refund", path: "/warranty-refund" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-[#cdbf9e] hover:text-[#ffe8b3] text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[#f7ecd7] font-semibold mb-4">Categories</h4>

            {catLoading ? (
              <p className="text-[#cdbf9e] text-sm">Loading categories...</p>
            ) : footerCategories.length === 0 ? (
              <p className="text-[#cdbf9e] text-sm">No categories found</p>
            ) : (
              <ul className="space-y-2">
                {footerCategories.map((cat) => (
                  <li key={getCatId(cat)}>
                    <Link
                      to={`/categories/${cat.slug}`}
                      className="text-[#cdbf9e] hover:text-[#ffe8b3] text-sm transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-[#f7ecd7] font-semibold mb-4">Contact</h4>

            <div className="flex gap-3 mb-6">
              <a
                href="https://www.facebook.com/profile.php?id=61586448690693"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#cdbf9e] hover:bg-[#f3deb0] hover:text-[#3f4f22] transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>

              <a
                href="https://www.instagram.com/jsgallor/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#cdbf9e] hover:bg-[#f3deb0] hover:text-[#3f4f22] transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>

              <a
                href="https://www.youtube.com/@JSGALLOR"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#cdbf9e] hover:bg-[#f3deb0] hover:text-[#3f4f22] transition-all"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>

            <p className="text-[#cdbf9e] text-sm leading-relaxed mb-4">
              support@jsgallor.com <br />
              +91 7075848516
            </p>

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
                <span>Uppal, Hyderabad, Telangana – 500039</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center">
            <p className="text-[#bfae87] text-sm">
              © 2026 JSGALLOR || All rights reserved
            </p>
            <p className="text-[#bfae87] text-xs mt-1 opacity-80">
              Designed and Developed by{" "}
              <span className="font-medium">Digitalness</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};