// lib/storage.ts
// Local catch storage with AsyncStorage
// UPDATED: Added lat/lng fields to LocalCatch type

import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalCatch = {
  local_id: string;              // unique id on device
  local_uri: string;             // file://… persisted path
  species_label: string;
  species_confidence: number;    // 0..1
  created_at: string;            // ISO
  remote_id?: number | null;
  synced?: boolean;              // true once uploaded
  // ✅ Added geo fields
  lat?: number | null;
  lng?: number | null;
};

const KEY = "@fish/catches:v1";

async function readAll(): Promise<LocalCatch[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalCatch[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: LocalCatch[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(rows));
}

export async function getLocalCatches(): Promise<LocalCatch[]> {
  return await readAll();
}

export async function addLocalCatch(c: LocalCatch): Promise<void> {
  const rows = await readAll();
  rows.unshift(c); // newest first
  await writeAll(rows);
}

export async function updateLocalCatch(
  local_id: string,
  patch: Partial<LocalCatch>
): Promise<void> {
  const rows = await readAll();
  const i = rows.findIndex((r) => r.local_id === local_id);
  if (i >= 0) {
    rows[i] = { ...rows[i], ...patch };
    await writeAll(rows);
  }
}

export async function removeLocalCatch(local_id: string): Promise<void> {
  const rows = await readAll();
  const next = rows.filter((r) => r.local_id !== local_id);
  await writeAll(next);
}
