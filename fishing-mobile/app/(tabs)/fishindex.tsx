// app/(tabs)/fishindex.tsx
import React, { useCallback, useRef, useState, useMemo } from "react";
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
  ScrollView,
} from "react-native";
// ✅ 使用 expo-image 进行高性能图片加载
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

// Config & Libs
import { API_BASE, bust } from "@/lib/config";
import { getLocalCatches, removeLocalCatch, LocalCatch } from "@/lib/storage";
import { syncPending } from "@/lib/sync";

// Auth Hook 和 API Helpers
import { useAuth } from "@/contexts/AuthContext";
import { 
  getCatches, 
  deleteCatch as apiDeleteCatch,
  getAllSpecies, // ✅ 新增：获取全量鱼种
} from "@/lib/api";
import { supabase } from "@/lib/supabase";

import {
  ALL_FISH,
  TOTAL_FISH_COUNT,
  FishData,
  getRarityColor,
  getRarityBgColor,
  // ❌ 移除 findFish 的静态依赖，我们将在组件内动态实现它
  FISHING_REGULATIONS,
  FishingRegulation,
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
  lat?: number | null;
  lng?: number | null;
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

// 获取 JWT Auth Header
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {}
  return {};
}

// ✅ 获取图片 URL - 处理所有格式
const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return "";
  
  // Local file
  if (imagePath.startsWith("file://")) {
    return imagePath;
  }
  
  // Already a full URL
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return bust(imagePath);
  }
  
  // Relative path - prepend API_BASE
  const base = API_BASE.replace(/\/+$/, "");
  const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return bust(`${base}${path}`);
};

// ✅ 智能判断是否为 Emoji
const isEmoji = (str: string | null) => {
  if (!str) return true; // 默认视为空 Emoji
  // 简单粗暴的判断：如果包含 / 或 . 说明是路径或文件名，否则当 Emoji
  return !str.includes('/') && !str.includes('.');
};

// ============================================
// MEMOIZED SUB-COMPONENTS
// ============================================

// 1. Collection Item (Grid Card)
const CollectionItem = React.memo(({ 
  item, 
  isCaught, 
  onMark,
  onTap,
}: { 
  item: FishData; 
  isCaught: boolean; 
  onMark: (f: FishData) => void;
  onTap: (f: FishData) => void;
}) => {
  
  const iconContent = useMemo(() => {
    // 如果是 Emoji，直接渲染 Text
    if (isEmoji(item.icon)) {
      return <Text style={styles.fishIconText}>{item.icon || "🐟"}</Text>;
    }
    // 否则渲染图片 (如果是路径则拼接 API_BASE)
    return (
      <Image 
        source={{ uri: getImageUrl(item.icon) }} 
        style={{ width: 40, height: 40 }} 
        contentFit="contain"
      />
    );
  }, [item.icon]);

  return (
    <TouchableOpacity 
      style={styles.fishCard}
      onPress={() => onTap(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.fishIconContainer, { backgroundColor: isCaught ? getRarityBgColor(item.rarity) : "#f3f4f6" }]}>
        {isCaught ? (
          iconContent
        ) : (
          <Text style={styles.fishLockIcon}>🔒</Text>
        )}
      </View>
      
      <Text style={[styles.fishName, !isCaught && styles.fishNameLocked]} numberOfLines={2}>
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
    </TouchableOpacity>
  );
}, (prev, next) => prev.isCaught === next.isCaught && prev.item.id === next.item.id);

