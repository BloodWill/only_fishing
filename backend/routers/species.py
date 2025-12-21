# backend/routers/species.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db
from backend import models, schemas
from backend.auth import AuthenticatedUser, get_current_user

router = APIRouter(prefix="/species", tags=["species"])

# =================================================================
# 🐟 官方鱼种白名单 (Official Species Whitelist)
# =================================================================
# 这是唯一的真理来源。
# 如需添加新鱼种，请在此列表末尾追加，然后调用 /seed 接口。
# =================================================================

FULL_FISH_DATA = [
    # ============ COMMON FISH (9) ============
    {
        "common_name": "Bluegill",
        "rarity": "Common",
        "points": 10,
        "icon_path": "🐟",
        "activity": "High",
        "description": "Perfect fish for beginners. Abundant, easy to catch, and great for teaching kids to fish.",
        "habitat": "Shallow, weedy areas of lakes and ponds",
        "best_time": "Midday, warm afternoons",
        "avg_size": "6-8 inches",
        "bait": "Worms, crickets, small flies, bread",
        "difficulty": "beginner"
    },
    {
        "common_name": "Crappie",
        "rarity": "Common",
        "points": 10,
        "icon_path": "🐠",
        "activity": "High",
        "description": "Excellent table fare and fun to catch. Both black and white crappie are popular targets.",
        "habitat": "Lakes, reservoirs, slow rivers near structure",
        "best_time": "Spring spawn, early morning",
        "avg_size": "8-12 inches",
        "bait": "Small jigs, minnows, tube baits",
        "difficulty": "beginner"
    },
    {
        "common_name": "Yellow Perch",
        "rarity": "Common",
        "points": 10,
        "icon_path": "🐡",
        "activity": "High",
        "description": "Popular panfish prized for their excellent taste. Often found in schools, making for fast action.",
        "habitat": "Lakes, ponds, slow rivers",
        "best_time": "Morning, midday",
        "avg_size": "6-10 inches",
        "bait": "Minnows, worms, small jigs",
        "difficulty": "beginner"
    },
    {
        "common_name": "White Perch",
        "rarity": "Common",
        "points": 10,
        "icon_path": "🐟",
        "activity": "Medium",
        "description": "Schooling fish that are abundant in coastal waters. Good fighters for their size.",
        "habitat": "Brackish estuaries, coastal ponds, rivers",
        "best_time": "Early morning, evening",
        "avg_size": "8-10 inches",
        "bait": "Worms, small minnows, grass shrimp",
        "difficulty": "beginner"
    },
    {
        "common_name": "Scup",
        "rarity": "Common",
        "points": 10,
        "icon_path": "🐠",
        "activity": "Medium",
        "description": "Also known as porgy. Popular saltwater panfish found along the Atlantic coast.",
        "habitat": "Coastal waters, rocky bottoms, piers",
        "best_time": "Summer months, midday",
        "avg_size": "8-12 inches",
        "bait": "Squid, clams, worms",
        "difficulty": "beginner"
    },
    {
        "common_name": "Mackerel",
        "rarity": "Common",
        "points": 10,
        "icon_path": "🐟",
        "activity": "High",
        "description": "Fast-swimming schooling fish. Great for beginners and excellent as bait for larger species.",
        "habitat": "Open ocean, coastal waters",
        "best_time": "Morning, when schools are near surface",
        "avg_size": "12-16 inches",
        "bait": "Small jigs, feathers, cut bait",
        "difficulty": "beginner"
    },
    {
        "common_name": "Whiting",
        "rarity": "Common",
        "points": 10,
        "icon_path": "🐠",
        "activity": "Medium",
        "description": "Bottom-dwelling fish popular for surf fishing. Often caught in good numbers.",
        "habitat": "Sandy beaches, surf zone, coastal waters",
        "best_time": "Fall, winter months",
        "avg_size": "10-14 inches",
        "bait": "Bloodworms, clams, cut bait",
        "difficulty": "beginner"
    },
    {
        "common_name": "Flounder",
        "rarity": "Common",
        "points": 10,
        "icon_path": "🐟",
        "activity": "Medium",
        "description": "Flatfish that lies camouflaged on the bottom. Prized for excellent meat.",
        "habitat": "Sandy and muddy bottoms, estuaries, bays",
        "best_time": "Incoming tide, early morning",
        "avg_size": "14-18 inches",
        "bait": "Minnows, squid strips, bucktails",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Carp",
        "rarity": "Common",
        "points": 10,
        "icon_path": "🐟",
        "activity": "High",
        "description": "Strong fighters that can grow very large. Increasingly popular among sport anglers.",
        "habitat": "Warm, slow-moving waters, lakes, ponds",
        "best_time": "Afternoon, warm days",
        "avg_size": "10-25 inches",
        "bait": "Corn, bread, boilies, dough balls",
        "difficulty": "intermediate"
    },

    # ============ UNCOMMON FISH (10) ============
    {
        "common_name": "Largemouth Bass",
        "rarity": "Uncommon",
        "points": 25,
        "icon_path": "🐟",
        "activity": "High",
        "sci_name": "Micropterus salmoides",
        "description": "One of the most popular freshwater game fish in North America. Known for aggressive strikes.",
        "habitat": "Lakes, ponds, reservoirs, slow-moving rivers",
        "best_time": "Early morning, late evening",
        "avg_size": "12-18 inches",
        "bait": "Plastic worms, crankbaits, spinnerbaits",
        "difficulty": "beginner"
    },
    {
        "common_name": "Smallmouth Bass",
        "rarity": "Uncommon",
        "points": 25,
        "icon_path": "🐟",
        "activity": "Medium",
        "sci_name": "Micropterus dolomieu",
        "description": "Pound for pound, one of the hardest fighting freshwater fish. Found in clear, rocky waters.",
        "habitat": "Clear streams, rivers, rocky lakes",
        "best_time": "Morning, evening",
        "avg_size": "12-16 inches",
        "bait": "Crayfish, tube baits, topwater lures",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Rainbow Trout",
        "rarity": "Uncommon",
        "points": 25,
        "icon_path": "🎣",
        "activity": "Medium",
        "sci_name": "Oncorhynchus mykiss",
        "description": "Beautiful, colorful fish found in cold, clear waters. Known for acrobatic jumps when hooked.",
        "habitat": "Cold streams, rivers, mountain lakes",
        "best_time": "Morning, evening, overcast days",
        "avg_size": "10-14 inches",
        "bait": "Flies, spinners, PowerBait, worms",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Brown Trout",
        "rarity": "Uncommon",
        "points": 25,
        "icon_path": "🐟",
        "activity": "Medium",
        "description": "Wary and challenging to catch. Prized by fly fishermen for their selective feeding habits.",
        "habitat": "Cold streams, rivers, deep lakes",
        "best_time": "Evening, night, overcast days",
        "avg_size": "12-18 inches",
        "bait": "Flies, streamers, minnows, worms",
        "difficulty": "advanced"
    },
    {
        "common_name": "Channel Catfish",
        "rarity": "Uncommon",
        "points": 25,
        "icon_path": "🐠",
        "activity": "High",
        "description": "Bottom-dwelling fish with distinctive whiskers. Excellent sense of smell makes them easy to target.",
        "habitat": "Rivers, lakes, ponds, reservoirs",
        "best_time": "Night, overcast days",
        "avg_size": "15-24 inches",
        "bait": "Chicken liver, stink bait, nightcrawlers",
        "difficulty": "beginner"
    },
    {
        "common_name": "Chain Pickerel",
        "rarity": "Uncommon",
        "points": 25,
        "icon_path": "🐟",
        "activity": "Medium",
        "description": "Aggressive predator with chain-like markings. Smaller cousin of the northern pike.",
        "habitat": "Weedy ponds, lakes, slow streams",
        "best_time": "Morning, afternoon",
        "avg_size": "15-20 inches",
        "bait": "Minnows, spinnerbaits, spoons",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Black Sea Bass",
        "rarity": "Uncommon",
        "points": 25,
        "icon_path": "🐠",
        "activity": "Medium",
        "description": "Popular bottom fish found around structure. Aggressive feeders with excellent meat.",
        "habitat": "Rocky reefs, wrecks, jetties",
        "best_time": "Slack tide, midday",
        "avg_size": "12-16 inches",
        "bait": "Squid, clams, crabs, cut bait",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Fluke",
        "rarity": "Uncommon",
        "points": 25,
        "icon_path": "🐟",
        "activity": "Medium",
        "description": "Also called summer flounder. Active predator that chases baitfish unlike other flatfish.",
        "habitat": "Sandy bottoms, channels, inlets",
        "best_time": "Moving tide, morning",
        "avg_size": "16-22 inches",
        "bait": "Live minnows, bucktails, strip baits",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Hake",
        "rarity": "Uncommon",
        "points": 25,
        "icon_path": "🐠",
        "activity": "Low",
        "description": "Deep water bottom fish. Often caught while targeting other species.",
        "habitat": "Deep offshore waters, muddy bottoms",
        "best_time": "Night, deep water",
        "avg_size": "12-18 inches",
        "bait": "Cut bait, squid, clams",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Tautog",
        "rarity": "Uncommon",
        "points": 25,
        "icon_path": "🐟",
        "activity": "Low",
        "description": "Also known as blackfish. Structure-oriented fish with powerful jaws for crushing shellfish.",
        "habitat": "Rocky reefs, wrecks, jetties, mussel beds",
        "best_time": "Fall, early winter, slack tide",
        "avg_size": "14-18 inches",
        "bait": "Green crabs, Asian crabs, clams",
        "difficulty": "advanced"
    },

    # ============ RARE FISH (8) ============
    {
        "common_name": "Striped Bass",
        "rarity": "Rare",
        "points": 50,
        "icon_path": "🐠",
        "activity": "High",
        "description": "Powerful swimmers that put up incredible fights. Icon of East Coast fishing.",
        "habitat": "Coastal waters, estuaries, large reservoirs",
        "best_time": "Tide changes, dawn, dusk",
        "avg_size": "18-30 inches",
        "bait": "Live bait, topwater plugs, swimbaits",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Lake Trout",
        "rarity": "Rare",
        "points": 50,
        "icon_path": "🐟",
        "activity": "Low",
        "description": "Deep-water char found in cold northern lakes. Can live for decades and grow very large.",
        "habitat": "Deep, cold lakes",
        "best_time": "Early morning, fall, through ice",
        "avg_size": "18-28 inches",
        "bait": "Spoons, tube jigs, live bait",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Northern Pike",
        "rarity": "Rare",
        "points": 50,
        "icon_path": "🦈",
        "activity": "Low",
        "sci_name": "Esox lucius",
        "description": "Aggressive predator with razor-sharp teeth. Ambush hunters that strike with incredible speed.",
        "habitat": "Weedy lakes, slow rivers, bays",
        "best_time": "Fall, early spring, overcast days",
        "avg_size": "24-36 inches",
        "bait": "Large spoons, spinnerbaits, live suckers",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Landlocked Salmon",
        "rarity": "Rare",
        "points": 50,
        "icon_path": "🐟",
        "activity": "Low",
        "description": "Freshwater form of Atlantic salmon. Acrobatic fighters prized by anglers.",
        "habitat": "Deep, cold lakes with tributary streams",
        "best_time": "Spring, fall, ice-out",
        "avg_size": "16-22 inches",
        "bait": "Streamers, spoons, live smelt",
        "difficulty": "advanced"
    },
    {
        "common_name": "Bluefish",
        "rarity": "Rare",
        "points": 50,
        "icon_path": "🐟",
        "activity": "High",
        "description": "Aggressive predators known for feeding frenzies. Sharp teeth require wire leaders.",
        "habitat": "Coastal waters, surf, inlets",
        "best_time": "Summer, fall, feeding blitzes",
        "avg_size": "18-26 inches",
        "bait": "Metal lures, topwater plugs, cut bait",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Atlantic Cod",
        "rarity": "Rare",
        "points": 50,
        "icon_path": "🐟",
        "activity": "Low",
        "description": "Historic species that shaped New England fishing. Now carefully managed.",
        "habitat": "Deep, cold offshore waters, wrecks",
        "best_time": "Winter, spring",
        "avg_size": "20-30 inches",
        "bait": "Jigs, clams, cut bait",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Haddock",
        "rarity": "Rare",
        "points": 50,
        "icon_path": "🐠",
        "activity": "Low",
        "description": "Cousin of cod with distinctive black lateral line. Popular commercial and recreational species.",
        "habitat": "Deep, cold offshore waters",
        "best_time": "Spring, summer",
        "avg_size": "18-24 inches",
        "bait": "Clams, jigs, cut bait",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Cusk",
        "rarity": "Rare",
        "points": 50,
        "icon_path": "🐟",
        "activity": "Low",
        "description": "Deep-water species related to cod. Solitary bottom dweller found around structure.",
        "habitat": "Deep rocky bottoms, offshore",
        "best_time": "Year-round, deep water",
        "avg_size": "18-26 inches",
        "bait": "Clams, cut bait, jigs",
        "difficulty": "advanced"
    },

    # ============ EPIC FISH (2) ============
    {
        "common_name": "Redfish",
        "rarity": "Epic",
        "points": 100,
        "icon_path": "🐠",
        "activity": "Medium",
        "description": "Also known as red drum. Powerful fighters popular in southern waters.",
        "habitat": "Coastal marshes, flats, jetties",
        "best_time": "Fall, incoming tide",
        "avg_size": "22-30 inches",
        "bait": "Live shrimp, cut mullet, gold spoons",
        "difficulty": "intermediate"
    },
    {
        "common_name": "Walleye",
        "rarity": "Epic",
        "points": 100,
        "icon_path": "🐠",
        "activity": "Medium",
        "sci_name": "Sander vitreus",
        "description": "Prized game fish known for excellent taste. Their eyes are adapted for low-light feeding.",
        "habitat": "Large lakes, rivers with rocky bottoms",
        "best_time": "Dusk, dawn, night",
        "avg_size": "15-20 inches",
        "bait": "Nightcrawlers, leeches, minnows, jigs",
        "difficulty": "intermediate"
    },

    # ============ LEGENDARY FISH (1) ============
    {
        "common_name": "Bluefin Tuna",
        "rarity": "Legendary",
        "points": 200,
        "icon_path": "🐟",
        "activity": "Low",
        "description": "The ultimate prize for offshore anglers. Can exceed 1000 lbs and fetch record prices.",
        "habitat": "Deep offshore waters, canyons",
        "best_time": "Summer, fall, when bait is present",
        "avg_size": "40-80 inches",
        "bait": "Live bait, trolling lures, chunking",
        "difficulty": "advanced"
    }
]

