// lib/upload.ts
import { API_BASE } from './config';
import { CatchItem } from '../types/catch';

export async function uploadLocalCatch(item: CatchItem): Promise<CatchItem> {
  if (item.storage !== 'local' || !item.image_uri) throw new Error('Not a local item.');

  const form = new FormData();
  form.append('image', {
    uri: item.image_uri,
    name: `catch-${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);
  if (item.species_label) form.append('species_label', item.species_label);
  if (item.species_confidence != null) form.append('species_confidence', String(item.species_confidence));
  form.append('created_at', item.created_at);

  const res = await fetch(`${API_BASE}/api/catches/`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }

  const server = await res.json(); // expected: { id, image_path, ... }
  return {
    ...item,
    id: String(server.id),
    image_path: server.image_path,
    storage: 'online',
    syncStatus: 'synced',
    server_id: String(server.id),
    image_uri: undefined,
  };
}
