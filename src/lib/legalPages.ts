// src/lib/legalPages.ts
const API_BASE = "https://api.jsgallor.com";

// ✅ Use public endpoint – ask backend to implement:
// GET /api/public/legal-pages?website=...&type=...&status=published
const PUBLIC_API_URL = `${API_BASE}/api/public/legal-pages`;

// Fallback to admin endpoint (needs token)
const ADMIN_API_URL = `${API_BASE}/api/admin/legal-pages`;

export type Website = "affordable" | "midrange" | "luxury";
export type PageType =
  | "privacy_policy"
  | "terms_conditions"
  | "refund_policy"
  | "shipping_policy"
  | "about"
  | "contact";

export interface LegalPage {
  id: string;
  website: Website;
  type: PageType;
  title: string;
  slug: string;
  content: string;
  status: "draft" | "published";
  updatedAt: string;
}

async function fetchWithToken(url: string, params: URLSearchParams): Promise<LegalPage | null> {
  const token = localStorage.getItem("token") ||
                localStorage.getItem("adminToken") ||
                localStorage.getItem("luxury_auth_token");

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${url}?${params.toString()}`, { headers });
  if (!res.ok) return null;

  const data = await res.json();
  const pages = Array.isArray(data?.data) ? data.data : [];
  const page = pages[0];
  if (!page) return null;

  return {
    id: page._id,
    website: page.website,
    type: page.type,
    title: page.title,
    slug: page.slug,
    content: page.content,
    status: page.status,
    updatedAt: page.updatedAt,
  };
}

export async function getLegalPage(
  website: Website,
  type: PageType
): Promise<LegalPage | null> {
  const params = new URLSearchParams({
    website,
    type,
    status: "published",
  });

  // 1) Try public endpoint first
  try {
    const publicRes = await fetch(`${PUBLIC_API_URL}?${params.toString()}`);
    if (publicRes.ok) {
      const data = await publicRes.json();
      const pages = Array.isArray(data?.data) ? data.data : [];
      const page = pages[0];
      if (page) {
        return {
          id: page._id,
          website: page.website,
          type: page.type,
          title: page.title,
          slug: page.slug,
          content: page.content,
          status: page.status,
          updatedAt: page.updatedAt,
        };
      }
    }
  } catch (err) {
    console.warn("Public legal endpoint not available, falling back to admin endpoint");
  }

  // 2) Fallback to admin endpoint (if token exists)
  try {
    return await fetchWithToken(ADMIN_API_URL, params);
  } catch (err) {
    console.error("Failed to fetch legal page:", err);
    return null;
  }
}