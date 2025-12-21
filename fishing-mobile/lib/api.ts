// fishing-mobile/lib/api.ts
// Updated with JWT authentication support
// FIXED: Removed manual Content-Type for FormData
// ADDED: Debug logging for auth issues

import { API_BASE, bust } from "@/lib/config";
import { supabase } from "@/lib/supabase";

// ============================================
// TYPES
// ============================================
export type TopKItem = {
  species_id: string;
  common_name: string;
  scientific_name: string;
  confidence: number;
};

export type PredictResp = {
  engine: "onnx" | "torch" | "mock";
  label: string;
  species_id: string;
  confidence: number;
  topk: TopKItem[];
  num_classes: number;
  image_sha1: string;
};

// ============================================
// AUTH HELPERS
// ============================================

/**
 * Get the current JWT token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // 🔍 DEBUG: Log session state
    if (__DEV__) {
      console.log("🔐 Auth Debug:", {
        hasSession: !!session,
        hasToken: !!session?.access_token,
        userId: session?.user?.id ? session.user.id.slice(0, 8) + "..." : "none",
        error: error?.message,
      });
    }
    
    return session?.access_token || null;
  } catch (e) {
    console.error("❌ Failed to get auth token:", e);
    return null;
  }
}

/**
 * Create headers with Authorization token if available
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    if (__DEV__) {
      console.log("✅ Auth header set, token length:", token.length);
    }
  } else {
    if (__DEV__) {
      console.warn("⚠️ No auth token available - request will be unauthenticated");
    }
  }
  return headers;
}

// ============================================
// EXISTING API FUNCTIONS (Updated with Auth)
// ============================================

export async function predictFish(fileUri: string, mime = "image/jpeg"): Promise<PredictResp> {
  const base = API_BASE.replace(/\/+$/, "");
  const form = new FormData();
  form.append("file", { uri: fileUri, name: "photo.jpg", type: mime } as any);

  // Get auth headers
  const authHeaders = await getAuthHeaders();

  // ✅ FIX: Don't set Content-Type manually for FormData
  const r = await fetch(`${base}/predict`, {
    method: "POST",
    body: form,
    headers: authHeaders,
  });
  if (!r.ok) throw new Error(`predict ${r.status}`);
  return r.json();
}

export async function sendFeedback(params: {
  image_sha1: string;
  chosen_species_id: string;
  topk: TopKItem[];
  user_id?: string | null;
}) {
  const base = API_BASE.replace(/\/+$/, "");
  const authHeaders = await getAuthHeaders();

  const r = await fetch(`${base}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      image_sha1: params.image_sha1,
      chosen_species_id: params.chosen_species_id,
      topk: params.topk,
      user_id: params.user_id ?? null,
      source: "app",
    }),
  });
  if (!r.ok) throw new Error(`feedback ${r.status}`);
  return r.json();
}

// ============================================
// HELPER FUNCTIONS FOR AUTHENTICATED REQUESTS
// ============================================

export async function apiGet<T>(endpoint: string): Promise<T> {
  const base = API_BASE.replace(/\/+$/, "");
  const authHeaders = await getAuthHeaders();

  const r = await fetch(`${base}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  });

  if (!r.ok) {
    const error = await r.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${r.status}`);
  }

  return r.json();
}

export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  const base = API_BASE.replace(/\/+$/, "");
  const authHeaders = await getAuthHeaders();

  const r = await fetch(`${base}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(data),
  });

  if (!r.ok) {
    const error = await r.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${r.status}`);
  }

  return r.json();
}

/**
 * Make an authenticated POST request with FormData (for file uploads)
 * ✅ FIX: Don't set Content-Type - fetch sets it automatically with boundary
 */
