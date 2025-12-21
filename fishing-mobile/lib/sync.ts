// lib/sync.ts
// Updated with JWT authentication
// FIXED: Removed lat/lng fields that don't exist on LocalCatch

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

      // ✅ FIX: Only append fields that /fish/identify accepts
      // The backend re-runs inference, so species_label/confidence aren't needed
      form.append("persist", "true");
      
      // Include geo coords if available
      if (local.lat != null) form.append("latitude", String(local.lat));
      if (local.lng != null) form.append("longitude", String(local.lng));

      // ✅ Use JWT auth header instead of X-User-Id
      const authHeaders = await getAuthHeaders();

      // ✅ FIX: Don't set Content-Type for FormData
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
        console.log(`✅ Synced local catch ${local.local_id} -> remote ${data.catch_id}`);
      } else {
        const errText = await resp.text().catch(() => "");
        console.warn(`❌ Sync failed for ${local.local_id}: ${resp.status} ${errText}`);
      }
    } catch (e) {
      console.warn("Sync failed for", local.local_id, e);
    }
  }
}
