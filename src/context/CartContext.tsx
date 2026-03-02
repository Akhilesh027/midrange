// src/context/CartContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Product as UiProduct } from "@/data/products";

/**
 * ✅ Backend Cart APIs (protected)
 * GET    /api/midrange/cart/:id        ✅ (your updated route)
 * PUT    /api/midrange/cart
 * POST   /api/midrange/cart/add
 * PATCH  /api/midrange/cart/item/:productId
 * DELETE /api/midrange/cart/item/:productId
 * DELETE /api/midrange/cart
 */

const API_BASE = "https://api.jsgallor.com";
const CART_BASE = `${API_BASE}/api/midrange/cart`;
const PRODUCTS_BASE = `${API_BASE}/api/midrange/products`; // ✅ for guest hydration

const LS_TOKEN_KEY = "midrange_token";
const LS_GUEST_CART_KEY = "midrange_cart_guest";
const LS_USER_KEY = "midrange_user";

const DISCOUNT_PERCENT = 10;

// --------------------
// Types
// --------------------
type StoredCartItem = { productId: string; quantity: number };

type BackendProduct = {
  _id: string;
  name: string;
  category: string;
  description?: string;
  shortDescription?: string;

  price: number;
  quantity: number;
  availability?: "In Stock" | "Low Stock" | "Out of Stock" | string;

  status?: "pending" | "approved" | "rejected" | string;
  tier?: "affordable" | "mid_range" | "luxury" | string;

  image: string;
  galleryImages?: string[];

  material?: string;
  color?: string;
};

type BackendCartItem = {
  product: BackendProduct;
  quantity: number;
};

export interface CartProduct {
  id: string;

  name: string;
  category: string;

  price: number;
  finalPrice: number;
  discountPercent: number;
  discountAmount: number;

  image: string;
  galleryImages: string[];

  material?: string;
  color?: string;
  availability?: string;
  stockQty?: number;

  description?: string;
}

interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];

  addToCart: (product: CartProduct | UiProduct, qty?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;

  totalItems: number;
  totalPrice: number;

  refreshCartFromBackend: () => Promise<void>;
  isHydrating: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// --------------------
// Helpers
// --------------------
function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN_KEY);
}

function getSavedUserId(): string | null {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    // your auth context uses "id"
    return u?.id ? String(u.id) : null;
  } catch {
    return null;
  }
}

function isLoggedIn(): boolean {
  return !!getToken() && !!getSavedUserId();
}

function computeDiscount(price: number, percent: number) {
  const discountAmount = Math.round((Number(price || 0) * percent) / 100);
  const finalPrice = Number(price || 0) - discountAmount;
  return { discountAmount, finalPrice };
}

function mapBackendProductToCartProduct(p: BackendProduct): CartProduct {
  const { discountAmount, finalPrice } = computeDiscount(p.price, DISCOUNT_PERCENT);

  return {
    id: String(p._id),

    name: p.name,
    category: p.category,

    price: Number(p.price || 0),
    finalPrice,
    discountPercent: DISCOUNT_PERCENT,
    discountAmount,

    image: p.image,
    galleryImages: Array.isArray(p.galleryImages) ? p.galleryImages : [],

    material: p.material,
    color: p.color,
    availability: p.availability,
    stockQty: p.quantity,

    description: p.description || p.shortDescription || "",
  };
}

// ✅ Converts OLD UI Product to CartProduct (for temporary compatibility)
function uiProductToCartProduct(p: UiProduct): CartProduct {
  const original = Number((p as any).oldPrice ?? (p as any).newPrice ?? 0);
  const final = Number((p as any).newPrice ?? original);

  const discountAmount = Math.max(0, original - final);
  const discountPercent = original > 0 ? Math.round((discountAmount / original) * 100) : 0;

  const galleryImages = [(p as any).hoverImage, (p as any).image].filter(Boolean) as string[];

  return {
    id: String((p as any).id),

    name: (p as any).name,
    category: (p as any).category,

    price: original,
    finalPrice: final,
    discountPercent,
    discountAmount,

    image: (p as any).image,
    galleryImages,

    material: (p as any).material,
    color: (p as any).color,
    availability: (p as any).inStock ? "In Stock" : "Out of Stock",
    stockQty: (p as any).quantity,

    description: (p as any).description ?? "",
  };
}

function isCartProduct(p: any): p is CartProduct {
  return (
    p &&
    typeof p === "object" &&
    typeof p.id === "string" &&
    typeof p.finalPrice === "number" &&
    typeof p.price === "number"
  );
}

async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(url, { ...options, headers });
}