// 2. History Item (List Row) - ✅ 升级：接收 fishData 而不是自己去查
const HistoryItem = React.memo(({ 
  item, 
  fishData, // ✅ 新增 Prop
  userId,
  uploading,
  onOpen,
  onDelete,
  onUpload
}: { 
  item: CatchRead; 
  fishData?: FishData; // ✅ 动态传入鱼的信息
  userId: string | null;
  uploading: boolean;
  onOpen: (item: CatchRead) => void;
  onDelete: (item: CatchRead) => void;
  onUpload: (item: CatchRead) => void;
}) => {
  // 使用传入的 fishData，如果找不到则降级
  const fishIcon = fishData?.icon || "🐟";
  const rarityColor = fishData ? getRarityColor(fishData.rarity) : "#6b7280";
  const imageUri = getImageUrl(item.image_path);
  const [imageError, setImageError] = React.useState(false);

  return (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => onOpen(item)}
      onLongPress={() => onDelete(item)}
      activeOpacity={0.9}
    >
      {/* ✅ 显示真实捕获照片，加载失败时显示图标 */}
      <View style={[styles.historyImageWrapper, { borderColor: rarityColor }]}>
        {imageUri && !imageError ? (
          <Image 
            source={{ uri: imageUri }} 
            style={styles.historyImage}
            contentFit="cover"
            transition={200}
            cachePolicy="disk"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.historyImageFallback}>
            <Text style={styles.historyFallbackIcon}>{isEmoji(fishIcon) ? fishIcon : "🐟"}</Text>
          </View>
        )}
      </View>
      
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
  
  // Auth: 使用 Context
  const { user } = useAuth();
  const userId = user?.id || null;
  
  // UI State
  const [activeTab, setActiveTab] = useState<"collection" | "history" | "badges">("collection");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ Data Source State: 不再只是 ALL_FISH，而是动态的
  // 初始值用本地 ALL_FISH 兜底，防止白屏
  const [displaySpecies, setDisplaySpecies] = useState<FishData[]>(ALL_FISH); 

  // Collection State
  const [caughtSpecies, setCaughtSpecies] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  // History State
  const [catchHistory, setCatchHistory] = useState<CatchRead[]>([]);
  const [uploadingLocalId, setUploadingLocalId] = useState<string | null>(null);
  
  // Catch Detail Modal
  const [selectedCatch, setSelectedCatch] = useState<CatchRead | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // Regulations Modal
  const [regulationsModal, setRegulationsModal] = useState<{ fish: FishData | null; visible: boolean }>({ fish: null, visible: false });
  
  const loadingRef = useRef(false);

  // ✅ 高效查找表：用于替代静态的 findFish
  // 当 displaySpecies 更新（即从后端拿到新数据）时，这个表会自动更新
  const fishLookupMap = useMemo(() => {
    const map = new Map<string, FishData>();
    displaySpecies.forEach(f => {
      // 同时存 ID 和 Name 的小写，以防万一
      map.set(f.name.toLowerCase(), f);
      if (f.id) map.set(f.id.toLowerCase(), f);
    });
    return map;
  }, [displaySpecies]);

  // ✅ 动态查找函数
  const getFishDynamic = useCallback((nameOrId: string) => {
    if (!nameOrId) return undefined;
    const key = nameOrId.toLowerCase();
    // 先尝试完全匹配，找不到再试着匹配 ID
    return fishLookupMap.get(key);
  }, [fishLookupMap]);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      // ✅ 1. 并行加载：本地记录 + 远程鱼种列表
      // 如果后端没准备好，getAllSpecies 失败也不会影响本地记录的加载
      const [locals, remoteSpeciesRaw] = await Promise.all([
        getLocalCatches(),
        getAllSpecies().catch(err => {
          console.log("Failed to load species from backend, using offline data:", err);
          return null;
        })
      ]);

      // ✅ 2. 如果成功获取远程鱼种，更新显示列表
      // 这样前端就能显示数据库里新添加的鱼了
      if (remoteSpeciesRaw && remoteSpeciesRaw.length > 0) {
        const mappedSpecies: FishData[] = remoteSpeciesRaw.map(s => ({
          id: s.common_name, // 前端目前很多逻辑依赖 common_name 作为 ID
          name: s.common_name,
          rarity: (s.rarity as any) || "Common",
          points: s.points || 10,
          icon: s.icon_path || "🐟",
          description: s.description || "",
          habitat: s.habitat || "", 
          bestTime: s.best_time || "",
          avgSize: s.avg_size || "",
          bait: s.bait || "",
          difficulty: (s.difficulty as any) || "beginner"
        }));
        setDisplaySpecies(mappedSpecies);
      }

      // 3. 处理 History 列表 (本地 + 远程)
      let allCatches: CatchRead[] = [];

      if (userId) {
        try {
          const remoteRaw = await getCatches(200);
          
          const remote: CatchRead[] = remoteRaw.map((r: any) => ({
            id: Number(r.id),
            image_path: String(r.image_path ?? ""),
            species_label: String(r.species_label ?? "Unknown"),
            species_confidence: Number(r.species_confidence ?? 0),
            created_at: String(r.created_at ?? new Date().toISOString()),
            user_id: r.user_id ?? userId,
            lat: r.lat ?? null,
            lng: r.lng ?? null,
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
              lat: l.lat ?? null,
              lng: l.lng ?? null,
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
          lat: l.lat ?? null,
          lng: l.lng ?? null,
          _local: true,
          _local_id: String(l.local_id),
          _remote_id_hint: l.remote_id ? Number(l.remote_id) : null,
        }));
      }

      setCatchHistory(dedupeByKey(allCatches));

      // 4. 计算已捕获 (根据 common_name 匹配)
      const caught = new Set<string>();
      for (const c of allCatches) {
        const label = c.species_label?.trim();
        if (label) caught.add(label);
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
  // CATCH DETAIL MODAL
  // ============================================
  
  const openCatchDetail = useCallback((item: CatchRead) => {
    setSelectedCatch(item);
    setDetailModalOpen(true);
  }, []);

  const closeCatchDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedCatch(null);
  }, []);

  // ============================================
  // REGULATIONS MODAL
  // ============================================
  const showRegulations = useCallback((fish: FishData) => {
    setRegulationsModal({ fish, visible: true });
  }, []);

  // ============================================
  // HISTORY ACTIONS
  // ============================================

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
                closeCatchDetail();
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
            closeCatchDetail();
            try {
              await apiDeleteCatch(item.id);
            } catch (e: any) {
              setCatchHistory((prev) => dedupeByKey([...prev, item]));
              Alert.alert("Delete failed", e?.message || "Please try again.");
            }
          },
        },
      ]);
    },
    [closeCatchDetail]
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
        // 后端现在重跑 AI 预测，不需要传 label/confidence，但为了兼容性可以保留
        if (item.species_label) form.append("species_label", item.species_label);
        form.append("persist", "true"); 
        if (item.lat) form.append("latitude", String(item.lat));
        if (item.lng) form.append("longitude", String(item.lng));

        const authHeaders = await getAuthHeaders();
        const resp = await fetch(`${API_BASE}/fish/identify`, {
          method: "POST",
          headers: { Accept: "application/json", ...authHeaders },
          body: form,
        });
        if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);

        try { await removeLocalCatch(item._local_id); } catch {}
        await loadData();
        closeCatchDetail();
      } catch (e: any) {
        Alert.alert("Upload failed", e?.message ?? "Network error.");
      } finally {
        setUploadingLocalId(null);
      }
    },
    [userId, loadData, closeCatchDetail]
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
            // 前端临时点亮，实际应该调后端 API
            setCaughtSpecies((prev) => new Set([...prev, fish.name]));
            Alert.alert("🎉 Caught!", `${fish.name} added to your collection! +${fish.points} pts`);
          },
        },
      ]
    );
  }, []);

  // ============================================
  // BADGES CALCULATION
  // ============================================
  // ✅ 升级：使用动态查找 (getFishDynamic)
  const getBadgeProgress = useCallback((badge: Badge) => {
    switch (badge.type) {
      case "species":
        return { unlocked: caughtSpecies.size >= badge.requirement, current: caughtSpecies.size };
      case "catches":
        return { unlocked: catchHistory.length >= badge.requirement, current: catchHistory.length };
      case "rarity":
        // 动态查找每条历史记录对应的鱼
        const rarityCount = catchHistory.filter((c) => {
          const fish = getFishDynamic(c.species_label || "");
          return fish?.rarity === badge.rarityType;
        }).length;
        return { unlocked: rarityCount >= badge.requirement, current: rarityCount };
      default:
        return { unlocked: false, current: 0 };
    }
  }, [caughtSpecies, catchHistory, getFishDynamic]);

  // ============================================
  // MEMOIZED DATA
  // ============================================
  // ✅ 使用 displaySpecies (动态数据) 而不是 ALL_FISH
  const filteredFish = useMemo(() => {
    return displaySpecies.filter((fish) => {
      const matchesSearch = fish.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = rarityFilter === "all" || fish.rarity === rarityFilter;
      return matchesSearch && matchesRarity;
    });
  }, [displaySpecies, searchQuery, rarityFilter]);

  const totalFish = displaySpecies.length;
  const caughtCount = caughtSpecies.size;
  const progressPercent = totalFish > 0 ? (caughtCount / totalFish) * 100 : 0;

  // ============================================
  // RENDER CALLBACKS
  // ============================================
  
  const renderCollectionItem = useCallback(({ item }: { item: FishData }) => (
    <CollectionItem 
      item={item} 
      // 匹配逻辑：使用 fish.name
      isCaught={caughtSpecies.has(item.name)} 
      onMark={markFishCaught}
      onTap={showRegulations}
    />
  ), [caughtSpecies, markFishCaught, showRegulations]);

  const renderHistoryItem = useCallback(({ item }: { item: CatchRead }) => {
    // ✅ 动态查找鱼信息并传入组件
    const fish = getFishDynamic(item.species_label || "");
    return (
      <HistoryItem 
        item={item}
        fishData={fish} // 👈 关键改动：传入动态查找的鱼信息
        userId={userId}
        uploading={Boolean(item._local_id && uploadingLocalId === item._local_id)}
        onOpen={openCatchDetail}
        onDelete={confirmDelete}
        onUpload={uploadLocal}
      />
    );
  }, [userId, uploadingLocalId, openCatchDetail, confirmDelete, uploadLocal, getFishDynamic]);

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
  // CATCH DETAIL MODAL RENDER
  // ============================================
  // ✅ 升级：动态查找
  const renderCatchDetailModal = () => {
    if (!selectedCatch) return null;
    const fish = getFishDynamic(selectedCatch.species_label || ""); // 👈 动态查找
    
    const imageUri = getImageUrl(selectedCatch.image_path);
    const fishIcon = fish?.icon || "🐟";
    const rarityColor = fish ? getRarityColor(fish.rarity) : "#6b7280";
    const uploading = Boolean(selectedCatch._local_id && uploadingLocalId === selectedCatch._local_id);

    return (
      <Modal
        visible={detailModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeCatchDetail}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContent}>
            {/* Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={closeCatchDetail} style={styles.detailCloseBtn}>
                <Text style={styles.detailCloseBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.detailTitle}>Catch Details</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Fish Icon & Name */}
              <View style={styles.detailFishHeader}>
                <View style={[styles.detailIconContainer, { borderColor: rarityColor }]}>
                  {/* 使用 isEmoji 判断 */}
                  {isEmoji(fishIcon) ? (
                    <Text style={styles.detailFishIcon}>{fishIcon}</Text>
                  ) : (
                    <Image
                      source={{ uri: getImageUrl(fishIcon) }}
                      style={{ width: 50, height: 50 }}
                      contentFit="contain"
                    />
                  )}
                </View>
                <Text style={styles.detailSpeciesName}>{selectedCatch.species_label || "Unknown"}</Text>
                {fish && (
                  <View style={[styles.detailRarityBadge, { backgroundColor: rarityColor }]}>
                    <Text style={styles.detailRarityText}>{fish.rarity}</Text>
                  </View>
                )}
              </View>

              {/* Image */}
              {imageUri ? (
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.detailImage}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <View style={styles.detailImagePlaceholder}>
                  <Text style={styles.detailImagePlaceholderText}>No image available</Text>
                </View>
              )}

              {/* Info Grid */}
              <View style={styles.detailInfoGrid}>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoLabel}>Date</Text>
                  <Text style={styles.detailInfoValue}>
                    {new Date(selectedCatch.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoLabel}>Confidence</Text>
                  <Text style={styles.detailInfoValue}>
                    {(selectedCatch.species_confidence * 100).toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoLabel}>Status</Text>
                  <Text style={[styles.detailInfoValue, { color: selectedCatch._local ? "#C76B00" : "#16794D" }]}>
                    {selectedCatch._local ? "Local" : "Synced"}
                  </Text>
                </View>
                {fish && (
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Points</Text>
                    <Text style={styles.detailInfoValue}>{fish.points} pts</Text>
                  </View>
                )}
              </View>

              {/* Fish Info */}
              {fish && (
                <View style={styles.detailFishInfo}>
                  <Text style={styles.detailFishInfoTitle}>About this fish</Text>
                  <Text style={styles.detailFishInfoText}>{fish.description}</Text>
                  <View style={styles.detailFishMeta}>
                    <Text style={styles.detailFishMetaItem}>🎯 {fish.habitat}</Text>
                    <Text style={styles.detailFishMetaItem}>⏰ {fish.bestTime}</Text>
                    <Text style={styles.detailFishMetaItem}>📏 {fish.avgSize}</Text>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.detailActions}>
                {fish && (
                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.detailRegulationsBtn]}
                    onPress={() => {
                      closeCatchDetail();
                      showRegulations(fish);
                    }}
                  >
                    <Text style={[styles.detailActionBtnText, { color: "#0891b2" }]}>📋 Regulations</Text>
                  </TouchableOpacity>
                )}
                
                {selectedCatch._local && userId ? (
                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.detailUploadBtn]}
                    onPress={() => uploadLocal(selectedCatch)}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.detailActionBtnText}>☁️ Upload</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
                
                <TouchableOpacity
                  style={[styles.detailActionBtn, styles.detailDeleteBtn]}
                  onPress={() => confirmDelete(selectedCatch)}
                >
                  <Text style={[styles.detailActionBtnText, { color: "#dc2626" }]}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ============================================
  // REGULATIONS MODAL RENDER
  // ============================================
  const renderRegulationsModal = () => {
    const fish = regulationsModal.fish;
    if (!fish) return null;
    
    const regulation = FISHING_REGULATIONS[fish.name] as FishingRegulation | undefined;
    
    return (
      <Modal
        visible={regulationsModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setRegulationsModal({ fish: null, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.regulationsModalContent}>
            <View style={styles.regulationsHeader}>
              <Text style={styles.regulationsIcon}>📋</Text>
              <Text style={styles.regulationsTitle}>Fishing Regulations</Text>
            </View>
            
            <View style={styles.regulationsSpecies}>
              <View style={{ alignItems: "center" }}>
                {isEmoji(fish.icon) ? (
                    <Text style={styles.regulationsSpeciesIcon}>{fish.icon}</Text>
                  ) : (
                    <Image
                      source={{ uri: getImageUrl(fish.icon) }}
                      style={{ width: 40, height: 40 }}
                      contentFit="contain"
                    />
                  )}
              </View>
              <Text style={styles.regulationsSpeciesName}>{fish.name}</Text>
            </View>
            
            {regulation ? (
              <ScrollView style={{ maxHeight: 300 }}>
                <View style={styles.regulationsGrid}>
                  <View style={styles.regulationItem}>
                    <Text style={styles.regulationLabel}>Min Size</Text>
                    <Text style={styles.regulationValue}>{regulation.minSize}</Text>
                  </View>
                  <View style={styles.regulationItem}>
                    <Text style={styles.regulationLabel}>Daily Limit</Text>
                    <Text style={styles.regulationValue}>{regulation.dailyLimit}</Text>
                  </View>
                  <View style={styles.regulationItem}>
                    <Text style={styles.regulationLabel}>Season</Text>
                    <Text style={styles.regulationValue}>{regulation.season}</Text>
                  </View>
                  {regulation.slotLimit && (
                    <View style={styles.regulationItem}>
                      <Text style={styles.regulationLabel}>Slot Limit</Text>
                      <Text style={styles.regulationValue}>{regulation.slotLimit}</Text>
                    </View>
                  )}
                  {regulation.possessionLimit && (
                    <View style={styles.regulationItem}>
                      <Text style={styles.regulationLabel}>Possession</Text>
                      <Text style={styles.regulationValue}>{regulation.possessionLimit}</Text>
                    </View>
                  )}
                </View>
                
                {regulation.notes && (
                  <View style={styles.regulationNotes}>
                    <Text style={styles.regulationNotesLabel}>📝 Notes</Text>
                    <Text style={styles.regulationNotesText}>{regulation.notes}</Text>
                  </View>
                )}
                
                {regulation.gearRestrictions && (
                  <View style={styles.regulationNotes}>
                    <Text style={styles.regulationNotesLabel}>🎣 Gear Restrictions</Text>
                    <Text style={styles.regulationNotesText}>{regulation.gearRestrictions}</Text>
                  </View>
                )}
                
                {regulation.specialPermit && (
                  <View style={styles.permitWarning}>
                    <Text style={styles.permitWarningText}>⚠️ Special permit required!</Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={styles.noRegulations}>
                <Text style={styles.noRegulationsText}>No specific regulations found.</Text>
                <Text style={styles.noRegulationsHint}>Check your local fishing regulations.</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setRegulationsModal({ fish: null, visible: false })}
            >
              <Text style={styles.closeBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

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
            // ✅ 使用动态数据 displaySpecies 过滤后的结果
            data={filteredFish}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={renderCollectionItem}
            contentContainerStyle={styles.fishGrid}
            showsVerticalScrollIndicator={false}
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

      {/* Catch Detail Modal */}
      {renderCatchDetailModal()}
      
      {/* Regulations Modal */}
      {renderRegulationsModal()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f9ff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#0e7490",
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: "700",
    color: "white",
    marginBottom: 16,
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
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
    marginTop: -16,
    borderRadius: 16,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "#0891b2",
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "white",
  },

  // Content
  content: {
    flex: 1,
  },

  // Search
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1f2937",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
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
  fishIconText: {
    fontSize: 24,
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
  historyImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 2,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  historyImage: {
    width: "100%",
    height: "100%",
  },
  historyImageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
  },
  historyFallbackIcon: {
    fontSize: 28,
  },
  historyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  historyFishIcon: {
    fontSize: 32,
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
    marginTop: 2,
  },
  badgeLock: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  badgeLockIcon: {
    fontSize: 12,
  },

  // Modals
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

  // Catch Detail Modal
  detailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  detailModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  detailCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCloseBtnText: {
    fontSize: 18,
    color: "#6b7280",
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  detailFishHeader: {
    alignItems: "center",
    paddingVertical: 20,
  },
  detailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    marginBottom: 12,
  },
  detailFishIcon: {
    fontSize: 40,
  },
  detailSpeciesName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  detailRarityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  detailRarityText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  detailImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#f3f4f6",
  },
  detailImagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  detailImagePlaceholderText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  detailInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  detailInfoItem: {
    width: "47%",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
  },
  detailInfoLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  detailInfoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  detailFishInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailFishInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  detailFishInfoText: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  detailFishMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailFishMetaItem: {
    fontSize: 11,
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 20,
  },
  detailActionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  detailRegulationsBtn: {
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#0891b2",
  },
  detailUploadBtn: {
    backgroundColor: "#0891b2",
  },
  detailDeleteBtn: {
    backgroundColor: "#fef2f2",
  },
  detailActionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },

  // Regulations Modal
  regulationsModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    maxHeight: "80%",
  },
  regulationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  regulationsIcon: {
    fontSize: 24,
  },
  regulationsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  regulationsSpecies: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  regulationsSpeciesIcon: {
    fontSize: 28,
  },
  regulationsSpeciesName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0891b2",
  },
  regulationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  regulationItem: {
    width: "48%",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
  },
  regulationLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  regulationValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  regulationNotes: {
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  regulationNotesLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369a1",
    marginBottom: 4,
  },
  regulationNotesText: {
    fontSize: 14,
    color: "#0c4a6e",
    lineHeight: 20,
  },
  permitWarning: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
    alignItems: "center",
  },
  permitWarningText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400e",
  },
  noRegulations: {
    alignItems: "center",
    paddingVertical: 24,
  },
  noRegulationsText: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 4,
  },
  noRegulationsHint: {
    fontSize: 12,
    color: "#9ca3af",
  },
  closeBtn: {
    backgroundColor: "#0891b2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  closeBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});