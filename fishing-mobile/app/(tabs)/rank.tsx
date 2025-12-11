// app/(tabs)/rank.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE, bust } from "@/lib/config";
import { getUserId } from "@/lib/user";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================
// TYPES
// ============================================
type UserProfile = {
  rank: number;
  user_id: string;
  name: string;
  fishCaught: number;
  avatar: string;
  location: {
    state: string;
    county: string;
    city: string;
    town: string;
  };
  joinDate: string;
  favoriteFish: string;
  totalPoints: number;
  level: number;
  uniq_species_count?: number;
};

// ============================================
// MOCK DATA (until backend provides full profiles)
// ============================================
const MOCK_RANKINGS: UserProfile[] = [
  { rank: 1, user_id: "fishmasterpro", name: "FishMaster Pro", fishCaught: 247, avatar: "🎣", location: { state: "Massachusetts", county: "Suffolk", city: "Boston", town: "Downtown" }, joinDate: "Jan 2024", favoriteFish: "Bluefin Tuna", totalPoints: 12350, level: 45 },
  { rank: 2, user_id: "oceanhunter", name: "Ocean Hunter", fishCaught: 198, avatar: "🌊", location: { state: "Massachusetts", county: "Norfolk", city: "Quincy", town: "Marina Bay" }, joinDate: "Feb 2024", favoriteFish: "Striped Bass", totalPoints: 9900, level: 38 },
  { rank: 3, user_id: "lakelegend", name: "Lake Legend", fishCaught: 176, avatar: "⛵", location: { state: "Rhode Island", county: "Providence", city: "Providence", town: "Fox Point" }, joinDate: "Dec 2023", favoriteFish: "Rainbow Trout", totalPoints: 8800, level: 35 },
  { rank: 4, user_id: "riverking", name: "River King", fishCaught: 154, avatar: "👑", location: { state: "Massachusetts", county: "Middlesex", city: "Cambridge", town: "Riverside" }, joinDate: "Mar 2024", favoriteFish: "Largemouth Bass", totalPoints: 7700, level: 32 },
  { rank: 5, user_id: "bassboss", name: "Bass Boss", fishCaught: 142, avatar: "🐟", location: { state: "Connecticut", county: "Hartford", city: "Hartford", town: "Downtown" }, joinDate: "Jan 2024", favoriteFish: "Smallmouth Bass", totalPoints: 7100, level: 30 },
  { rank: 6, user_id: "trouttracker", name: "Trout Tracker", fishCaught: 128, avatar: "🎯", location: { state: "Massachusetts", county: "Essex", city: "Salem", town: "Harbor District" }, joinDate: "Apr 2024", favoriteFish: "Brown Trout", totalPoints: 6400, level: 28 },
  { rank: 7, user_id: "anglerelite", name: "Angler Elite", fishCaught: 115, avatar: "⭐", location: { state: "New Hampshire", county: "Rockingham", city: "Portsmouth", town: "South End" }, joinDate: "Feb 2024", favoriteFish: "Atlantic Cod", totalPoints: 5750, level: 25 },
  { rank: 8, user_id: "deepseadan", name: "Deep Sea Dan", fishCaught: 103, avatar: "🌟", location: { state: "Rhode Island", county: "Newport", city: "Newport", town: "Ocean Drive" }, joinDate: "May 2024", favoriteFish: "Bluefish", totalPoints: 5150, level: 23 },
  { rank: 9, user_id: "tackletom", name: "Tackle Tom", fishCaught: 95, avatar: "🎪", location: { state: "Massachusetts", county: "Plymouth", city: "Plymouth", town: "Waterfront" }, joinDate: "Mar 2024", favoriteFish: "Northern Pike", totalPoints: 4750, level: 21 },
  { rank: 10, user_id: "reeldeal", name: "Reel Deal", fishCaught: 87, avatar: "💫", location: { state: "Connecticut", county: "New London", city: "New London", town: "Harbor Heights" }, joinDate: "Jun 2024", favoriteFish: "Catfish", totalPoints: 4350, level: 19 },
];

// ============================================
// HELPER FUNCTIONS
// ============================================
const getMedalEmoji = (rank: number): string => {
  switch (rank) {
    case 1: return "🥇";
    case 2: return "🥈";
    case 3: return "🥉";
    default: return "";
  }
};

const getRankBgColor = (rank: number): string => {
  switch (rank) {
    case 1: return "#fef9c3"; // gold
    case 2: return "#f3f4f6"; // silver
    case 3: return "#fed7aa"; // bronze
    default: return "#ffffff";
  }
};

