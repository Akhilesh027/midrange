import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ✅ Use the same base and path as your product API
const API_BASE = import.meta.env.VITE_API_BASE || "https://api.jsgallor.com";
const WISHLIST_API = `${API_BASE}/api/midrange/wishlist`;   // matches backend routes

export interface Product {
  _id: string;
  id?: string;
  name: string;
  category?: string;
  description?: string;
  price: number;
  discount?: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  inStock?: boolean;
  colors?: string[];
  sizes?: string[];
  fabrics?: string[];
  quantity?: number;
  material?: string;
  rating?: number;
  reviews?: number;
  tags?: string[];
  [key: string]: any;
}

interface WishlistContextType {
  wishlist: Product[];
  loading: boolean;
  error: string | null;
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  refetchWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const getToken = () => localStorage.getItem("midrange_token");

// Authenticated fetch wrapper
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${res.status}`);
  }
  return res.json();
};

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(getToken());

  // Watch token changes (login/logout)
  useEffect(() => {
    const handleStorage = () => setToken(getToken());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Fetch wishlist from server
  const fetchWishlist = useCallback(async () => {
    if (!token) {
      setWishlist([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await authFetch(WISHLIST_API);
      setWishlist(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
      console.error("Failed to fetch wishlist:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const refetchWishlist = useCallback(async () => {
    await fetchWishlist();
  }, [fetchWishlist]);

  // Add product to wishlist
  const addToWishlist = useCallback(async (product: Product) => {
    if (!token) throw new Error("Not authenticated");

    setError(null);
    const productId = product._id || product.id;
    if (!productId) throw new Error("Product ID missing");

    try {
      const updatedWishlist = await authFetch(`${WISHLIST_API}/${productId}`, {
        method: "POST",
      });
      setWishlist(updatedWishlist);
    } catch (err: any) {
      setError(err.message);
      console.error("Failed to add to wishlist:", err);
      throw err;
    }
  }, [token]);

  // Remove product from wishlist
  const removeFromWishlist = useCallback(async (productId: string) => {
    if (!token) throw new Error("Not authenticated");

    setError(null);
    try {
      const updatedWishlist = await authFetch(`${WISHLIST_API}/${productId}`, {
        method: "DELETE",
      });
      setWishlist(updatedWishlist);
    } catch (err: any) {
      setError(err.message);
      console.error("Failed to remove from wishlist:", err);
      throw err;
    }
  }, [token]);

  const isInWishlist = useCallback((productId: string) => {
    return wishlist.some((item) => item._id === productId);
  }, [wishlist]);

  const clearWishlist = useCallback(() => {
    setWishlist([]);
  }, []);

  // Fetch when token changes
  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        error,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
        refetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};