// ✅ Guest product hydration (public endpoint)
async function fetchMidrangeProductById(productId: string): Promise<BackendProduct | null> {
  try {
    const res = await fetch(`${PRODUCTS_BASE}/${productId}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;

    const json = await res.json();
    // supports: {data: {...}} OR direct object
    const p = (json?.data ?? json) as BackendProduct;

    // keep only mid_range + approved (your rule)
    if (!p) return null;
    if (String((p as any).tier) !== "mid_range") return null;
    if (String((p as any).status) !== "approved") return null;

    return p;
  } catch {
    return null;
  }
}

// --------------------
// Provider
// --------------------
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stored, setStored] = useState<StoredCartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LS_GUEST_CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);

  // avoid double merge in StrictMode
  const didMergeRef = useRef(false);

  // persist guest cart
  useEffect(() => {
    localStorage.setItem(LS_GUEST_CART_KEY, JSON.stringify(stored));
  }, [stored]);

  // ----------------------------
  // Guest operations
  // ----------------------------
  const guestAdd = (productId: string, qty: number) => {
    const addQty = Math.max(1, Number(qty) || 1);
    setStored((prev) => {
      const existing = prev.find((x) => x.productId === productId);
      if (existing) {
        return prev.map((x) =>
          x.productId === productId ? { ...x, quantity: x.quantity + addQty } : x
        );
      }
      return [...prev, { productId, quantity: addQty }];
    });
  };

  const guestRemove = (productId: string) => {
    setStored((prev) => prev.filter((x) => x.productId !== productId));
  };

  const guestUpdateQty = (productId: string, quantity: number) => {
    const q = Number(quantity);
    if (!q || q <= 0) return guestRemove(productId);
    setStored((prev) =>
      prev.map((x) => (x.productId === productId ? { ...x, quantity: q } : x))
    );
  };

  const guestClear = () => {
    setStored([]);
    setItems([]);
  };

  // ----------------------------
  // Hydration
  // ----------------------------
  const refreshCartFromBackend = async () => {
    setIsHydrating(true);

    try {
      // ✅ Logged-in: use GET /cart/:id
      if (isLoggedIn()) {
        const userId = getSavedUserId();
        if (!userId) {
          setItems([]);
          return;
        }

        const res = await apiFetch(`${CART_BASE}/${userId}`, { method: "GET" });

        if (!res.ok) {
          setItems([]);
          return;
        }

        const json = await res.json();
        const backendItems: BackendCartItem[] = json?.data?.items ?? [];

        const mapped: CartItem[] = backendItems.map((it) => ({
          product: mapBackendProductToCartProduct(it.product),
          quantity: Math.max(1, Number(it.quantity) || 1),
        }));

        setItems(mapped);
        return;
      }

      // ✅ Guest: hydrate using /api/midrange/products/:id
      if (stored.length === 0) {
        setItems([]);
        return;
      }

      const results = await Promise.all(
        stored.map(async (it) => {
          const p = await fetchMidrangeProductById(it.productId);
          if (!p) return null;
          return {
            product: mapBackendProductToCartProduct(p),
            quantity: Math.max(1, Number(it.quantity) || 1),
          } as CartItem;
        })
      );

      const cleaned = results.filter(Boolean) as CartItem[];
      setItems(cleaned);

      // also clean local stored
      setStored(
        cleaned.map((x) => ({
          productId: x.product.id,
          quantity: x.quantity,
        }))
      );
    } finally {
      setIsHydrating(false);
    }
  };

  // ✅ Merge guest → backend once after login (PUT /cart)
  const mergeGuestToBackendIfNeeded = async () => {
    if (!isLoggedIn()) return;

    if (didMergeRef.current) return;
    didMergeRef.current = true;

    // only merge if guest cart exists
    if (stored.length > 0) {
      await apiFetch(CART_BASE, {
        method: "PUT",
        body: JSON.stringify({
          items: stored.map((x) => ({
            productId: x.productId,
            quantity: x.quantity,
          })),
        }),
      });

      // clear guest after merge
      setStored([]);
      localStorage.removeItem(LS_GUEST_CART_KEY);
    }

    await refreshCartFromBackend();
  };

  // On mount
  useEffect(() => {
    mergeGuestToBackendIfNeeded();
    // if not logged-in, hydrate guest once on mount
    if (!isLoggedIn()) refreshCartFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If guest cart changes, re-hydrate guest view
  useEffect(() => {
    if (!isLoggedIn()) refreshCartFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stored)]);

  // ----------------------------
  // Public actions
  // ----------------------------
  const addToCart = async (product: CartProduct | UiProduct, qty: number = 1) => {
    const addQty = Math.max(1, Number(qty) || 1);

    const cartProduct: CartProduct = isCartProduct(product)
      ? product
      : uiProductToCartProduct(product);

    // Guest mode
    if (!isLoggedIn()) {
      guestAdd(cartProduct.id, addQty);

      // optimistic UI
      setItems((prev) => {
        const ex = prev.find((x) => x.product.id === cartProduct.id);
        if (ex) {
          return prev.map((x) =>
            x.product.id === cartProduct.id ? { ...x, quantity: x.quantity + addQty } : x
          );
        }
        return [...prev, { product: cartProduct, quantity: addQty }];
      });

      return;
    }

    // Backend mode (POST /cart/add)
    await apiFetch(`${CART_BASE}/add`, {
      method: "POST",
      body: JSON.stringify({ productId: cartProduct.id, quantity: addQty }),
    });

    await refreshCartFromBackend();
  };

  const removeFromCart = async (productId: string) => {
    // Guest mode
    if (!isLoggedIn()) {
      guestRemove(productId);
      setItems((prev) => prev.filter((x) => x.product.id !== productId));
      return;
    }

    await apiFetch(`${CART_BASE}/item/${productId}`, { method: "DELETE" });
    await refreshCartFromBackend();
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    const q = Number(quantity);

    // Guest mode
    if (!isLoggedIn()) {
      guestUpdateQty(productId, q);

      if (!q || q <= 0) {
        setItems((prev) => prev.filter((x) => x.product.id !== productId));
      } else {
        setItems((prev) =>
          prev.map((x) => (x.product.id === productId ? { ...x, quantity: q } : x))
        );
      }
      return;
    }

    await apiFetch(`${CART_BASE}/item/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: q }),
    });

    await refreshCartFromBackend();
  };

  const clearCart = async () => {
    // Guest mode
    if (!isLoggedIn()) {
      guestClear();
      return;
    }

    await apiFetch(CART_BASE, { method: "DELETE" });
    await refreshCartFromBackend();
  };

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + item.product.finalPrice * item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        refreshCartFromBackend,
        isHydrating,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
