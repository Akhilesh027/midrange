// src/pages/SearchPage.tsx
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";

const API_MIDRANGE = "https://api.jsgallor.com/api/midrange/products";

type Product = {
  _id: string;
  name: string;
  price: number;
  image?: string;
  images?: string[];
  category: string;
  subcategory?: string;
  description?: string;
  sku?: string;
};

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchedRef = useRef(false);

  // Fetch ALL products by paginating through all pages
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchAllPages = async () => {
      setLoading(true);
      let allItems: Product[] = [];
      let page = 1;
      const limit = 100; // max allowed by backend
      let totalPages = 1;

      try {
        while (page <= totalPages) {
          const url = `${API_MIDRANGE}?limit=${limit}&page=${page}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          // Extract items from { data: [] } response
          const items: Product[] = data?.data || [];
          allItems.push(...items);
          // Update totalPages from pagination metadata
          if (data?.pagination?.totalPages) {
            totalPages = data.pagination.totalPages;
          } else if (items.length < limit) {
            // If no pagination object but fewer items than limit, this is the last page
            break;
          }
          page++;
        }
        setAllProducts(allItems);
        console.log(`Fetched ${allItems.length} products across ${page - 1} pages`);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load products. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllPages();
  }, []);

  // Client-side filtering
  useEffect(() => {
    if (!query.trim()) {
      setFilteredProducts([]);
      return;
    }
    const lowerQuery = query.toLowerCase().trim();
    const results = allProducts.filter(p =>
      p.name?.toLowerCase().includes(lowerQuery) ||
      p.category?.toLowerCase().includes(lowerQuery) ||
      p.subcategory?.toLowerCase().includes(lowerQuery) ||
      p.description?.toLowerCase().includes(lowerQuery) ||
      p.sku?.toLowerCase().includes(lowerQuery)
    );
    setFilteredProducts(results);
  }, [query, allProducts]);

  const normaliseImage = (p: Product) => p.image ?? (p.images?.[0]) ?? "/placeholder-image.jpg";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[#f7ecd7]">
            <Search className="h-6 w-6" />
            Search Results
          </h1>
          <div className="text-[#cdbf9e] mt-1">
            {!query.trim()
              ? "Enter a search term"
              : loading
              ? "Loading products..."
              : `Found ${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""} for "${query}"`}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        )}

        {!loading && query.trim() && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg text-[#cdbf9e]">No products found for "{query}"</p>
            <p className="text-sm text-[#cdbf9e] mt-2">
              Try a different search term
            </p>
          </div>
        )}

        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product._id}
                product={{
                  ...product,
                  image: normaliseImage(product),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}