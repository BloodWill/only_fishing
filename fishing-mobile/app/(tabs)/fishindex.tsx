// app/(tabs)/fishindex.tsx
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  StyleSheet,
  Modal,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { API_BASE, bust } from "@/lib/config";
import { getLocalCatches, removeLocalCatch, LocalCatch } from "@/lib/storage";
import { getUserId } from "@/lib/user";
import { syncPending } from "@/lib/sync";

import {
  ALL_FISH,
  TOTAL_FISH_COUNT,
  FishData,
  getRarityColor,
  getRarityBgColor,
  findFish,
} from "@/constants/fishData";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================
// TYPES
// ============================================
type CatchRead = {
  id: number;
  image_path: string;
  species_label: string;
  species_confidence: number;
  created_at: string;
  user_id?: string | null;
  _local?: boolean;
  _local_id?: string;
  _remote_id_hint?: number | null;
};

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: "species" | "catches" | "rarity";
  rarityType?: string;
};

// ============================================
// BADGES DATA
// ============================================
const BADGES: Badge[] = [
  { id: "first-catch", name: "First Catch", description: "Catch your first fish", icon: "🎣", requirement: 1, type: "catches" },
  { id: "explorer", name: "Explorer", description: "Catch 5 different species", icon: "🧭", requirement: 5, type: "species" },
  { id: "collector", name: "Collector", description: "Catch 10 different species", icon: "📚", requirement: 10, type: "species" },
  { id: "master", name: "Master Angler", description: "Catch 20 different species", icon: "🏆", requirement: 20, type: "species" },
  { id: "legend", name: "Legend", description: "Complete the collection", icon: "⭐", requirement: 30, type: "species" },
  { id: "common-hunter", name: "Common Hunter", description: "Catch 5 common fish", icon: "🐟", requirement: 5, type: "rarity", rarityType: "Common" },
  { id: "uncommon-hunter", name: "Uncommon Hunter", description: "Catch 5 uncommon fish", icon: "🐠", requirement: 5, type: "rarity", rarityType: "Uncommon" },
  { id: "rare-hunter", name: "Rare Hunter", description: "Catch 3 rare fish", icon: "💎", requirement: 3, type: "rarity", rarityType: "Rare" },
  { id: "epic-hunter", name: "Epic Hunter", description: "Catch an epic fish", icon: "⚡", requirement: 1, type: "rarity", rarityType: "Epic" },
  { id: "legendary-hunter", name: "Legendary Hunter", description: "Catch a legendary fish", icon: "👑", requirement: 1, type: "rarity", rarityType: "Legendary" },
  { id: "frequent", name: "Frequent Angler", description: "Catch 25 fish total", icon: "🔥", requirement: 25, type: "catches" },
  { id: "dedicated", name: "Dedicated Angler", description: "Catch 50 fish total", icon: "💪", requirement: 50, type: "catches" },
];