# =================================================================
# 🚀 API Endpoints
# =================================================================

@router.get("/", response_model=List[schemas.SpeciesRead])
def list_species(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search species by name"),
    limit: int = 500,
):
    """
    Get all species in the whitelist. 
    This is what the frontend uses to populate the 'Fish Index'.
    """
    query = db.query(models.Species)
    if q:
        query = query.filter(models.Species.common_name.ilike(f"%{q}%"))
    return query.order_by(models.Species.common_name.asc()).limit(limit).all()


@router.get("/my-collection", response_model=schemas.UserCollectionRead)
def get_my_collection(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get the authenticated user's collection status.
    Combines the whitelist with user's catch records.
    """
    return get_user_collection_logic(user.id, db)


def get_user_collection_logic(user_id: str, db: Session):
    # 1. 获取所有白名单鱼种
    all_species = db.query(models.Species).order_by(models.Species.common_name.asc()).all()
    
    # 2. 获取用户已捕获的记录 (UserSpecies 关联表)
    rows = db.query(models.UserSpecies).filter(models.UserSpecies.user_id == user_id).all()
    caught_map = {r.species_id: r.first_catch_at for r in rows}

    entries = []
    caught_count = 0
    for sp in all_species:
        is_caught = sp.id in caught_map
        if is_caught:
            caught_count += 1
        
        entries.append(schemas.CollectionEntry(
            id=sp.id,
            common_name=sp.common_name,
            sci_name=sp.sci_name,
            icon_path=sp.icon_path,
            caught=is_caught,
            first_catch_at=caught_map.get(sp.id),
        ))

    return schemas.UserCollectionRead(
        user_id=user_id,
        total=len(all_species),
        caught=caught_count,
        species=entries,
    )


@router.post("/seed", response_model=List[schemas.SpeciesRead])
def seed_species(db: Session = Depends(get_db)):
    """
    📢 OFFICIAL SYNC ENDPOINT
    -------------------------
    Syncs the database with the FULL_FISH_DATA whitelist above.
    
    - If a fish doesn't exist in DB: Create it.
    - If a fish exists: Update its details (rarity, points, etc.) to match the whitelist.
    - Idempotent: Can be called multiple times safely.
    """
    out = []
    for sp_data in FULL_FISH_DATA:
        # Case-insensitive lookup
        obj = db.query(models.Species).filter(models.Species.common_name.ilike(sp_data["common_name"])).first()
        
        if not obj:
            # Create new
            obj = models.Species(**sp_data)
            db.add(obj)
        else:
            # Update existing (ensures DB stays in sync with code)
            for key, value in sp_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
        
        db.flush()
        out.append(obj)
        
    db.commit()
    return out