// components/CatchCard.tsx
import * as React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { CatchItem } from '../types/catch';
import { uploadLocalCatch } from '../lib/upload';
import { API_BASE } from '../lib/config';
import { useAuth } from '../lib/auth';
import { useRouter } from 'expo-router';

export function CatchCard({
  item,
  onUploaded,
}: {
  item: CatchItem;
  onUploaded: (next: CatchItem) => void;
}) {
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const handleUpload = async () => {
    try {
      setBusy(true);
      const next = await uploadLocalCatch(item);
      onUploaded(next);
    } catch (e) {
      onUploaded({ ...item, syncStatus: 'failed' });
    } finally {
      setBusy(false);
    }
  };

  const src =
    item.storage === 'local' && item.image_uri
      ? { uri: item.image_uri }
      : item.image_path
      ? { uri: `${API_BASE}${item.image_path}` }
      : undefined;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => item.storage === 'online' ? router.push(`/catch/${item.id}`) : null}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <Text style={styles.title}>{item.species_label ?? 'Unknown species'}</Text>
        <View style={styles.right}>
          <Text
            style={[
              styles.badge,
              item.storage === 'local' ? styles.localBadge : styles.onlineBadge,
            ]}
          >
            {item.storage === 'local' ? 'Local' : 'Online'}
          </Text>

          {item.storage === 'local' && isLoggedIn ? (
            <TouchableOpacity
              disabled={busy}
              onPress={handleUpload}
              style={[styles.uploadBtn, busy && styles.uploadBtnBusy]}
            >
              <Text style={styles.uploadBtnText}>{busy ? 'Uploading…' : 'Upload'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {src ? (
        <Image source={src} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={{ color: '#999' }}>No image</Text>
        </View>
      )}

      {/* Hints */}
      {item.storage === 'local' && !isLoggedIn ? (
        <Text style={styles.hint}>Log in to upload this local catch.</Text>
      ) : null}
      {item.storage === 'local' && item.syncStatus === 'failed' ? (
        <Text style={styles.error}>Upload failed. Check network and try again.</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
    backgroundColor: 'white',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: '600', fontSize: 16 },
  right: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 12,
    overflow: 'hidden',
  },
  localBadge: { backgroundColor: '#FFF5E5', color: '#C76B00' },
  onlineBadge: { backgroundColor: '#E6FFEE', color: '#16794D' },
  uploadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0A84FF',
  },
  uploadBtnBusy: { backgroundColor: '#7fb6ff' },
  uploadBtnText: { color: 'white', fontWeight: '600' },
  image: { width: '100%', height: 180, borderRadius: 10, marginTop: 8 },
  imagePlaceholder: { backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 8, fontSize: 12, color: '#666' },
  error: { marginTop: 8, fontSize: 12, color: '#B00020' },
});
