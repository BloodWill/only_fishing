import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@fish/user_id";

export async function getUserId(): Promise<string | null> {
  try { return (await AsyncStorage.getItem(KEY)) || null; } catch { return null; }
}
export async function setUserId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEY, id);
}
export async function clearUserId(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
