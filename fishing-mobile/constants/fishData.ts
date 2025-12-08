// constants/fishData.ts
// ===========================================
// FISH SPECIES DATA
// ===========================================
// This file contains all static fish-related data.
// Easy to maintain and extend without touching component logic.

export type FishActivity = "High" | "Medium" | "Low";

export type FishData = {
  id: string;
  name: string;
  activity: FishActivity;
  icon: string;
  description: string;
  habitat: string;
  bestTime: string;
  avgSize: string;
  bait: string;
  // Optional extended info
  waterType?: "freshwater" | "saltwater" | "brackish";
  difficulty?: "beginner" | "intermediate" | "advanced";
  flavorProfile?: string;
  record?: string; // State/world record
};

export type FishingRegulation = {
  minSize: string;
  dailyLimit: number | string;
  season: string;
  notes: string;
  // Optional extended regulation info
  slotLimit?: string;        // e.g., "Must release fish between 15-20 inches"
  possessionLimit?: number;  // How many you can have at once
  gearRestrictions?: string; // e.g., "No live bait allowed"
  specialPermit?: boolean;   // Requires special permit
};

// ===========================================
// ALL FISH SPECIES
// ===========================================
// To add a new fish:
// 1. Add entry to ALL_FISH array below
// 2. Add corresponding regulation to FISHING_REGULATIONS
// 3. The fish will automatically appear in the app

