// lib/sync.ts
// Updated with JWT authentication

import { API_BASE } from "@/lib/config";
import { getLocalCatches, updateLocalCatch, LocalCatch } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

/**
 * Get auth headers for API requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {}
  return {};
}

/**
 * Sync pending local catches to the server
 * Now uses JWT auth instead of X-User-Id header
 */
export async function syncPending(userId: string): Promise<void> {
  if (!userId) return;

  const locals = await getLocalCatches();
  const pending = locals.filter((c) => !c.synced && !c.remote_id);

  for (const local of pending) {
    try {
      const form = new FormData();
      form.append("file", {
        uri: local.local_uri,
        name: `catch-${Date.now()}.jpg`,
        type: "image/jpeg",
      } as unknown as Blob);

      if (local.species_label) form.append("species_label", local.species_label);
      if (typeof local.species_confidence === "number") {
        form.append("species_confidence", String(local.species_confidence));
      }
      if (local.lat) form.append("latitude", String(local.lat));
      if (local.lng) form.append("longitude", String(local.lng));
      form.append("persist", "true");

      // ✅ Use JWT auth header instead of X-User-Id
      const authHeaders = await getAuthHeaders();
      
      const resp = await fetch(`${API_BASE}/fish/identify`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...authHeaders,
        },
        body: form,
      });

      if (resp.ok) {
        const data = await resp.json();
        await updateLocalCatch(local.local_id, {
          synced: true,
          remote_id: data.catch_id,
        });
      }
    } catch (e) {
      console.warn("Sync failed for", local.local_id, e);
    }
  }
}