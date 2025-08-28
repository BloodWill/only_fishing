import { getLocalCatches, updateLocalCatch, LocalCatch } from "./storage";
import { API_BASE } from "@/config";
import * as FileSystem from "expo-file-system";

let syncing = false;

function guessMime(uri: string) {
  const u = uri.toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
function fileNameFromUri(uri: string) {
  const m = uri.split("/").pop();
  return m || `photo_${Date.now()}.jpg`;
}
async function exists(uri: string) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return !!info.exists;
  } catch { return false; }
}

async function uploadOne(c: LocalCatch, userId: string) {
  if (!(await exists(c.local_uri))) {
    console.warn("sync: file missing", c.local_uri);
    return;
  }

  const form = new FormData();
  form.append("file", { uri: c.local_uri, name: fileNameFromUri(c.local_uri), type: guessMime(c.local_uri) } as any);
  form.append("user_id", userId);
  form.append("persist", "true");

  const resp = await fetch(`${API_BASE}/fish/identify`, {
    method: "POST",
    body: form,
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`identify upload failed: HTTP ${resp.status}`);
  const json = (await resp.json()) as {
    catch_id?: number | null;
    prediction?: { label?: string | null } | null;
  };

  const remoteId = json.catch_id ?? null;
  const predicted = json?.prediction?.label ?? null;

  // If local label differs from model guess, patch server to match local
  if (remoteId && predicted && predicted !== c.species_label) {
    const body = JSON.stringify({ species_label: c.species_label });
    let r = await fetch(`${API_BASE}/catches/${remoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-User-Id": userId },
      body,
    });
    if (r.status === 405) {
      r = await fetch(`${API_BASE}/catches/${remoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User-Id": userId },
        body,
      });
    }
    if (!r.ok) throw new Error(`label patch failed: HTTP ${r.status}`);
  }

  await updateLocalCatch(c.local_id, { remote_id: remoteId ?? undefined, synced: !!remoteId });
}

export async function syncPending(userId: string) {
  if (syncing) return;
  syncing = true;
  try {
    const locals = await getLocalCatches();
    const pending = locals.filter((c) => !c.synced);
    for (const c of pending) {
      try { await uploadOne(c, userId); } catch (e) { console.warn("sync failed", c.local_id, e); }
    }
  } finally {
    syncing = false;
  }
}