export const ALL_FISH: FishData[] = [
  // ============ HIGH ACTIVITY (In Season) ============
  {
    id: "bass",
    name: "Largemouth Bass",
    activity: "High",
    icon: "🐟",
    description: "One of the most popular freshwater game fish in North America. Known for aggressive strikes and exciting fights.",
    habitat: "Lakes, ponds, reservoirs, slow-moving rivers",
    bestTime: "Early morning, late evening",
    avgSize: "12-18 inches",
    bait: "Plastic worms, crankbaits, spinnerbaits, live shiners",
    waterType: "freshwater",
    difficulty: "beginner",
    flavorProfile: "Mild, white flesh",
  },
  {
    id: "catfish",
    name: "Channel Catfish",
    activity: "High",
    icon: "🐠",
    description: "Bottom-dwelling fish with distinctive whiskers. Excellent sense of smell makes them easy to target with stinky baits.",
    habitat: "Rivers, lakes, ponds, reservoirs",
    bestTime: "Night, overcast days",
    avgSize: "15-24 inches",
    bait: "Chicken liver, stink bait, nightcrawlers, cut bait",
    waterType: "freshwater",
    difficulty: "beginner",
    flavorProfile: "Mild, firm white flesh",
  },
  {
    id: "perch",
    name: "Yellow Perch",
    activity: "High",
    icon: "🐡",
    description: "Popular panfish prized for their excellent taste. Often found in schools, making for fast action.",
    habitat: "Lakes, ponds, slow rivers",
    bestTime: "Morning, midday",
    avgSize: "6-10 inches",
    bait: "Minnows, worms, small jigs",
    waterType: "freshwater",
    difficulty: "beginner",
    flavorProfile: "Sweet, delicate white flesh",
  },
  {
    id: "crappie",
    name: "Crappie",
    activity: "High",
    icon: "🐠",
    description: "Excellent table fare and fun to catch. Both black and white crappie are popular targets.",
    habitat: "Lakes, reservoirs, slow rivers near structure",
    bestTime: "Spring spawn, early morning",
    avgSize: "8-12 inches",
    bait: "Small jigs, minnows, tube baits",
    waterType: "freshwater",
    difficulty: "beginner",
    flavorProfile: "Mild, flaky white flesh",
  },
  {
    id: "carp",
    name: "Common Carp",
    activity: "High",
    icon: "🐟",
    description: "Strong fighters that can grow very large. Increasingly popular among sport anglers.",
    habitat: "Warm, slow-moving waters, lakes, ponds",
    bestTime: "Afternoon, warm days",
    avgSize: "10-25 inches",
    bait: "Corn, bread, boilies, dough balls",
    waterType: "freshwater",
    difficulty: "intermediate",
    flavorProfile: "Strong, acquired taste",
  },
  {
    id: "striped",
    name: "Striped Bass",
    activity: "High",
    icon: "🐠",
    description: "Powerful swimmers that put up incredible fights. Can be found in both fresh and saltwater.",
    habitat: "Coastal waters, estuaries, large reservoirs",
    bestTime: "Tide changes, dawn, dusk",
    avgSize: "18-30 inches",
    bait: "Live bait, topwater plugs, swimbaits",
    waterType: "brackish",
    difficulty: "intermediate",
    flavorProfile: "Mild, firm white flesh",
  },

  // ============ MEDIUM ACTIVITY ============
  {
    id: "trout",
    name: "Rainbow Trout",
    activity: "Medium",
    icon: "🎣",
    description: "Beautiful, colorful fish found in cold, clear waters. Known for acrobatic jumps when hooked.",
    habitat: "Cold streams, rivers, mountain lakes",
    bestTime: "Morning, evening, overcast days",
    avgSize: "10-14 inches",
    bait: "Flies, spinners, PowerBait, worms",
    waterType: "freshwater",
    difficulty: "intermediate",
    flavorProfile: "Delicate, pink flesh",
  },
  {
    id: "bluegill",
    name: "Bluegill",
    activity: "Medium",
    icon: "🐟",
    description: "Perfect fish for beginners. Abundant, easy to catch, and great for teaching kids to fish.",
    habitat: "Shallow, weedy areas of lakes and ponds",
    bestTime: "Midday, warm afternoons",
    avgSize: "6-8 inches",
    bait: "Worms, crickets, small flies, bread",
    waterType: "freshwater",
    difficulty: "beginner",
    flavorProfile: "Sweet, mild white flesh",
  },
  {
    id: "walleye",
    name: "Walleye",
    activity: "Medium",
    icon: "🐠",
    description: "Prized game fish known for excellent taste. Their eyes are adapted for low-light feeding.",
    habitat: "Large lakes, rivers with rocky bottoms",
    bestTime: "Dusk, dawn, night",
    avgSize: "15-20 inches",
    bait: "Nightcrawlers, leeches, minnows, jigs",
    waterType: "freshwater",
    difficulty: "intermediate",
    flavorProfile: "Mild, sweet white flesh - considered the best eating freshwater fish",
  },
  {
    id: "smallmouth",
    name: "Smallmouth Bass",
    activity: "Medium",
    icon: "🐟",
    description: "Pound for pound, one of the hardest fighting freshwater fish. Found in clear, rocky waters.",
    habitat: "Clear streams, rivers, rocky lakes",
    bestTime: "Morning, evening",
    avgSize: "12-16 inches",
    bait: "Crayfish, tube baits, topwater lures",
    waterType: "freshwater",
    difficulty: "intermediate",
    flavorProfile: "Mild, white flesh",
  },

  // ============ LOW ACTIVITY ============
  {
    id: "pike",
    name: "Northern Pike",
    activity: "Low",
    icon: "🦈",
    description: "Aggressive predator with razor-sharp teeth. Ambush hunters that strike with incredible speed.",
    habitat: "Weedy lakes, slow rivers, bays",
    bestTime: "Fall, early spring, overcast days",
    avgSize: "24-36 inches",
    bait: "Large spoons, spinnerbaits, live suckers",
    waterType: "freshwater",
    difficulty: "intermediate",
    flavorProfile: "Mild but bony - Y-bones require careful filleting",
  },
  {
    id: "salmon",
    name: "Atlantic Salmon",
    activity: "Low",
    icon: "🐟",
    description: "Iconic game fish known for long migrations. Highly prized for both sport and table fare.",
    habitat: "Cold rivers, ocean (anadromous)",
    bestTime: "Spring run, fall run",
    avgSize: "20-30 inches",
    bait: "Flies, spoons, spawn bags",
    waterType: "freshwater",
    difficulty: "advanced",
    flavorProfile: "Rich, oily, orange-pink flesh",
  },
];

// ===========================================
// FISHING REGULATIONS BY SPECIES
// ===========================================
// These are EXAMPLE regulations - actual regulations vary by:
// - State/Province
// - Specific water body
// - Time of year
// - License type
//
// Always check local regulations before fishing!