export async function apiPostForm<T>(endpoint: string, formData: FormData): Promise<T> {
  const base = API_BASE.replace(/\/+$/, "");
  const authHeaders = await getAuthHeaders();

  if (__DEV__) {
    console.log(`📤 POST ${endpoint} with auth:`, !!authHeaders["Authorization"]);
  }

  const r = await fetch(`${base}${endpoint}`, {
    method: "POST",
    headers: authHeaders,  // No Content-Type here!
    body: formData,
  });

  // 🔍 DEBUG: Log response
  if (__DEV__) {
    console.log(`📥 Response ${endpoint}:`, r.status);
  }

  if (!r.ok) {
    const error = await r.json().catch(() => ({ detail: "Request failed" }));
    console.error(`❌ API Error ${endpoint}:`, error);
    throw new Error(error.detail || `HTTP ${r.status}`);
  }

  const data = await r.json();
  
  // 🔍 DEBUG: Check if catch was saved
  if (__DEV__ && endpoint.includes("identify")) {
    console.log("🐟 Identify response:", {
      catch_id: data.catch_id,
      authenticated: data.authenticated,
      user_id: data.user_id ? data.user_id.slice(0, 8) + "..." : "none",
      saved_path: data.saved_path ? "✅" : "❌",
    });
  }

  return data;
}

export async function apiPatch<T>(endpoint: string, data: any): Promise<T> {
  const base = API_BASE.replace(/\/+$/, "");
  const authHeaders = await getAuthHeaders();

  const r = await fetch(`${base}${endpoint}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(data),
  });

  if (!r.ok) {
    const error = await r.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${r.status}`);
  }

  return r.json();
}

export async function apiDelete(endpoint: string): Promise<void> {
  const base = API_BASE.replace(/\/+$/, "");
  const authHeaders = await getAuthHeaders();

  const r = await fetch(`${base}${endpoint}`, {
    method: "DELETE",
    headers: authHeaders,
  });

  if (!r.ok) {
    const error = await r.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${r.status}`);
  }
}

// ============================================
// CATCH-SPECIFIC API FUNCTIONS
// ============================================

export type CatchRead = {
  id: number;
  image_path: string;
  species_label: string;
  species_confidence: number;
  created_at: string;
  user_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  weather_json?: string | null;
};

export async function getCatches(limit: number = 200): Promise<CatchRead[]> {
  return apiGet<CatchRead[]>(`/catches?limit=${limit}`);
}

export async function getMyCatches(limit: number = 200): Promise<CatchRead[]> {
  return apiGet<CatchRead[]>(`/catches/me?limit=${limit}`);
}

export async function getCatch(catchId: number): Promise<CatchRead> {
  return apiGet<CatchRead>(`/catches/${catchId}`);
}

export async function updateCatch(
  catchId: number,
  data: { species_label?: string; species_confidence?: number }
): Promise<CatchRead> {
  return apiPatch<CatchRead>(`/catches/${catchId}`, data);
}

export async function deleteCatch(catchId: number): Promise<void> {
  return apiDelete(`/catches/${catchId}`);
}

/**
 * Identify a fish from an image (with auth)
 * ✅ This is the main upload function used by index.tsx
 */
export async function identifyFish(
  imageUri: string,
  options: {
    persist?: boolean;
    latitude?: number;
    longitude?: number;
  } = {}
): Promise<{
  file_name: string;
  saved_path: string | null;
  content_type: string;
  prediction: { label: string; confidence: number };
  catch_id: number | null;
  created_at: string | null;
  lat: number | null;
  lng: number | null;
  weather: any | null;
  authenticated?: boolean;
  user_id?: string;
}> {
  const formData = new FormData();

  // Add image file
  const filename = imageUri.split("/").pop() || "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("file", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  // Add optional parameters
  if (options.persist !== undefined) {
    formData.append("persist", String(options.persist));
  }
  if (options.latitude !== undefined) {
    formData.append("latitude", String(options.latitude));
  }
  if (options.longitude !== undefined) {
    formData.append("longitude", String(options.longitude));
  }

  if (__DEV__) {
    console.log("🐟 identifyFish called with:", {
      imageUri: imageUri.slice(-30),
      persist: options.persist,
      hasCoords: !!(options.latitude && options.longitude),
    });
  }

  return apiPostForm("/fish/identify", formData);
}

// front_end/lib/api.ts

// ... (保留之前的代码)

// ✅ 新增：鱼种数据类型 (对应后端的 SpeciesRead)
export type SpeciesRead = {
  id: number;
  common_name: string;
  icon_path: string | null;
  rarity: string;
  points: number;
  description?: string | null;
  // ... 其他字段按需添加
};

// ✅ 新增：获取全量图鉴数据
export async function getAllSpecies(): Promise<SpeciesRead[]> {
  // 获取 1000 条，确保能拿完所有鱼
  return apiGet<SpeciesRead[]>("/species?limit=1000");
}