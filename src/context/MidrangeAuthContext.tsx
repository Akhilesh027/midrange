// src/context/MidrangeAuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

export interface MidrangeUser {
  id: string;
  fullName?: string; // some APIs send fullName
  name?: string;     // google may send name
  email: string;
  phone?: string;

  role: string;
  platform: string;

  membershipLevel?: "standard" | "premium" | "elite";
  membershipBadge?: string;

  isVerified: boolean;
  loyaltyPoints?: number;

  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string;

  avatar?: string;
  preferences?: {
    newsletter: boolean;
    marketingEmails: boolean;
    productUpdates: boolean;
  };

  lastLogin?: string;
  createdAt?: string;
}

interface AuthResponse {
  success?: boolean;
  message?: string;
  token?: string;
  customer?: any; // backend shape can vary; we normalize
  user?: any;     // googleAuth may return `user`
  errors?: string[];
  error?: string; // some endpoints use `error`
}

interface AuthContextType {
  user: MidrangeUser | null;
  loading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  signup: (
    fullName: string,
    email: string,
    phone: string,
    password: string
  ) => Promise<boolean>;

  // ✅ NEW
  googleLogin: (credential: string) => Promise<boolean>;

  logout: () => Promise<void>;

  updateProfile: (profileData: any) => Promise<boolean>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<boolean>;
  upgradeMembership: (membershipLevel: "standard" | "premium" | "elite") => Promise<boolean>;

  getToken: () => string | null;
  refreshUserData: () => Promise<void>;
}

const MidrangeAuthContext = createContext<AuthContextType | undefined>(undefined);

/** -----------------------------
 * CONFIG
 * ---------------------------- */
const ORIGIN_BASE = "https://api.jsgallor.com"; // axios baseURL
const API_BASE_URL = `${ORIGIN_BASE}/api/midrange`;        // midrange routes
const GOOGLE_AUTH_URL = `${ORIGIN_BASE}/api/auth/google`;  // common google route

const LS_TOKEN_KEY = "midrange_token";
const LS_USER_KEY = "midrange_user";

const midrangeAxios = axios.create({
  baseURL: ORIGIN_BASE,
  headers: { "Content-Type": "application/json" },
});

/** -----------------------------
 * HELPERS
 * ---------------------------- */
function setAuthHeader(token: string | null) {
  if (token) {
    midrangeAxios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete midrangeAxios.defaults.headers.common["Authorization"];
  }
}

function buildAvatar(email: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;
}

function normalizeUser(raw: any): MidrangeUser {
  const email = (raw?.email || "").toLowerCase().trim();

  return {
    id: raw?.id || raw?._id,
    // prefer fullName, fallback to name
    fullName: raw?.fullName || raw?.name || "",
    name: raw?.name || raw?.fullName || "",
    email,
    phone: raw?.phone || "",

    role: raw?.role || "customer",
    platform: raw?.platform || "midrange",

    membershipLevel: raw?.membershipLevel || "standard",
    membershipBadge: raw?.membershipBadge || "Standard",

    isVerified: !!raw?.isVerified,

    loyaltyPoints: raw?.loyaltyPoints || 0,
    totalOrders: raw?.totalOrders || 0,
    totalSpent: raw?.totalSpent || 0,

    lastOrderDate: raw?.lastOrderDate,
    lastLogin: raw?.lastLogin,
    createdAt: raw?.createdAt,

    avatar: raw?.avatar || buildAvatar(email),
    preferences: raw?.preferences,
  };
}

function pickCustomerFromResponse(data: AuthResponse) {
  // backend might return customer or user
  return data.customer || data.user || null;
}

/** -----------------------------
 * PROVIDER
 * ---------------------------- */
