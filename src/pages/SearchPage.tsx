// src/pages/SearchPage.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";

const API_MIDRANGE = "https://api.jsgallor.com/api/midrange/products";
// const API_AFFORDABLE = "https://api.jsgallor.com/api/affordable/products";

type Product = {
  _id: string;
  name: string;
  price: number;
  image?: string;
  category: string;
  subcategory?: string;
  // add any other fields your product card expects
};

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      return;
    }

    const fetchSearchResults = async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch from midrange API with search parameter
        const res = await fetch(`${API_MIDRANGE}?search=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Failed to fetch products");

        const data = await res.json();
        const items: Product[] = Array.isArray(data) ? data : data?.products || [];
        setProducts(items);

        // Optional: also fetch from affordable API and merge
        // const affRes = await fetch(`${API_AFFORDABLE}?search=${encodeURIComponent(query)}`);
        // const affData = await affRes.json();
        // const affItems = Array.isArray(affData) ? affData : affData?.products || [];
        // setProducts([...items, ...affItems]);
      } catch (err: any) {
        setError(err.message || "Search failed");
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[#f7ecd7]">
            <Search className="h-6 w-6" />
            Search Results
          </h1>
          <p className="text-[#cdbf9e] mt-1">
            {loading ? "Searching..." : `Found ${products.length} products for "${query}"`}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg text-[#cdbf9e]">No products found for "{query}"</p>
            <p className="text-sm text-[#cdbf9e] mt-2">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}