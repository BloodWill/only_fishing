// types/catch.ts
export type SyncStatus = 'pending' | 'failed' | 'synced';

export type CatchItem = {
  id: string;                // "server id" OR "local-<uuid>"
  image_path?: string;       // server image path (e.g., "/media/xyz.jpg")
  image_uri?: string;        // local file uri (e.g., "file:///...")
  species_label?: string;
  species_confidence?: number;
  created_at: string;

  storage: 'local' | 'online';
  syncStatus: SyncStatus;

  // Optional mapping once uploaded
  server_id?: string;
};