// ============================================
// HELPER FUNCTIONS
// ============================================
const dedupeByKey = (rows: CatchRead[]) => {
  const seen = new Set<string>();
  const out: CatchRead[] = [];
  for (const r of rows) {
    const key = r._local && r._local_id ? `local:${r._local_id}` : `remote:${r.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
};

// ============================================
// MEMOIZED SUB-COMPONENTS (PERFORMANCE OPTIMIZATION)
// ============================================

// 1. Collection Item (Grid Card)
const CollectionItem = React.memo(({ 
  item, 
  isCaught, 
  onMark 
}: { 
  item: FishData; 
  isCaught: boolean; 
  onMark: (f: FishData) => void;
}) => {
  return (
    <View style={styles.fishCard}>
      <View style={[styles.fishIconContainer, { backgroundColor: isCaught ? getRarityBgColor(item.rarity) : "#f3f4f6" }]}>
        {isCaught ? (
          <Text style={styles.fishCheckmark}>✓</Text>
        ) : (
          <Text style={styles.fishLockIcon}>🔒</Text>
        )}
      </View>
      
      <Text style={[styles.fishName, !isCaught && styles.fishNameLocked]} numberOfLines={1}>
        {item.name}
      </Text>
      
      <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.rarity) }]}>
        <Text style={styles.rarityText}>{item.rarity}</Text>
      </View>
      
      <Text style={styles.pointsText}>{item.points} pts</Text>
      
      {!isCaught && (
        <TouchableOpacity
          style={styles.markButton}
          onPress={() => onMark(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.markButtonText}>Mark</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}, (prev, next) => prev.isCaught === next.isCaught && prev.item.id === next.item.id);

// 2. History Item (List Row)
const HistoryItem = React.memo(({ 
  item, 
  userId,
  uploading,
  onOpen,
  onDelete,
  onUpload
}: { 
  item: CatchRead; 
  userId: string | null;
  uploading: boolean;
  onOpen: (id: number, isLocal?: boolean, localId?: string) => void;
  onDelete: (item: CatchRead) => void;
  onUpload: (item: CatchRead) => void;
}) => {
  const uri = item.image_path.startsWith("file://") 
    ? item.image_path 
    : bust(`${API_BASE}${item.image_path}`);

  return (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => onOpen(item.id, item._local, item._local_id)}
      onLongPress={() => onDelete(item)}
      activeOpacity={0.9}
    >
      <Image 
        source={{ uri }} 
        style={styles.historyImage} 
        contentFit="cover"
        transition={300}
        cachePolicy="disk"
      />
      
      <View style={styles.historyInfo}>
        <View style={styles.historyHeader}>
          <Text style={styles.historySpecies} numberOfLines={1}>
            {item.species_label || "Unknown"}
          </Text>
          <View style={[styles.historyBadge, { backgroundColor: item._local ? "#FFF5E5" : "#E6FFEE" }]}>
            <Text style={[styles.historyBadgeText, { color: item._local ? "#C76B00" : "#16794D" }]}>
              {item._local ? "Local" : "Online"}
            </Text>
          </View>
        </View>
        
        <Text style={styles.historyDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        
        <Text style={styles.historyConfidence}>
          {(item.species_confidence * 100).toFixed(1)}% confidence
        </Text>
      </View>

      {item._local && userId ? (
        <TouchableOpacity
          onPress={() => onUpload(item)}
          disabled={uploading}
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.uploadButtonText}>Upload</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => onDelete(item)} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================
export default function FishIndex() {
  const router = useRouter();
  
  // Auth & Data State
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"collection" | "history" | "badges">("collection");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Collection State
  const [caughtSpecies, setCaughtSpecies] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  // History State
  const [catchHistory, setCatchHistory] = useState<CatchRead[]>([]);
  const [uploadingLocalId, setUploadingLocalId] = useState<string | null>(null);
  
  const loadingRef = useRef(false);

  // ============================================
  // DATA LOADING
  // ============================================
  
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const id = await getUserId();
        if (alive) setUserId(id);
      })();
      return () => { alive = false; };
    }, [])
  );

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const locals: LocalCatch[] = await getLocalCatches();
      let allCatches: CatchRead[] = [];

      if (userId) {
        try {
          const res = await fetch(`${API_BASE}/catches?limit=200&user_id=${encodeURIComponent(userId)}&t=${Date.now()}`);
          const remoteRaw: any[] = await res.json();
          
          const remote: CatchRead[] = remoteRaw.map((r) => ({
            id: Number(r.id),
            image_path: String(r.image_path ?? ""),
            species_label: String(r.species_label ?? "Unknown"),
            species_confidence: Number(r.species_confidence ?? 0),
            created_at: String(r.created_at ?? new Date().toISOString()),
            user_id: r.user_id ?? userId,
          }));

          const remoteIds = new Set(remote.map((r) => r.id));

          const unsynced: CatchRead[] = locals
            .filter((l) => {
              if (l.remote_id && remoteIds.has(Number(l.remote_id))) return false;
              if (l.synced) return false;
              return true;
            })
            .map((l, idx) => ({
              id: -100000 - idx,
              image_path: String(l.local_uri),
              species_label: String(l.species_label ?? "Unknown"),
              species_confidence: Number(l.species_confidence ?? 0),
              created_at: String(l.created_at ?? new Date().toISOString()),
              user_id: userId,
              _local: true,
              _local_id: String(l.local_id),
              _remote_id_hint: l.remote_id ? Number(l.remote_id) : null,
            }));

          allCatches = [...unsynced, ...remote.sort((a, b) => b.id - a.id)];
        } catch (e) {
          console.warn("Failed to fetch remote catches", e);
        }
      } else {
        allCatches = locals.map((l, idx) => ({
          id: -200000 - idx,
          image_path: String(l.local_uri),
          species_label: String(l.species_label ?? "Unknown"),
          species_confidence: Number(l.species_confidence ?? 0),
          created_at: String(l.created_at ?? new Date().toISOString()),
          user_id: null,
          _local: true,
          _local_id: String(l.local_id),
          _remote_id_hint: l.remote_id ? Number(l.remote_id) : null,
        }));
      }

      setCatchHistory(dedupeByKey(allCatches));

      const caught = new Set<string>();
      for (const c of allCatches) {
        const label = c.species_label?.trim();
        if (!label) continue;
        const fish = findFish(label);
        if (fish) {
          caught.add(fish.id);
        }
      }
      setCaughtSpecies(caught);

    } catch (e) {
      console.warn("Failed to load data", e);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (userId) {
          try { await syncPending(userId); } catch {}
        }
        await loadData();
      })();
    }, [userId, loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (userId) await syncPending(userId);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [userId, loadData]);

  // ============================================
  // HISTORY ACTIONS
  // ============================================
  
  const openDetail = useCallback(
    (id: number, isLocal?: boolean, localId?: string) => {
      if (isLocal && localId) {
        router.push(`/catch/local/${localId}`);
        return;
      }
      router.push(`/catch/${id}`);
    },
    [router]
  );

  const confirmDelete = useCallback(
    (item: CatchRead) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (item._local && item._local_id) {
        Alert.alert("Delete this catch?", "This will remove the local record.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try { await removeLocalCatch(item._local_id as string); } finally {
                setCatchHistory((prev) => prev.filter((c) => !(c._local && c._local_id === item._local_id)));
              }
            },
          },
        ]);
        return;
      }

      Alert.alert("Delete this catch?", "This will remove it from history.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setCatchHistory((prev) => prev.filter((c) => !(c._local !== true && c.id === item.id)));
            try {
              const resp = await fetch(`${API_BASE}/catches/${item.id}`, {
                method: "DELETE",
                headers: userId ? { "X-User-Id": userId } : undefined,
              });
              if (!resp.ok) {
                setCatchHistory((prev) => dedupeByKey([...prev, item]));
                Alert.alert("Delete failed", "Please try again.");
              }
            } catch {
              setCatchHistory((prev) => dedupeByKey([...prev, item]));
              Alert.alert("Delete failed", "Check your network.");
            }
          },
        },
      ]);
    },
    [userId]
  );

  const uploadLocal = useCallback(
    async (item: CatchRead) => {
      if (!userId || !item._local || !item._local_id) {
        Alert.alert("Sign in required", "Please sign in to upload catches.");
        return;
      }
      try {
        setUploadingLocalId(item._local_id);

        const form = new FormData();
        form.append("image", {
          uri: item.image_path,
          name: `catch-${Date.now()}.jpg`,
          type: "image/jpeg",
        } as unknown as Blob);
        if (item.species_label) form.append("species_label", item.species_label);
        if (typeof item.species_confidence === "number") {
          form.append("species_confidence", String(item.species_confidence));
        }
        form.append("created_at", item.created_at);

        const resp = await fetch(`${API_BASE}/catches`, {
          method: "POST",
          headers: { Accept: "application/json", "X-User-Id": userId },
          body: form,
        });
        if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);

        const server = await resp.json();
        try { await removeLocalCatch(item._local_id); } catch {}
        await loadData();
      } catch (e: any) {
        Alert.alert("Upload failed", e?.message ?? "Network error.");
      } finally {
        setUploadingLocalId(null);
      }
    },
    [userId, loadData]
  );

  const markFishCaught = useCallback((fish: FishData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Mark as Caught",
      `Mark ${fish.name} as caught? This will add it to your collection.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Caught",
          onPress: () => {
            setCaughtSpecies((prev) => new Set([...prev, fish.id]));
            Alert.alert("🎉 Caught!", `${fish.name} added to your collection! +${fish.points} pts`);
          },
        },
      ]
    );
  }, []);

  // ============================================
  // BADGES CALCULATION
  // ============================================
  const getBadgeProgress = useCallback((badge: Badge): { unlocked: boolean; current: number } => {
    switch (badge.type) {
      case "species":
        return { unlocked: caughtSpecies.size >= badge.requirement, current: caughtSpecies.size };
      case "catches":
        return { unlocked: catchHistory.length >= badge.requirement, current: catchHistory.length };
      case "rarity":
        const rarityCount = catchHistory.filter((c) => {
          const fish = findFish(c.species_label || "");
          return fish?.rarity === badge.rarityType;
        }).length;
        return { unlocked: rarityCount >= badge.requirement, current: rarityCount };
      default:
        return { unlocked: false, current: 0 };
    }
  }, [caughtSpecies, catchHistory]);

  // ============================================
  // MEMOIZED DATA
  // ============================================
  const filteredFish = useMemo(() => {
    return ALL_FISH.filter((fish) => {
      const matchesSearch = fish.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = rarityFilter === "all" || fish.rarity === rarityFilter;
      return matchesSearch && matchesRarity;
    });
  }, [searchQuery, rarityFilter]);

  const totalFish = TOTAL_FISH_COUNT;
  const caughtCount = caughtSpecies.size;
  const progressPercent = (caughtCount / totalFish) * 100;

  // ============================================
  // RENDER CALLBACKS
  // ============================================
  const renderCollectionItem = useCallback(({ item }: { item: FishData }) => (
    <CollectionItem 
      item={item} 
      isCaught={caughtSpecies.has(item.id)} 
      onMark={markFishCaught} 
    />
  ), [caughtSpecies, markFishCaught]);

  const renderHistoryItem = useCallback(({ item }: { item: CatchRead }) => (
    <HistoryItem 
      item={item}
      userId={userId}
      uploading={Boolean(item._local_id && uploadingLocalId === item._local_id)}
      onOpen={openDetail}
      onDelete={confirmDelete}
      onUpload={uploadLocal}
    />
  ), [userId, uploadingLocalId, openDetail, confirmDelete, uploadLocal]);

  const renderBadgeItem = useCallback(({ item }: { item: Badge }) => {
    const { unlocked, current } = getBadgeProgress(item);
    
    return (
      <View style={[styles.badgeCard, unlocked && styles.badgeCardUnlocked]}>
        <View style={[styles.badgeIcon, unlocked && styles.badgeIconUnlocked]}>
          <Text style={styles.badgeEmoji}>{item.icon}</Text>
        </View>
        
        <Text style={[styles.badgeName, !unlocked && styles.badgeNameLocked]}>
          {item.name}
        </Text>
        
        <Text style={styles.badgeDesc} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.badgeProgress}>
          <View style={[styles.badgeProgressFill, { width: `${Math.min((current / item.requirement) * 100, 100)}%` }]} />
        </View>
        
        <Text style={styles.badgeProgressText}>
          {current} / {item.requirement}
        </Text>
        
        {!unlocked && (
          <View style={styles.badgeLock}>
            <Text style={styles.badgeLockIcon}>🔒</Text>
          </View>
        )}
      </View>
    );
  }, [getBadgeProgress]);

  // ============================================
  // MAIN RENDER
  // ============================================
  
  if (loading && catchHistory.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0891b2" />
        <Text style={styles.loadingText}>Loading your collection...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#06b6d4", "#3b82f6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerSubtitle}>Your Collection</Text>
        <Text style={styles.headerTitle}>{caughtCount} / {totalFish}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
      </LinearGradient>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "collection" && styles.tabActive]}
          onPress={() => setActiveTab("collection")}
        >
          <Text style={styles.tabIcon}>🐟</Text>
          <Text style={[styles.tabText, activeTab === "collection" && styles.tabTextActive]}>
            Collection
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.tabActive]}
          onPress={() => setActiveTab("history")}
        >
          <Text style={styles.tabIcon}>📅</Text>
          <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === "badges" && styles.tabActive]}
          onPress={() => setActiveTab("badges")}
        >
          <Text style={styles.tabIcon}>🏆</Text>
          <Text style={[styles.tabText, activeTab === "badges" && styles.tabTextActive]}>
            Badges
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === "collection" && (
        <View style={styles.content}>
          {/* Search and Filter */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search fish..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
            </View>
            
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFilterModalOpen(true)}
            >
              <Text style={styles.filterText}>{rarityFilter === "all" ? "All" : rarityFilter}</Text>
              <Text style={styles.filterArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Fish Grid */}
          <FlatList
            data={filteredFish}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={renderCollectionItem}
            contentContainerStyle={styles.fishGrid}
            showsVerticalScrollIndicator={false}
            getItemLayout={(data, index) => ({
              length: 120,
              offset: 120 * (index / 3),
              index,
            })}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={5}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />
            }
          />
        </View>
      )}

      {activeTab === "history" && (
        <FlatList
          data={catchHistory}
          keyExtractor={(item) => item._local && item._local_id ? `local:${item._local_id}` : `remote:${item.id}`}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.historyList}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎣</Text>
              <Text style={styles.emptyTitle}>No catches yet!</Text>
              <Text style={styles.emptyDesc}>Go to Home and identify your first fish</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {activeTab === "badges" && (
        <FlatList
          data={BADGES}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={renderBadgeItem}
          contentContainerStyle={styles.badgeGrid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0891b2" />
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={filterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalOpen(false)}
        >
          <View style={styles.filterModal}>
            <Text style={styles.filterModalTitle}>Filter by Rarity</Text>
            
            {["all", "Common", "Uncommon", "Rare", "Epic", "Legendary"].map((rarity) => (
              <TouchableOpacity
                key={rarity}
                style={[styles.filterOption, rarityFilter === rarity && styles.filterOptionActive]}
                onPress={() => {
                  setRarityFilter(rarity);
                  setFilterModalOpen(false);
                }}
              >
                <Text style={[styles.filterOptionText, rarityFilter === rarity && styles.filterOptionTextActive]}>
                  {rarity === "all" ? "All Rarities" : rarity}
                </Text>
                {rarity !== "all" && (
                  <View style={[styles.filterDot, { backgroundColor: getRarityColor(rarity) }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 14,
  },

  // Header
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginBottom: 4,
  },
  headerTitle: {
    color: "white",
    fontSize: 48,
    fontWeight: "300",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 4,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#0891b2",
    borderRadius: 12,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "white",
  },

  // Content
  content: {
    flex: 1,
    paddingTop: 12,
  },

  // Search
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: "#1f2937",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    color: "#1f2937",
  },
  filterArrow: {
    fontSize: 10,
    color: "#6b7280",
  },

  // Fish Grid
  fishGrid: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  fishCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 10,
    margin: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxWidth: (SCREEN_WIDTH - 48) / 3,
  },
  fishIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  fishCheckmark: {
    fontSize: 20,
    color: "#22c55e",
  },
  fishLockIcon: {
    fontSize: 18,
    opacity: 0.5,
  },
  fishName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 6,
    height: 28,
  },
  fishNameLocked: {
    color: "#9ca3af",
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 4,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  pointsText: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 6,
  },
  markButton: {
    backgroundColor: "#0891b2",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  markButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  // History
  historyList: {
    padding: 16,
    paddingBottom: 100,
  },
  historyItem: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 12,
  },
  historyImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
  },
  historyInfo: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  historySpecies: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  historyDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  historyConfidence: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  uploadButton: {
    backgroundColor: "#0891b2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  uploadButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "600",
  },
  separator: {
    height: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#6b7280",
  },

  // Badges
  badgeGrid: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 100,
  },
  badgeCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    margin: 4,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    maxWidth: (SCREEN_WIDTH - 48) / 3,
    position: "relative",
    opacity: 0.6,
  },
  badgeCardUnlocked: {
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    opacity: 1,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  badgeIconUnlocked: {
    backgroundColor: "#fef3c7",
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: "#9ca3af",
  },
  badgeDesc: {
    fontSize: 9,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 8,
    height: 24,
  },
  badgeProgress: {
    width: "100%",
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  badgeProgressFill: {
    height: "100%",
    backgroundColor: "#fbbf24",
    borderRadius: 2,
  },
  badgeProgressText: {
    fontSize: 9,
    color: "#6b7280",
  },
  badgeLock: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  badgeLockIcon: {
    fontSize: 12,
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModal: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: SCREEN_WIDTH - 60,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: "#e0f2fe",
  },
  filterOptionText: {
    fontSize: 15,
    color: "#1f2937",
  },
  filterOptionTextActive: {
    fontWeight: "600",
    color: "#0891b2",
  },
  filterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});