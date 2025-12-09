// constants/fishData.ts
// ===========================================
// FISH SPECIES DATA - SINGLE SOURCE OF TRUTH
// ===========================================
// This file contains all static fish-related data.
// Used by: Home page (In Season, Common Fish) and Fish Index (Collection)
// Easy to maintain and extend without touching component logic.

export type FishActivity = "High" | "Medium" | "Low";
export type FishRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type FishData = {
  id: string;
  name: string;
  activity: FishActivity;
  rarity: FishRarity;
  points: number;
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
  record?: string;
};

export type FishingRegulation = {
  minSize: string;
  dailyLimit: number | string;
  season: string;
  notes: string;
  slotLimit?: string;
  possessionLimit?: number;
  gearRestrictions?: string;
  specialPermit?: boolean;
};

// ===========================================
// ALL FISH SPECIES (30 Total)
// ===========================================
// Rarity Distribution:
// - Common (9): 10 pts each
// - Uncommon (10): 25 pts each
// - Rare (8): 50 pts each
// - Epic (2): 100 pts each
// - Legendary (1): 200 pts each
//
// To add a new fish:
// 1. Add entry to ALL_FISH array below
// 2. Add corresponding regulation to FISHING_REGULATIONS
// 3. The fish will automatically appear in the app

export const ALL_FISH: FishData[] = [
  // ============ COMMON FISH (9) - 10 pts ============
  {
    id: "bluegill",
    name: "Bluegill",
    activity: "High",
    rarity: "Common",
    points: 10,
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
    id: "crappie",
    name: "Crappie",
    activity: "High",
    rarity: "Common",
    points: 10,
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
    id: "yellow-perch",
    name: "Yellow Perch",
    activity: "High",
    rarity: "Common",
    points: 10,
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
    id: "white-perch",
    name: "White Perch",
    activity: "Medium",
    rarity: "Common",
    points: 10,
    icon: "🐟",
    description: "Schooling fish that are abundant in coastal waters. Good fighters for their size.",
    habitat: "Brackish estuaries, coastal ponds, rivers",
    bestTime: "Early morning, evening",
    avgSize: "8-10 inches",
    bait: "Worms, small minnows, grass shrimp",
    waterType: "brackish",
    difficulty: "beginner",
    flavorProfile: "Mild, slightly sweet white flesh",
  },
  {
    id: "scup",
    name: "Scup",
    activity: "Medium",
    rarity: "Common",
    points: 10,
    icon: "🐠",
    description: "Also known as porgy. Popular saltwater panfish found along the Atlantic coast.",
    habitat: "Coastal waters, rocky bottoms, piers",
    bestTime: "Summer months, midday",
    avgSize: "8-12 inches",
    bait: "Squid, clams, worms",
    waterType: "saltwater",
    difficulty: "beginner",
    flavorProfile: "Mild, firm white flesh",
  },
  {
    id: "mackerel",
    name: "Mackerel",
    activity: "High",
    rarity: "Common",
    points: 10,
    icon: "🐟",
    description: "Fast-swimming schooling fish. Great for beginners and excellent as bait for larger species.",
    habitat: "Open ocean, coastal waters",
    bestTime: "Morning, when schools are near surface",
    avgSize: "12-16 inches",
    bait: "Small jigs, feathers, cut bait",
    waterType: "saltwater",
    difficulty: "beginner",
    flavorProfile: "Rich, oily, dark flesh",
  },
  {
    id: "whiting",
    name: "Whiting",
    activity: "Medium",
    rarity: "Common",
    points: 10,
    icon: "🐠",
    description: "Bottom-dwelling fish popular for surf fishing. Often caught in good numbers.",
    habitat: "Sandy beaches, surf zone, coastal waters",
    bestTime: "Fall, winter months",
    avgSize: "10-14 inches",
    bait: "Bloodworms, clams, cut bait",
    waterType: "saltwater",
    difficulty: "beginner",
    flavorProfile: "Mild, delicate white flesh",
  },
  {
    id: "flounder",
    name: "Flounder",
    activity: "Medium",
    rarity: "Common",
    points: 10,
    icon: "🐟",
    description: "Flatfish that lies camouflaged on the bottom. Prized for excellent meat.",
    habitat: "Sandy and muddy bottoms, estuaries, bays",
    bestTime: "Incoming tide, early morning",
    avgSize: "14-18 inches",
    bait: "Minnows, squid strips, bucktails",
    waterType: "saltwater",
    difficulty: "intermediate",
    flavorProfile: "Mild, sweet, flaky white flesh",
  },
  {
    id: "carp",
    name: "Carp",
    activity: "High",
    rarity: "Common",
    points: 10,
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

  // ============ UNCOMMON FISH (10) - 25 pts ============
  {
    id: "largemouth-bass",
    name: "Largemouth Bass",
    activity: "High",
    rarity: "Uncommon",
    points: 25,
    icon: "🐟",
    description: "One of the most popular freshwater game fish in North America. Known for aggressive strikes.",
    habitat: "Lakes, ponds, reservoirs, slow-moving rivers",
    bestTime: "Early morning, late evening",
    avgSize: "12-18 inches",
    bait: "Plastic worms, crankbaits, spinnerbaits, live shiners",
    waterType: "freshwater",
    difficulty: "beginner",
    flavorProfile: "Mild, white flesh",
  },
  {
    id: "smallmouth-bass",
    name: "Smallmouth Bass",
    activity: "Medium",
    rarity: "Uncommon",
    points: 25,
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
  {
    id: "rainbow-trout",
    name: "Rainbow Trout",
    activity: "Medium",
    rarity: "Uncommon",
    points: 25,
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
    id: "brown-trout",
    name: "Brown Trout",
    activity: "Medium",
    rarity: "Uncommon",
    points: 25,
    icon: "🐟",
    description: "Wary and challenging to catch. Prized by fly fishermen for their selective feeding habits.",
    habitat: "Cold streams, rivers, deep lakes",
    bestTime: "Evening, night, overcast days",
    avgSize: "12-18 inches",
    bait: "Flies, streamers, minnows, worms",
    waterType: "freshwater",
    difficulty: "advanced",
    flavorProfile: "Rich, buttery flesh",
  },
  {
    id: "catfish",
    name: "Channel Catfish",
    activity: "High",
    rarity: "Uncommon",
    points: 25,
    icon: "🐠",
    description: "Bottom-dwelling fish with distinctive whiskers. Excellent sense of smell makes them easy to target.",
    habitat: "Rivers, lakes, ponds, reservoirs",
    bestTime: "Night, overcast days",
    avgSize: "15-24 inches",
    bait: "Chicken liver, stink bait, nightcrawlers, cut bait",
    waterType: "freshwater",
    difficulty: "beginner",
    flavorProfile: "Mild, firm white flesh",
  },
  {
    id: "chain-pickerel",
    name: "Chain Pickerel",
    activity: "Medium",
    rarity: "Uncommon",
    points: 25,
    icon: "🐟",
    description: "Aggressive predator with chain-like markings. Smaller cousin of the northern pike.",
    habitat: "Weedy ponds, lakes, slow streams",
    bestTime: "Morning, afternoon",
    avgSize: "15-20 inches",
    bait: "Minnows, spinnerbaits, spoons",
    waterType: "freshwater",
    difficulty: "intermediate",
    flavorProfile: "White flesh, many small bones",
  },
  {
    id: "black-sea-bass",
    name: "Black Sea Bass",
    activity: "Medium",
    rarity: "Uncommon",
    points: 25,
    icon: "🐠",
    description: "Popular bottom fish found around structure. Aggressive feeders with excellent meat.",
    habitat: "Rocky reefs, wrecks, jetties",
    bestTime: "Slack tide, midday",
    avgSize: "12-16 inches",
    bait: "Squid, clams, crabs, cut bait",
    waterType: "saltwater",
    difficulty: "intermediate",
    flavorProfile: "Firm, white, sweet flesh",
  },
  {
    id: "fluke",
    name: "Fluke",
    activity: "Medium",
    rarity: "Uncommon",
    points: 25,
    icon: "🐟",
    description: "Also called summer flounder. Active predator that chases baitfish unlike other flatfish.",
    habitat: "Sandy bottoms, channels, inlets",
    bestTime: "Moving tide, morning",
    avgSize: "16-22 inches",
    bait: "Live minnows, bucktails, strip baits",
    waterType: "saltwater",
    difficulty: "intermediate",
    flavorProfile: "Mild, sweet, flaky white flesh",
  },
  {
    id: "hake",
    name: "Hake",
    activity: "Low",
    rarity: "Uncommon",
    points: 25,
    icon: "🐠",
    description: "Deep water bottom fish. Often caught while targeting other species.",
    habitat: "Deep offshore waters, muddy bottoms",
    bestTime: "Night, deep water",
    avgSize: "12-18 inches",
    bait: "Cut bait, squid, clams",
    waterType: "saltwater",
    difficulty: "intermediate",
    flavorProfile: "Soft, mild white flesh",
  },
  {
    id: "tautog",
    name: "Tautog",
    activity: "Low",
    rarity: "Uncommon",
    points: 25,
    icon: "🐟",
    description: "Also known as blackfish. Structure-oriented fish with powerful jaws for crushing shellfish.",
    habitat: "Rocky reefs, wrecks, jetties, mussel beds",
    bestTime: "Fall, early winter, slack tide",
    avgSize: "14-18 inches",
    bait: "Green crabs, Asian crabs, clams",
    waterType: "saltwater",
    difficulty: "advanced",
    flavorProfile: "Firm, white, mild flesh",
  },

  // ============ RARE FISH (8) - 50 pts ============
  {
    id: "striped-bass",
    name: "Striped Bass",
    activity: "High",
    rarity: "Rare",
    points: 50,
    icon: "🐠",
    description: "Powerful swimmers that put up incredible fights. Icon of East Coast fishing.",
    habitat: "Coastal waters, estuaries, large reservoirs",
    bestTime: "Tide changes, dawn, dusk",
    avgSize: "18-30 inches",
    bait: "Live bait, topwater plugs, swimbaits",
    waterType: "brackish",
    difficulty: "intermediate",
    flavorProfile: "Mild, firm white flesh",
  },
  {
    id: "lake-trout",
    name: "Lake Trout",
    activity: "Low",
    rarity: "Rare",
    points: 50,
    icon: "🐟",
    description: "Deep-water char found in cold northern lakes. Can live for decades and grow very large.",
    habitat: "Deep, cold lakes",
    bestTime: "Early morning, fall, through ice",
    avgSize: "18-28 inches",
    bait: "Spoons, tube jigs, live bait",
    waterType: "freshwater",
    difficulty: "intermediate",
    flavorProfile: "Rich, oily flesh",
  },
  {
    id: "northern-pike",
    name: "Northern Pike",
    activity: "Low",
    rarity: "Rare",
    points: 50,
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
    id: "landlocked-salmon",
    name: "Landlocked Salmon",
    activity: "Low",
    rarity: "Rare",
    points: 50,
    icon: "🐟",
    description: "Freshwater form of Atlantic salmon. Acrobatic fighters prized by anglers.",
    habitat: "Deep, cold lakes with tributary streams",
    bestTime: "Spring, fall, ice-out",
    avgSize: "16-22 inches",
    bait: "Streamers, spoons, live smelt",
    waterType: "freshwater",
    difficulty: "advanced",
    flavorProfile: "Pink, rich flesh",
  },
  {
    id: "bluefish",
    name: "Bluefish",
    activity: "High",
    rarity: "Rare",
    points: 50,
    icon: "🐟",
    description: "Aggressive predators known for feeding frenzies. Sharp teeth require wire leaders.",
    habitat: "Coastal waters, surf, inlets",
    bestTime: "Summer, fall, feeding blitzes",
    avgSize: "18-26 inches",
    bait: "Metal lures, topwater plugs, cut bait",
    waterType: "saltwater",
    difficulty: "intermediate",
    flavorProfile: "Strong, oily, dark flesh - best eaten fresh",
  },
  {
    id: "atlantic-cod",
    name: "Atlantic Cod",
    activity: "Low",
    rarity: "Rare",
    points: 50,
    icon: "🐟",
    description: "Historic species that shaped New England fishing. Now carefully managed.",
    habitat: "Deep, cold offshore waters, wrecks",
    bestTime: "Winter, spring",
    avgSize: "20-30 inches",
    bait: "Jigs, clams, cut bait",
    waterType: "saltwater",
    difficulty: "intermediate",
    flavorProfile: "Mild, flaky white flesh - iconic for fish & chips",
  },
  {
    id: "haddock",
    name: "Haddock",
    activity: "Low",
    rarity: "Rare",
    points: 50,
    icon: "🐠",
    description: "Cousin of cod with distinctive black lateral line. Popular commercial and recreational species.",
    habitat: "Deep, cold offshore waters",
    bestTime: "Spring, summer",
    avgSize: "18-24 inches",
    bait: "Clams, jigs, cut bait",
    waterType: "saltwater",
    difficulty: "intermediate",
    flavorProfile: "Mild, slightly sweet white flesh",
  },
  {
    id: "cusk",
    name: "Cusk",
    activity: "Low",
    rarity: "Rare",
    points: 50,
    icon: "🐟",
    description: "Deep-water species related to cod. Solitary bottom dweller found around structure.",
    habitat: "Deep rocky bottoms, offshore",
    bestTime: "Year-round, deep water",
    avgSize: "18-26 inches",
    bait: "Clams, cut bait, jigs",
    waterType: "saltwater",
    difficulty: "advanced",
    flavorProfile: "Firm, white, lobster-like flesh",
  },

  // ============ EPIC FISH (2) - 100 pts ============
  {
    id: "redfish",
    name: "Redfish",
    activity: "Medium",
    rarity: "Epic",
    points: 100,
    icon: "🐠",
    description: "Also known as red drum. Powerful fighters popular in southern waters.",
    habitat: "Coastal marshes, flats, jetties",
    bestTime: "Fall, incoming tide",
    avgSize: "22-30 inches",
    bait: "Live shrimp, cut mullet, gold spoons",
    waterType: "saltwater",
    difficulty: "intermediate",
    flavorProfile: "Mild, sweet white flesh",
  },
  {
    id: "walleye",
    name: "Walleye",
    activity: "Medium",
    rarity: "Epic",
    points: 100,
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

  // ============ LEGENDARY FISH (1) - 200 pts ============
  {
    id: "bluefin-tuna",
    name: "Bluefin Tuna",
    activity: "Low",
    rarity: "Legendary",
    points: 200,
    icon: "🐟",
    description: "The ultimate prize for offshore anglers. Can exceed 1000 lbs and fetch record prices.",
    habitat: "Deep offshore waters, canyons",
    bestTime: "Summer, fall, when bait is present",
    avgSize: "40-80 inches",
    bait: "Live bait, trolling lures, chunking",
    waterType: "saltwater",
    difficulty: "advanced",
    flavorProfile: "Rich, red flesh - prized for sushi/sashimi",
  },
];

// ===========================================
// FISHING REGULATIONS BY SPECIES
// ===========================================
export const FISHING_REGULATIONS: { [key: string]: FishingRegulation } = {
  "Bluegill": {
    minSize: "No minimum",
    dailyLimit: 25,
    season: "Year-round",
    notes: "Combined sunfish limit (includes pumpkinseed, redear)",
    possessionLimit: 50,
  },
  "Crappie": {
    minSize: "9 inches",
    dailyLimit: 25,
    season: "Year-round",
    notes: "Combined black and white crappie limit",
    possessionLimit: 50,
  },
  "Yellow Perch": {
    minSize: "No minimum",
    dailyLimit: 25,
    season: "Year-round",
    notes: "Check local waters for specific limits",
    possessionLimit: 50,
  },
  "White Perch": {
    minSize: "No minimum",
    dailyLimit: 25,
    season: "Year-round",
    notes: "No restrictions in most areas",
  },
  "Scup": {
    minSize: "9 inches",
    dailyLimit: 30,
    season: "May 1 - Dec 31",
    notes: "Size limits vary by state",
  },
  "Mackerel": {
    minSize: "No minimum",
    dailyLimit: "No limit",
    season: "Year-round",
    notes: "No restrictions - abundant species",
  },
  "Whiting": {
    minSize: "No minimum",
    dailyLimit: "No limit",
    season: "Year-round",
    notes: "Also called kingfish in some areas",
  },
  "Flounder": {
    minSize: "14 inches",
    dailyLimit: 4,
    season: "May 1 - Sep 30",
    notes: "Winter flounder - check summer flounder (fluke) separately",
  },
  "Carp": {
    minSize: "No minimum",
    dailyLimit: "No limit",
    season: "Year-round",
    notes: "Considered invasive in many areas - no release required",
  },
  "Largemouth Bass": {
    minSize: "12 inches",
    dailyLimit: 5,
    season: "Year-round",
    notes: "Only 1 fish over 15 inches allowed per day",
    possessionLimit: 10,
  },
  "Smallmouth Bass": {
    minSize: "12 inches",
    dailyLimit: 5,
    season: "Year-round",
    notes: "Catch and release only June 1-15 during spawn",
    possessionLimit: 10,
  },
  "Rainbow Trout": {
    minSize: "No minimum",
    dailyLimit: 5,
    season: "Year-round",
    notes: "Catch and release only in some streams - check signage",
    gearRestrictions: "Artificial lures only in some waters",
  },
  "Brown Trout": {
    minSize: "15 inches",
    dailyLimit: 2,
    season: "Year-round",
    notes: "Special regulations on wild trout streams",
    gearRestrictions: "Artificial lures only in some waters",
  },
  "Channel Catfish": {
    minSize: "12 inches",
    dailyLimit: 10,
    season: "Year-round",
    notes: "No size limit in some waters - check local rules",
    possessionLimit: 20,
  },
  "Chain Pickerel": {
    minSize: "15 inches",
    dailyLimit: 5,
    season: "Year-round",
    notes: "Combined pike/pickerel limit in some states",
  },
  "Black Sea Bass": {
    minSize: "12.5 inches",
    dailyLimit: 5,
    season: "May 15 - Dec 31",
    notes: "Regulations change frequently - verify before fishing",
  },
  "Fluke": {
    minSize: "19 inches",
    dailyLimit: 4,
    season: "May 1 - Sep 30",
    notes: "Also called summer flounder",
  },
  "Hake": {
    minSize: "No minimum",
    dailyLimit: "No limit",
    season: "Year-round",
    notes: "No restrictions",
  },
  "Tautog": {
    minSize: "16 inches",
    dailyLimit: 3,
    season: "Apr 1 - May 31, Jul 1 - Dec 31",
    notes: "Closed season to protect spawning",
  },
  "Striped Bass": {
    minSize: "28 inches",
    dailyLimit: 1,
    season: "Year-round with restrictions",
    notes: "Slot limit may apply: 28-35 inches in some areas",
    slotLimit: "28-35 inches",
    possessionLimit: 2,
  },
  "Lake Trout": {
    minSize: "15 inches",
    dailyLimit: 2,
    season: "Year-round",
    notes: "Special regulations on trophy waters",
  },
  "Northern Pike": {
    minSize: "24 inches",
    dailyLimit: 3,
    season: "May 1 - Feb 28",
    notes: "Only 1 fish over 34 inches allowed",
    possessionLimit: 6,
  },
  "Landlocked Salmon": {
    minSize: "14 inches",
    dailyLimit: 2,
    season: "Apr 1 - Sep 30",
    notes: "Special regulations on each lake",
  },
  "Bluefish": {
    minSize: "12 inches",
    dailyLimit: 5,
    season: "Year-round",
    notes: "Bag limits have been reduced recently",
  },
  "Atlantic Cod": {
    minSize: "19 inches",
    dailyLimit: 10,
    season: "Year-round with closures",
    notes: "Rolling closures to protect stocks - check before trip",
  },
  "Haddock": {
    minSize: "17 inches",
    dailyLimit: 15,
    season: "Year-round",
    notes: "More abundant than cod currently",
  },
  "Cusk": {
    minSize: "No minimum",
    dailyLimit: "No limit",
    season: "Year-round",
    notes: "Unregulated bycatch species",
  },
  "Redfish": {
    minSize: "18 inches",
    dailyLimit: 1,
    season: "Year-round",
    notes: "Slot limit: 18-27 inches in most areas",
    slotLimit: "18-27 inches",
  },
  "Walleye": {
    minSize: "15 inches",
    dailyLimit: 6,
    season: "May 1 - Feb 28",
    notes: "Special regulations on some lakes - check before fishing",
    possessionLimit: 12,
  },
  "Bluefin Tuna": {
    minSize: "73 inches",
    dailyLimit: 1,
    season: "Jun 1 - Dec 31",
    notes: "Highly regulated - permit required, reporting mandatory",
    specialPermit: true,
  },
};

// ===========================================
// DERIVED DATA - AUTO-GENERATED LISTS
// ===========================================

/** Total fish count */
export const TOTAL_FISH_COUNT = ALL_FISH.length;

/** Fish currently in season (High activity) - for Home page "In Season Now" */
export const IN_SEASON_FISH = ALL_FISH.filter((f) => f.activity === "High");

/** Common fish in area (subset for Home page) - shows variety of activities */
export const COMMON_AREA_FISH = ALL_FISH.filter((f) => 
  f.rarity === "Common" || f.rarity === "Uncommon"
).slice(0, 12);

/** All fish for Collection (Fish Index page) */
export const COLLECTION_FISH = ALL_FISH;

/** Fish sorted by activity level */
export const FISH_BY_ACTIVITY = {
  high: ALL_FISH.filter((f) => f.activity === "High"),
  medium: ALL_FISH.filter((f) => f.activity === "Medium"),
  low: ALL_FISH.filter((f) => f.activity === "Low"),
};

/** Fish sorted by rarity */
export const FISH_BY_RARITY = {
  common: ALL_FISH.filter((f) => f.rarity === "Common"),
  uncommon: ALL_FISH.filter((f) => f.rarity === "Uncommon"),
  rare: ALL_FISH.filter((f) => f.rarity === "Rare"),
  epic: ALL_FISH.filter((f) => f.rarity === "Epic"),
  legendary: ALL_FISH.filter((f) => f.rarity === "Legendary"),
};

/** Fish sorted by difficulty */
export const FISH_BY_DIFFICULTY = {
  beginner: ALL_FISH.filter((f) => f.difficulty === "beginner"),
  intermediate: ALL_FISH.filter((f) => f.difficulty === "intermediate"),
  advanced: ALL_FISH.filter((f) => f.difficulty === "advanced"),
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

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

/** Slugify a fish name for matching */
export const slugifyFishName = (name: string): string => 
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

/** Find fish by slug or name (flexible matching) */
export const findFish = (query: string): FishData | undefined => {
  const slug = slugifyFishName(query);
  return ALL_FISH.find((f) => 
    f.id === slug || 
    f.id === query ||
    f.name.toLowerCase() === query.toLowerCase() ||
    slugifyFishName(f.name) === slug
  );
};

// ===========================================
// COLORS & STYLING
// ===========================================

export const ACTIVITY_COLORS: { [key: string]: string } = {
  High: "#22c55e",   // Green
  Medium: "#eab308", // Yellow
  Low: "#ef4444",    // Red
};

export const RARITY_COLORS: { [key: string]: string } = {
  Common: "#6b7280",     // Gray
  Uncommon: "#22c55e",   // Green
  Rare: "#3b82f6",       // Blue
  Epic: "#a855f7",       // Purple
  Legendary: "#f97316",  // Orange
};

export const RARITY_BG_COLORS: { [key: string]: string } = {
  Common: "#f3f4f6",
  Uncommon: "#f0fdf4",
  Rare: "#eff6ff",
  Epic: "#faf5ff",
  Legendary: "#fff7ed",
};

export const getActivityColor = (activity: string): string => {
  return ACTIVITY_COLORS[activity] || "#6b7280";
};

export const getRarityColor = (rarity: string): string => {
  return RARITY_COLORS[rarity] || "#6b7280";
};

export const getRarityBgColor = (rarity: string): string => {
  return RARITY_BG_COLORS[rarity] || "#f3f4f6";
};
