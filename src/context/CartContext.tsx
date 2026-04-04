import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Product as UiProduct } from "@/data/products";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.jsgallor.com";
const CART_BASE = `${API_BASE}/api/midrange/cart`;
const PRODUCTS_BASE = `${API_BASE}/api/midrange/products`;

const LS_TOKEN_KEY = "midrange_token";
const LS_GUEST_CART_KEY = "midrange_cart_guest";
const LS_USER_KEY = "midrange_user";

// -------------------- Types --------------------
type StoredCartItem = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  attributes?: {
    size?: string | null;
    color?: string | null;
    fabric?: string | null;
  };
  productSnapshot?: CartProduct;
};

type BackendProduct = {
  _id: string;
  name: string;
  category: string;
  description?: string;
  shortDescription?: string;
  price: number;
  discount?: number;
  gst?: number;
  isCustomized?: boolean;
  quantity: number;
  availability?: string;
  status?: string;
  tier?: string;
  image: string;
  galleryImages?: string[];
  material?: string;
  color?: string;
  variants?: Array<{
    _id: string;
    attributes: {
      size?: string;
      color?: string;
      fabric?: string;
    };
    price: number;
    quantity: number;
    sku: string;
  }>;
  deliveryTime?: string;
};

type BackendCartItem = {
  _id: string;
  product: BackendProduct;
  variant?: BackendProduct['variants'][0] | null;
  quantity: number;
  attributes?: {
    size?: string | null;
    color?: string | null;
    fabric?: string | null;
  };
  productSnapshot?: CartProduct;
};

export interface CartProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  finalPrice: number;
  discountPercent: number;
  discountAmount: number;
  gst: number;
  isCustomized: boolean;
  image: string;
  galleryImages: string[];
  material?: string;
  color?: string;
  availability?: string;
  stockQty?: number;
  description?: string;
  variantId?: string | null;
  variantAttributes?: {
    size?: string | null;
    color?: string | null;
    fabric?: string | null;
  };
  deliveryTime?: string;
}

