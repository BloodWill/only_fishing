// fishing-mobile/lib/api.ts
import { API_BASE, bust } from "@/lib/config";

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

export async function predictFish(fileUri: string, mime = "image/jpeg"): Promise<PredictResp> {
  const base = API_BASE.replace(/\/+$/, "");
  const form = new FormData();
  form.append("file", { uri: fileUri, name: "photo.jpg", type: mime } as any);

  const r = await fetch(`${base}/predict`, {
    method: "POST",
    body: form,
    headers: { "Content-Type": "multipart/form-data" },
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
  const r = await fetch(`${base}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