const getRankBorderColor = (rank: number): string => {
  switch (rank) {
    case 1: return "#fbbf24";
    case 2: return "#9ca3af";
    case 3: return "#fb923c";
    default: return "#e5e7eb";
  }
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function Rankings() {
  const [userId, setUserId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<UserProfile[]>(MOCK_RANKINGS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [locationFilter, setLocationFilter] = useState<string>("global");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  // User profile modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const listRef = useRef<FlatList<UserProfile>>(null);

  // Load current user ID
  useEffect(() => {
    let alive = true;
    (async () => {
      const id = await getUserId().catch(() => null);
      if (alive) setUserId(id ?? null);
    })();
    return () => { alive = false; };
  }, []);

  // Fetch rankings from API
  const fetchRanks = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const base = API_BASE.replace(/\/+$/, "");
      const candidates = [
        `${base}/stats/users-unique-species`,
        `${base}/api/stats/users-unique-species`,
      ];

      let data: any[] | null = null;
      let lastMsg = "404";

      for (const url of candidates) {
        try {
          const r = await fetch(`${url}?t=${Date.now()}`);
          if (!r.ok) {
            lastMsg = String(r.status);
            continue;
          }
          data = await r.json();
          break;
        } catch (e: any) {
          lastMsg = e?.message || lastMsg;
        }
      }

      if (data && data.length > 0) {
        // Merge API data with mock profiles for display
        const merged: UserProfile[] = data
          .sort((a, b) => (b.uniq_species_count || 0) - (a.uniq_species_count || 0))
          .map((row, idx) => {
            // Try to find matching mock profile or create basic one
            const mock = MOCK_RANKINGS.find(m => m.user_id === row.user_id);
            return {
              rank: idx + 1,
              user_id: row.user_id,
              name: row.username || row.user_id || `Angler ${idx + 1}`,
              fishCaught: row.uniq_species_count || 0,
              avatar: mock?.avatar || ["🎣", "🐟", "🌊", "⛵", "🎯", "⭐"][idx % 6],
              location: mock?.location || { state: "Unknown", county: "Unknown", city: "Unknown", town: "Unknown" },
              joinDate: mock?.joinDate || "2024",
              favoriteFish: mock?.favoriteFish || "Unknown",
              totalPoints: (row.uniq_species_count || 0) * 50,
              level: Math.floor((row.uniq_species_count || 0) / 2) + 1,
              uniq_species_count: row.uniq_species_count,
            };
          });
        setRankings(merged);
      } else {
        // Use mock data if API fails
        setRankings(MOCK_RANKINGS);
      }
    } catch (e: any) {
      setError(`Failed to load rankings`);
      setRankings(MOCK_RANKINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanks();
  }, [fetchRanks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRanks();
    } finally {
      setRefreshing(false);
    }
  }, [fetchRanks]);

  // Filter rankings by location
  const filteredRankings = useMemo(() => {
    if (locationFilter === "global") return rankings;
    
    const [filterType, filterValue] = locationFilter.split(":");
    return rankings.filter(user => {
      switch (filterType) {
        case "state": return user.location.state === filterValue;
        case "county": return user.location.county === filterValue;
        case "city": return user.location.city === filterValue;
        case "town": return user.location.town === filterValue;
        default: return true;
      }
    });
  }, [rankings, locationFilter]);

  // Get unique location values for filter
  const uniqueStates = useMemo(() => Array.from(new Set(rankings.map(u => u.location.state))), [rankings]);
  const uniqueCounties = useMemo(() => Array.from(new Set(rankings.map(u => u.location.county))), [rankings]);
  const uniqueCities = useMemo(() => Array.from(new Set(rankings.map(u => u.location.city))), [rankings]);

  // Find current user's rank
  const myIndex = useMemo(
    () => (userId ? filteredRankings.findIndex((r) => r.user_id === userId) : -1),
    [userId, filteredRankings]
  );

  // Auto-scroll to current user if far down
  useEffect(() => {
    if (myIndex > 10) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: myIndex, animated: true });
      }, 300);
    }
  }, [myIndex]);

  // Get filter display text
  const getFilterDisplayText = () => {
    if (locationFilter === "global") return "Global";
    const [, value] = locationFilter.split(":");
    return value || "Global";
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderRankingItem = ({ item, index }: { item: UserProfile; index: number }) => {
    const isMe = userId && item.user_id === userId;
    const actualRank = index + 1;
    
    return (
      <TouchableOpacity
        style={[
          styles.rankItem,
          { 
            backgroundColor: isMe ? "#eef2ff" : getRankBgColor(actualRank),
            borderColor: isMe ? "#818cf8" : getRankBorderColor(actualRank),
          }
        ]}
        onPress={() => setSelectedUser({ ...item, rank: actualRank })}
        activeOpacity={0.8}
      >
        {/* Rank */}
        <View style={styles.rankNumber}>
          {actualRank <= 3 ? (
            <Text style={styles.medalEmoji}>{getMedalEmoji(actualRank)}</Text>
          ) : (
            <Text style={styles.rankText}>{actualRank}</Text>
          )}
        </View>

        {/* Avatar */}
        <LinearGradient
          colors={["#06b6d4", "#3b82f6"]}
          style={styles.avatar}
        >
          <Text style={styles.avatarEmoji}>{item.avatar}</Text>
        </LinearGradient>

        {/* Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            {isMe && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>YOU</Text>
              </View>
            )}
          </View>
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location.city}, {item.location.state}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.fishCount}>{item.fishCaught}</Text>
          <Text style={styles.fishLabel}>Species</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  if (loading && rankings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Loading rankings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#a855f7", "#ec4899"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerIcon}>🏆</Text>
        <Text style={styles.headerTitle}>Global Rankings</Text>
        <Text style={styles.headerSubtitle}>Compete with anglers worldwide</Text>
      </LinearGradient>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        <LinearGradient
          colors={["#a855f7", "#ec4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.filterHeader}
        >
          <Text style={styles.filterHeaderIcon}>🏆</Text>
          <Text style={styles.filterHeaderTitle}>Top Anglers</Text>
        </LinearGradient>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalOpen(true)}
          >
            <Text style={styles.filterButtonIcon}>📍</Text>
            <Text style={styles.filterButtonText}>{getFilterDisplayText()}</Text>
            <Text style={styles.filterButtonArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* My Rank Banner */}
        {myIndex >= 0 && (
          <View style={styles.myRankBanner}>
            <Text style={styles.myRankText}>
              You're currently #{myIndex + 1} • {filteredRankings[myIndex]?.fishCaught ?? 0} species
            </Text>
          </View>
        )}
      </View>

      {/* Rankings List */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRanks}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={filteredRankings}
          keyExtractor={(item) => item.user_id}
          renderItem={renderRankingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎣</Text>
              <Text style={styles.emptyTitle}>No anglers found</Text>
              <Text style={styles.emptyDesc}>Try changing the location filter</Text>
            </View>
          }
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: true });
            }, 300);
          }}
        />
      )}

      {/* Location Filter Modal */}
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
            <Text style={styles.filterModalTitle}>Filter by Location</Text>
            
            <TouchableOpacity
              style={[styles.filterOption, locationFilter === "global" && styles.filterOptionActive]}
              onPress={() => { setLocationFilter("global"); setFilterModalOpen(false); }}
            >
              <Text style={styles.filterOptionIcon}>🌍</Text>
              <Text style={[styles.filterOptionText, locationFilter === "global" && styles.filterOptionTextActive]}>
                Global
              </Text>
            </TouchableOpacity>

            <Text style={styles.filterSectionTitle}>States</Text>
            {uniqueStates.map((state) => (
              <TouchableOpacity
                key={state}
                style={[styles.filterOption, locationFilter === `state:${state}` && styles.filterOptionActive]}
                onPress={() => { setLocationFilter(`state:${state}`); setFilterModalOpen(false); }}
              >
                <Text style={styles.filterOptionIcon}>📍</Text>
                <Text style={[styles.filterOptionText, locationFilter === `state:${state}` && styles.filterOptionTextActive]}>
                  {state}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.filterSectionTitle}>Cities</Text>
            {uniqueCities.slice(0, 5).map((city) => (
              <TouchableOpacity
                key={city}
                style={[styles.filterOption, locationFilter === `city:${city}` && styles.filterOptionActive]}
                onPress={() => { setLocationFilter(`city:${city}`); setFilterModalOpen(false); }}
              >
                <Text style={styles.filterOptionIcon}>🏙️</Text>
                <Text style={[styles.filterOptionText, locationFilter === `city:${city}` && styles.filterOptionTextActive]}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* User Profile Modal */}
      <Modal
        visible={selectedUser !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModal}>
            {selectedUser && (
              <>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                  <LinearGradient
                    colors={["#06b6d4", "#3b82f6"]}
                    style={styles.profileAvatar}
                  >
                    <Text style={styles.profileAvatarEmoji}>{selectedUser.avatar}</Text>
                  </LinearGradient>
                  
                  <Text style={styles.profileName}>{selectedUser.name}</Text>
                  
                  <View style={styles.profileBadges}>
                    <View style={styles.profileRankBadge}>
                      <Text style={styles.profileRankBadgeText}>Rank #{selectedUser.rank}</Text>
                    </View>
                    <View style={styles.profileLevelBadge}>
                      <Text style={styles.profileLevelBadgeText}>Level {selectedUser.level}</Text>
                    </View>
                  </View>
                </View>

                {/* Stats */}
                <View style={styles.profileStats}>
                  <View style={[styles.profileStatCard, { backgroundColor: "#e0f2fe" }]}>
                    <Text style={styles.profileStatLabel}>Total Species</Text>
                    <Text style={[styles.profileStatValue, { color: "#0891b2" }]}>{selectedUser.fishCaught}</Text>
                  </View>
                  <View style={[styles.profileStatCard, { backgroundColor: "#fae8ff" }]}>
                    <Text style={styles.profileStatLabel}>Total Points</Text>
                    <Text style={[styles.profileStatValue, { color: "#a855f7" }]}>{selectedUser.totalPoints}</Text>
                  </View>
                </View>

                {/* Location */}
                <View style={styles.profileSection}>
                  <View style={styles.profileSectionHeader}>
                    <Text style={styles.profileSectionIcon}>📍</Text>
                    <Text style={styles.profileSectionTitle}>Location</Text>
                  </View>
                  <Text style={styles.profileSectionText}>
                    {selectedUser.location.city}, {selectedUser.location.state}
                  </Text>
                  <Text style={styles.profileSectionSubtext}>
                    {selectedUser.location.county} County
                  </Text>
                </View>

                {/* Favorite Fish */}
                <View style={styles.profileSection}>
                  <View style={styles.profileSectionHeader}>
                    <Text style={styles.profileSectionIcon}>🏆</Text>
                    <Text style={styles.profileSectionTitle}>Favorite Fish</Text>
                  </View>
                  <Text style={styles.profileSectionText}>{selectedUser.favoriteFish}</Text>
                </View>

                {/* Member Since */}
                <View style={styles.profileSection}>
                  <View style={styles.profileSectionHeader}>
                    <Text style={styles.profileSectionIcon}>📅</Text>
                    <Text style={styles.profileSectionTitle}>Member Since</Text>
                  </View>
                  <Text style={styles.profileSectionText}>{selectedUser.joinDate}</Text>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedUser(null)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
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
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginTop: 4,
  },

  // Filter Section
  filterContainer: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 8,
  },
  filterHeaderIcon: {
    fontSize: 18,
  },
  filterHeaderTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  filterRow: {
    padding: 12,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  filterButtonIcon: {
    fontSize: 16,
  },
  filterButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },
  filterButtonArrow: {
    fontSize: 10,
    color: "#6b7280",
  },
  myRankBanner: {
    backgroundColor: "#eef2ff",
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
  },
  myRankText: {
    color: "#4f46e5",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  rankItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    gap: 12,
  },
  rankNumber: {
    width: 32,
    alignItems: "center",
  },
  medalEmoji: {
    fontSize: 24,
  },
  rankText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6b7280",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  youBadge: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  youBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  locationIcon: {
    fontSize: 10,
    opacity: 0.6,
  },
  locationText: {
    fontSize: 12,
    color: "#6b7280",
  },
  statsContainer: {
    alignItems: "center",
  },
  fishCount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0891b2",
  },
  fishLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  separator: {
    height: 10,
  },

  // Empty State
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

  // Error
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#a855f7",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
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
    width: SCREEN_WIDTH - 48,
    maxHeight: "70%",
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 10,
  },
  filterOptionActive: {
    backgroundColor: "#fae8ff",
  },
  filterOptionIcon: {
    fontSize: 16,
  },
  filterOptionText: {
    fontSize: 15,
    color: "#1f2937",
  },
  filterOptionTextActive: {
    fontWeight: "600",
    color: "#a855f7",
  },

  // Profile Modal
  profileModal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    maxHeight: "80%",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  profileAvatarEmoji: {
    fontSize: 40,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  profileBadges: {
    flexDirection: "row",
    gap: 8,
  },
  profileRankBadge: {
    backgroundColor: "#fae8ff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileRankBadgeText: {
    color: "#a855f7",
    fontSize: 12,
    fontWeight: "600",
  },
  profileLevelBadge: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileLevelBadgeText: {
    color: "#0891b2",
    fontSize: 12,
    fontWeight: "600",
  },
  profileStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  profileStatCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  profileStatLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  profileStatValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  profileSection: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  profileSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  profileSectionIcon: {
    fontSize: 16,
  },
  profileSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  profileSectionText: {
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "500",
  },
  profileSectionSubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: "#a855f7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