interface CartItem {
  _id?: string;
  product: CartProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (
    product: CartProduct | UiProduct,
    qty?: number,
    variantId?: string | null,
    attributes?: { size?: string; color?: string; fabric?: string }
  ) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  refreshCartFromBackend: () => Promise<void>;
  isHydrating: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// -------------------- Helpers --------------------
function getToken(): string | null {
  return localStorage.getItem(LS_TOKEN_KEY);
}

function getSavedUserId(): string | null {
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.id ? String(u.id) : u?._id ? String(u._id) : null;
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

function mapBackendProductToCartProduct(
  p: BackendProduct,
  variant?: BackendProduct['variants'][0]
): CartProduct {
  let originalPrice = Number(p.price || 0);
  if (variant) {
    originalPrice = Number(variant.price || originalPrice);
  }
  const discountPercent = Number(p.discount || 0);
  const { discountAmount, finalPrice } = computeDiscount(originalPrice, discountPercent);
  const gst = Number(p.gst || 0);
  const isCustomized = p.isCustomized || false;

  return {
    id: String(p._id),
    name: p.name,
    category: p.category,
    price: originalPrice,
    finalPrice,
    discountPercent,
    discountAmount,
    gst,
    isCustomized,
    image: p.image,
    galleryImages: Array.isArray(p.galleryImages) ? p.galleryImages : [],
    material: p.material,
    color: p.color,
    availability: p.availability,
    stockQty: p.quantity,
    description: p.description || p.shortDescription || "",
    variantId: variant?._id || null,
    variantAttributes: variant
      ? {
          size: variant.attributes?.size,
          color: variant.attributes?.color,
          fabric: variant.attributes?.fabric,
        }
      : undefined,
    deliveryTime: p.deliveryTime,
  };
}

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
    gst: (p as any).gst || 0,
    isCustomized: (p as any).isCustomized || false,
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

async function fetchMidrangeProductById(productId: string): Promise<BackendProduct | null> {
  try {
    const res = await fetch(`${PRODUCTS_BASE}/${productId}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const p = (json?.data ?? json) as BackendProduct;
    if (!p) return null;
    if (String(p.tier) !== "mid_range") return null;
    if (String(p.status) !== "approved") return null;
    return p;
  } catch {
    return null;
  }
}

// -------------------- Provider --------------------
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
  const [error, setError] = useState<string | null>(null);
  const didMergeRef = useRef(false);
  const refreshInProgressRef = useRef(false);

  // Persist guest cart (with full snapshot)
  useEffect(() => {
    if (!isLoggedIn() && stored.length > 0) {
      localStorage.setItem(LS_GUEST_CART_KEY, JSON.stringify(stored));
    }
  }, [stored]);

  // ---------- Guest operations (store snapshot) ----------
  const guestAdd = (cartProduct: CartProduct, qty: number) => {
    const addQty = Math.max(1, Number(qty) || 1);
    setStored((prev) => {
      const existing = prev.find(
        (x) =>
          x.productId === cartProduct.id &&
          (x.variantId || null) === (cartProduct.variantId || null)
      );
      if (existing) {
        return prev.map((x) =>
          x.productId === cartProduct.id &&
          (x.variantId || null) === (cartProduct.variantId || null)
            ? { ...x, quantity: x.quantity + addQty, productSnapshot: cartProduct }
            : x
        );
      }
      return [
        ...prev,
        {
          productId: cartProduct.id,
          variantId: cartProduct.variantId || null,
          quantity: addQty,
          attributes: cartProduct.variantAttributes || {},
          productSnapshot: cartProduct,
        },
      ];
    });
  };

  const guestRemove = (productId: string, variantId?: string | null) => {
    setStored((prev) =>
      prev.filter(
        (x) => !(x.productId === productId && (x.variantId || null) === (variantId || null))
      )
    );
  };

  const guestUpdateQty = (productId: string, variantId: string | null | undefined, quantity: number) => {
    const q = Number(quantity);
    if (!q || q <= 0) {
      guestRemove(productId, variantId);
      return;
    }
    setStored((prev) =>
      prev.map((x) =>
        x.productId === productId && (x.variantId || null) === (variantId || null)
          ? { ...x, quantity: q }
          : x
      )
    );
  };

  const guestClear = () => {
    setStored([]);
    setItems([]);
    localStorage.removeItem(LS_GUEST_CART_KEY);
  };

  // Helper to generate consistent item ID for guest carts
  const getGuestItemId = (productId: string, variantId?: string | null): string => {
    return variantId ? `${productId}:${variantId}` : productId;
  };

  // ---------- Hydration (from backend or guest storage) ----------
  const refreshCartFromBackend = async () => {
    // Prevent multiple simultaneous refresh calls
    if (refreshInProgressRef.current) {
      return;
    }

    refreshInProgressRef.current = true;
    setIsHydrating(true);
    setError(null);

    try {
      if (isLoggedIn()) {
        const userId = getSavedUserId();
        if (!userId) {
          setItems([]);
          return;
        }
        
        const res = await apiFetch(`${CART_BASE}/${userId}`, { method: "GET" });
        
        if (!res.ok) {
          if (res.status === 404) {
            setItems([]);
          } else {
            throw new Error(`Failed to fetch cart: ${res.status}`);
          }
          return;
        }
        
        const json = await res.json();
        const backendItems: BackendCartItem[] = json?.data?.items ?? [];

        const mapped: CartItem[] = backendItems.map((it) => {
          let product: CartProduct;
          if (it.productSnapshot) {
            product = it.productSnapshot as CartProduct;
          } else {
            product = mapBackendProductToCartProduct(it.product, it.variant);
          }
          return {
            _id: it._id,
            product,
            quantity: Math.max(1, Number(it.quantity) || 1),
          };
        });

        setItems(mapped);
        return;
      }

      // Guest: restore from stored snapshots
      if (stored.length === 0) {
        setItems([]);
        return;
      }

      // If stored items have productSnapshot, use them directly
      const hasAllSnapshots = stored.every((x) => x.productSnapshot);
      if (hasAllSnapshots) {
        const guestItems: CartItem[] = stored.map((x) => ({
          _id: getGuestItemId(x.productId, x.variantId),
          product: x.productSnapshot!,
          quantity: x.quantity,
        }));
        setItems(guestItems);
        return;
      }

      // Fallback: fetch each product from API (legacy)
      const results = await Promise.all(
        stored.map(async (it) => {
          const p = await fetchMidrangeProductById(it.productId);
          if (!p) return null;
          let variant = null;
          if (it.variantId && p.variants) {
            variant = p.variants.find((v) => String(v._id) === String(it.variantId));
          }
          const cartProduct = mapBackendProductToCartProduct(p, variant);
          return {
            _id: getGuestItemId(it.productId, it.variantId),
            product: cartProduct,
            quantity: Math.max(1, Number(it.quantity) || 1),
          } as CartItem;
        })
      );
      
      const cleaned = results.filter(Boolean) as CartItem[];
      setItems(cleaned);
      
      // update stored with snapshots for future
      setStored(
        cleaned.map((x) => ({
          productId: x.product.id,
          variantId: x.product.variantId,
          quantity: x.quantity,
          attributes: x.product.variantAttributes || {},
          productSnapshot: x.product,
        }))
      );
    } catch (err) {
      console.error("Error refreshing cart:", err);
      setError(err instanceof Error ? err.message : "Failed to load cart");
      toast.error("Failed to load cart. Please refresh the page.");
    } finally {
      setIsHydrating(false);
      refreshInProgressRef.current = false;
    }
  };

  // Merge guest → backend after login
  const mergeGuestToBackendIfNeeded = async () => {
    if (!isLoggedIn()) return;
    if (didMergeRef.current) return;
    didMergeRef.current = true;

    if (stored.length > 0) {
      try {
        // Send full snapshot to backend
        const res = await apiFetch(CART_BASE, {
          method: "PUT",
          body: JSON.stringify({
            items: stored.map((x) => ({
              productId: x.productId,
              variantId: x.variantId,
              quantity: x.quantity,
              attributes: x.attributes,
              productSnapshot: x.productSnapshot,
            })),
          }),
        });

        if (res.ok) {
          setStored([]);
          localStorage.removeItem(LS_GUEST_CART_KEY);
        }
      } catch (err) {
        console.error("Error merging guest cart:", err);
      }
    }
    await refreshCartFromBackend();
  };

  useEffect(() => {
    mergeGuestToBackendIfNeeded();
    if (!isLoggedIn()) {
      refreshCartFromBackend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      refreshCartFromBackend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stored)]);

  // ---------- Public actions ----------
  const addToCart = async (
    product: CartProduct | UiProduct,
    qty: number = 1,
    variantId?: string | null,
    attributes?: { size?: string; color?: string; fabric?: string }
  ) => {
    const addQty = Math.max(1, Number(qty) || 1);
    let cartProduct: CartProduct;
    
    if (isCartProduct(product)) {
      cartProduct = product;
    } else {
      cartProduct = uiProductToCartProduct(product);
    }

    // Override variantId and attributes if provided
    const finalVariantId = variantId !== undefined ? variantId : cartProduct.variantId;
    const finalAttributes = attributes || cartProduct.variantAttributes || {};
    const finalCartProduct = {
      ...cartProduct,
      variantId: finalVariantId,
      variantAttributes: finalAttributes,
    };

    if (!isLoggedIn()) {
      guestAdd(finalCartProduct, addQty);
      setItems((prev) => {
        const existing = prev.find(
          (x) =>
            x.product.id === finalCartProduct.id &&
            (x.product.variantId || null) === (finalVariantId || null)
        );
        if (existing) {
          return prev.map((x) =>
            x.product.id === finalCartProduct.id &&
            (x.product.variantId || null) === (finalVariantId || null)
              ? { ...x, quantity: x.quantity + addQty }
              : x
          );
        }
        return [...prev, { 
          _id: getGuestItemId(finalCartProduct.id, finalVariantId),
          product: finalCartProduct, 
          quantity: addQty 
        }];
      });
      toast.success(`Added ${finalCartProduct.name} to cart`);
      return;
    }

    try {
      const res = await apiFetch(`${CART_BASE}/add`, {
        method: "POST",
        body: JSON.stringify({
          productId: finalCartProduct.id,
          variantId: finalVariantId,
          quantity: addQty,
          attributes: finalAttributes,
          productSnapshot: finalCartProduct,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add to cart");
      }

      await refreshCartFromBackend();
      toast.success(`Added ${finalCartProduct.name} to cart`);
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast.error(err instanceof Error ? err.message : "Failed to add to cart");
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!isLoggedIn()) {
      const [pid, vid] = itemId.split(':');
      guestRemove(pid, vid || null);
      setItems((prev) =>
        prev.filter((x) => {
          const xId = getGuestItemId(x.product.id, x.product.variantId);
          return xId !== itemId;
        })
      );
      toast.success("Item removed from cart");
      return;
    }

    try {
      const res = await apiFetch(`${CART_BASE}/item/${itemId}`, { method: "DELETE" });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to remove item");
      }

      await refreshCartFromBackend();
      toast.success("Item removed from cart");
    } catch (err) {
      console.error("Error removing from cart:", err);
      toast.error(err instanceof Error ? err.message : "Failed to remove item");
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    const q = Math.max(1, Number(quantity));
    
    if (!isLoggedIn()) {
      const [pid, vid] = itemId.split(':');
      guestUpdateQty(pid, vid || null, q);
      setItems((prev) =>
        prev.map((x) => {
          const xId = getGuestItemId(x.product.id, x.product.variantId);
          if (xId === itemId) {
            return { ...x, quantity: q };
          }
          return x;
        })
      );
      return;
    }

    try {
      const res = await apiFetch(`${CART_BASE}/item/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: q }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update quantity");
      }

      await refreshCartFromBackend();
    } catch (err) {
      console.error("Error updating quantity:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update quantity");
      // Refresh to revert any optimistic updates
      await refreshCartFromBackend();
    }
  };

  const clearCart = async () => {
    if (!isLoggedIn()) {
      guestClear();
      toast.message("Cart cleared");
      return;
    }

    try {
      const res = await apiFetch(CART_BASE, { method: "DELETE" });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to clear cart");
      }

      await refreshCartFromBackend();
      toast.message("Cart cleared");
    } catch (err) {
      console.error("Error clearing cart:", err);
      toast.error(err instanceof Error ? err.message : "Failed to clear cart");
    }
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