export const MidrangeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<MidrangeUser | null>(() => {
    try {
      const saved = localStorage.getItem(LS_USER_KEY);
      return saved ? normalizeUser(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // On mount: attach token header and verify with /profile
  useEffect(() => {
    const token = localStorage.getItem(LS_TOKEN_KEY);
    setAuthHeader(token);

    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        await refreshUserData();
      } catch (err: any) {
        const status = err?.response?.status;
        // only clear on invalid token
        if (status === 401 || status === 403) {
          localStorage.removeItem(LS_TOKEN_KEY);
          localStorage.removeItem(LS_USER_KEY);
          setAuthHeader(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** -----------------------------
   * AUTH METHODS
   * ---------------------------- */
  const signup = async (fullName: string, email: string, phone: string, password: string) => {
    try {
      const res = await midrangeAxios.post<AuthResponse>(`${API_BASE_URL}/signup`, {
        fullName,
        email,
        phone,
        password,
      });

      const data = res.data;
      const token = data.token;
      const customerRaw = pickCustomerFromResponse(data);

      if ((data.success ?? true) && token && customerRaw) {
        const customer = normalizeUser(customerRaw);

        localStorage.setItem(LS_TOKEN_KEY, token);
        localStorage.setItem(LS_USER_KEY, JSON.stringify(customer));
        setAuthHeader(token);
        setUser(customer);

        return true;
      }

      return false;
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data as AuthResponse;
        const msg = data.message || data.error || "Signup failed";
        if (data.errors?.length) throw new Error(`${msg}: ${data.errors.join(", ")}`);
        throw new Error(msg);
      }
      if (error.request) throw new Error("Cannot connect to server. Please check your connection.");
      throw new Error("Something went wrong. Please try again.");
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await midrangeAxios.post<AuthResponse>(`${API_BASE_URL}/login`, {
        email,
        password,
      });

      const data = res.data;
      const token = data.token;
      const customerRaw = pickCustomerFromResponse(data);

      if ((data.success ?? true) && token && customerRaw) {
        const customer = normalizeUser(customerRaw);

        localStorage.setItem(LS_TOKEN_KEY, token);
        localStorage.setItem(LS_USER_KEY, JSON.stringify(customer));
        setAuthHeader(token);
        setUser(customer);

        return true;
      }

      return false;
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data as AuthResponse;
        throw new Error(data.message || data.error || "Login failed");
      }
      if (error.request) throw new Error("Cannot connect to server. Please check your connection.");
      throw new Error("Something went wrong. Please try again.");
    }
  };

  // ✅ NEW: Google login for midrange
  const googleLogin = async (credential: string) => {
    try {
      const res = await midrangeAxios.post<AuthResponse>(GOOGLE_AUTH_URL, {
        credential,
        website: "mid",
      });

      const data = res.data;
      const token = data.token;
      const customerRaw = pickCustomerFromResponse(data);

      if (!(data.success ?? true)) {
        throw new Error(data.message || data.error || "Google auth failed");
      }
      if (!token || !customerRaw) {
        throw new Error("Invalid Google auth response (missing token/user).");
      }

      const customer = normalizeUser({
        ...customerRaw,
        // ensure platform is midrange in UI
        platform: customerRaw.platform || "midrange",
      });

      localStorage.setItem(LS_TOKEN_KEY, token);
      localStorage.setItem(LS_USER_KEY, JSON.stringify(customer));
      setAuthHeader(token);
      setUser(customer);

      return true;
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data as AuthResponse;
        throw new Error(data.message || data.error || "Google auth failed");
      }
      if (error.request) throw new Error("Cannot connect to server. Please check your connection.");
      throw new Error("Something went wrong. Please try again.");
    }
  };

  const logout = async () => {
    try {
      await midrangeAxios.post(`${API_BASE_URL}/logout`);
    } catch {
      // ignore
    } finally {
      localStorage.removeItem(LS_TOKEN_KEY);
      localStorage.removeItem(LS_USER_KEY);
      setAuthHeader(null);
      setUser(null);
    }
  };

  const refreshUserData = async () => {
    const token = localStorage.getItem(LS_TOKEN_KEY);
    setAuthHeader(token);

    const res = await midrangeAxios.get<AuthResponse>(`${API_BASE_URL}/profile`);
    const data = res.data;

    const customerRaw = pickCustomerFromResponse(data);
    if ((data.success ?? true) && customerRaw) {
      const customer = normalizeUser(customerRaw);
      localStorage.setItem(LS_USER_KEY, JSON.stringify(customer));
      setUser(customer);
      return;
    }

    throw new Error(data.message || data.error || "Failed to refresh profile");
  };

  const updateProfile = async (profileData: any) => {
    try {
      const res = await midrangeAxios.put<AuthResponse>(`${API_BASE_URL}/profile`, profileData);
      const data = res.data;

      const customerRaw = pickCustomerFromResponse(data);
      if ((data.success ?? true) && customerRaw) {
        const customer = normalizeUser(customerRaw);
        localStorage.setItem(LS_USER_KEY, JSON.stringify(customer));
        setUser((prev) => (prev ? { ...prev, ...customer } : customer));
        return true;
      }
      return false;
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data as AuthResponse;
        throw new Error(data.message || data.error || "Failed to update profile");
      }
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      const res = await midrangeAxios.put<AuthResponse>(`${API_BASE_URL}/change-password`, {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      return !!(res.data.success ?? true);
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data as AuthResponse;
        throw new Error(data.message || data.error || "Failed to change password");
      }
      throw error;
    }
  };

  const upgradeMembership = async (membershipLevel: "standard" | "premium" | "elite") => {
    try {
      const res = await midrangeAxios.put<AuthResponse>(`${API_BASE_URL}/upgrade-membership`, {
        membershipLevel,
      });

      const data = res.data;
      const token = data.token;
      const customerRaw = pickCustomerFromResponse(data);

      if ((data.success ?? true) && token && customerRaw) {
        const customer = normalizeUser(customerRaw);

        localStorage.setItem(LS_TOKEN_KEY, token);
        localStorage.setItem(LS_USER_KEY, JSON.stringify(customer));
        setAuthHeader(token);
        setUser((prev) => (prev ? { ...prev, ...customer } : customer));

        return true;
      }
      return false;
    } catch (error: any) {
      if (error.response) {
        const data = error.response.data as AuthResponse;
        throw new Error(data.message || data.error || "Failed to upgrade membership");
      }
      throw error;
    }
  };

  const getToken = () => localStorage.getItem(LS_TOKEN_KEY);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      signup,
      googleLogin, // ✅ exposed
      logout,
      updateProfile,
      changePassword,
      upgradeMembership,
      getToken,
      refreshUserData,
    }),
    [user, loading]
  );

  return (
    <MidrangeAuthContext.Provider value={value}>
      {children}
    </MidrangeAuthContext.Provider>
  );
};

export const useMidrangeAuth = (): AuthContextType => {
  const context = useContext(MidrangeAuthContext);
  if (!context) throw new Error("useMidrangeAuth must be used within a MidrangeAuthProvider");
  return context;
};

// ✅ Membership helper
export const useMembership = () => {
  const { user } = useMidrangeAuth();
  return {
    isPremium: user?.membershipLevel === "premium" || user?.membershipLevel === "elite",
    isElite: user?.membershipLevel === "elite",
    level: user?.membershipLevel || "standard",
    badge: user?.membershipBadge || "Standard",
  };
};