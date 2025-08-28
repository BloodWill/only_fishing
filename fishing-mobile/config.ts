// config.ts
export const API_BASE = "http://192.168.1.161:8000";

export const bust = (url: string) =>
  url.includes("?") ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