export const FISHING_REGULATIONS: Record<string, FishingRegulation> = {
  "Largemouth Bass": {
    minSize: "12 inches",
    dailyLimit: 5,
    season: "Year-round",
    notes: "Only 1 fish over 15 inches allowed per day",
    possessionLimit: 10,
  },
  "Channel Catfish": {
    minSize: "12 inches",
    dailyLimit: 10,
    season: "Year-round",
    notes: "No size limit in some waters - check local rules",
    possessionLimit: 20,
  },
  "Yellow Perch": {
    minSize: "No minimum",
    dailyLimit: 25,
    season: "Year-round",
    notes: "Check local waters for specific limits",
    possessionLimit: 50,
  },
  "Crappie": {
    minSize: "9 inches",
    dailyLimit: 25,
    season: "Year-round",
    notes: "Combined black and white crappie limit",
    possessionLimit: 50,
  },
  "Common Carp": {
    minSize: "No minimum",
    dailyLimit: "No limit",
    season: "Year-round",
    notes: "Considered invasive in many areas - no release required",
  },
  "Striped Bass": {
    minSize: "28 inches",
    dailyLimit: 2,
    season: "May 1 - Dec 31",
    notes: "Slot limit may apply: 28-35 inches in some areas",
    slotLimit: "28-35 inches",
    possessionLimit: 4,
  },
  "Rainbow Trout": {
    minSize: "No minimum",
    dailyLimit: 5,
    season: "Year-round",
    notes: "Catch and release only in some streams - check signage",
    gearRestrictions: "Artificial lures only in some waters",
  },
  "Bluegill": {
    minSize: "No minimum",
    dailyLimit: 25,
    season: "Year-round",
    notes: "Combined sunfish limit (includes pumpkinseed, redear)",
    possessionLimit: 50,
  },
  "Walleye": {
    minSize: "15 inches",
    dailyLimit: 6,
    season: "May 1 - Feb 28",
    notes: "Special regulations on some lakes - check before fishing",
    possessionLimit: 12,
  },
  "Smallmouth Bass": {
    minSize: "12 inches",
    dailyLimit: 5,
    season: "Year-round",
    notes: "Catch and release only June 1-15 during spawn",
    possessionLimit: 10,
  },
  "Northern Pike": {
    minSize: "24 inches",
    dailyLimit: 3,
    season: "May 1 - Feb 28",
    notes: "Only 1 fish over 34 inches allowed",
    possessionLimit: 6,
  },
  "Atlantic Salmon": {
    minSize: "15 inches",
    dailyLimit: 2,
    season: "Apr 1 - Oct 31",
    notes: "Special permit required in most waters",
    specialPermit: true,
    possessionLimit: 4,
  },
};

// ===========================================
// DERIVED DATA (Auto-generated from ALL_FISH)
// ===========================================

/** Fish currently in season (High activity) */
export const IN_SEASON_FISH = ALL_FISH.filter((f) => f.activity === "High");

/** All common fish in the area */
export const COMMON_FISH = ALL_FISH;

/** Fish sorted by activity level */
export const FISH_BY_ACTIVITY = {
  high: ALL_FISH.filter((f) => f.activity === "High"),
  medium: ALL_FISH.filter((f) => f.activity === "Medium"),
  low: ALL_FISH.filter((f) => f.activity === "Low"),
};

/** Fish sorted by difficulty */
export const FISH_BY_DIFFICULTY = {
  beginner: ALL_FISH.filter((f) => f.difficulty === "beginner"),
  intermediate: ALL_FISH.filter((f) => f.difficulty === "intermediate"),
  advanced: ALL_FISH.filter((f) => f.difficulty === "advanced"),
};

/** Get fish by ID */
export const getFishById = (id: string): FishData | undefined => 
  ALL_FISH.find((f) => f.id === id);

/** Get fish by name (case-insensitive) */
export const getFishByName = (name: string): FishData | undefined => 
  ALL_FISH.find((f) => f.name.toLowerCase() === name.toLowerCase());

/** Get regulation by species name */
export const getRegulation = (speciesName: string): FishingRegulation | undefined => 
  FISHING_REGULATIONS[speciesName];

/** Check if a species has regulations */
export const hasRegulation = (speciesName: string): boolean => 
  speciesName in FISHING_REGULATIONS;

// ===========================================
// ACTIVITY COLORS
// ===========================================

export const ACTIVITY_COLORS: Record<FishActivity, string> = {
  High: "#22c55e",   // Green
  Medium: "#eab308", // Yellow
  Low: "#ef4444",    // Red
};

export const getActivityColor = (activity: FishActivity | string): string => {
  return ACTIVITY_COLORS[activity as FishActivity] || "#6b7280";
};
