// src/components/LegalPageContent.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getLegalPage, LegalPage, PageType, Website } from "@/lib/legalPages";
import { Loader2, Home, Leaf } from "lucide-react";

interface LegalPageContentProps {
  type: PageType;
  website?: Website;
}

const pageTitles: Record<PageType, string> = {
  privacy_policy: "Privacy Policy",
  terms_conditions: "Terms & Conditions",
  refund_policy: "Refund Policy",
  shipping_policy: "Shipping Policy",
  about: "About Us",
  contact: "Contact",
};

export function LegalPageContent({ type, website }: LegalPageContentProps) {
  const { tier } = useParams<{ tier: string }>();
  const [page, setPage] = useState<LegalPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentWebsite: Website =
    website ||
    (tier && ["affordable", "midrange", "luxury"].includes(tier)
      ? (tier as Website)
      : "affordable");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getLegalPage(currentWebsite, type)
      .then((data) => {
        if (!mounted) return;
        if (data) setPage(data);
        else setError("Page not found or not published yet.");
      })
      .catch((err) => setError(err.message || "Failed to load content."))
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [currentWebsite, type]);

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center bg-[#3f4f22]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="py-12 flex items-center justify-center bg-[#3f4f22]">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-white mb-2">Content Unavailable</h1>
          <p className="text-[#e0e8cf]">{error || "The requested page could not be found."}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-white text-[#3f4f22] rounded-lg hover:bg-[#eef4df] transition-colors"
          >
            <Home className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#3f4f22] py-12">
      <div className="container mx-auto px-4 max-w">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <ol className="flex flex-wrap items-center gap-1 text-[#e0e8cf]">
            <li>
              <Link to="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li className="text-white/50">/</li>
            <li className="text-white font-medium">{pageTitles[type]}</li>
          </ol>
        </nav>

        {/* Main content card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#3f4f22]/5 via-[#4b5e29]/5 to-transparent p-6 md:p-8 border-b border-[#3f4f22]/10">
            <div className="flex items-center gap-3 mb-2">
              <Leaf className="h-6 w-6 text-[#3f4f22]" />
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#3f4f22]">
                {page.title}
              </h1>
            </div>
            <p className="text-sm text-[#5a6e3f] mt-2">
              Last updated: {new Date(page.updatedAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 prose prose-slate max-w-none">
            {page.content.split("\n").map((paragraph, idx) => {
              if (!paragraph.trim()) return null;
              if (paragraph.startsWith("## "))
                return (
                  <h2 key={idx} className="text-2xl font-semibold mt-6 mb-3 text-[#3f4f22]">
                    {paragraph.replace("## ", "")}
                  </h2>
                );
              if (paragraph.startsWith("### "))
                return (
                  <h3 key={idx} className="text-xl font-semibold mt-5 mb-2 text-[#4b5e29]">
                    {paragraph.replace("### ", "")}
                  </h3>
                );
              return (
                <p key={idx} className="leading-relaxed mb-4 text-[#2c3a18]">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}