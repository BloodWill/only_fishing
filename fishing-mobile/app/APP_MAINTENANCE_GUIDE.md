# 📱 Mobile App Maintenance Best Practices

## A Professional Developer's Guide

---

## 1. 📁 Project Structure & Organization

### Current Improvement: Constants Separation

```
constants/
├── index.ts          # Barrel export (import from '@/constants')
├── fishData.ts       # Fish species, regulations
├── weather.ts        # Weather-related constants & utilities
├── theme.ts          # Colors, typography, spacing (future)
└── config.ts         # API keys, feature flags (future)
```

### Recommended Full Structure

```
app/                  # Expo Router pages
├── (tabs)/           # Tab-based navigation
├── (auth)/           # Auth screens (future)
└── (modals)/         # Modal screens

components/           # Reusable UI components
├── ui/               # Basic UI elements (Button, Card, Badge)
├── fish/             # Fish-related (FishCard, FishGrid, FishDetail)
├── weather/          # Weather components (WeatherCard, ConditionBadge)
└── common/           # Shared (Header, Modal, Empty states)

constants/            # Static data & configuration
├── fishData.ts       # ✅ Created
├── weather.ts        # ✅ Created
└── index.ts          # ✅ Created

hooks/                # Custom React hooks
├── useLocation.ts    # Location logic
├── useWeather.ts     # Weather fetching
└── useAuth.ts        # Authentication

lib/                  # Utilities & services
├── api.ts            # API client
├── storage.ts        # AsyncStorage helpers
├── sync.ts           # Data synchronization
└── user.ts           # User management

types/                # TypeScript types
├── fish.ts           # Fish-related types
├── weather.ts        # Weather types
├── api.ts            # API response types
└── index.ts          # Barrel export
```

---

## 2. 🔧 Code Maintenance Principles

### A. Single Responsibility Principle (SRP)

**Before (Bad):**
```typescript
// index.tsx - 1000+ lines with everything mixed
export default function Home() {
  // Fish data, weather logic, UI, API calls all in one file
}
```

**After (Good):**
```typescript
// index.tsx - Just orchestration
import { WeatherCard } from '@/components/weather';
import { FishSection } from '@/components/fish';
import { useWeather } from '@/hooks/useWeather';
import { ALL_FISH } from '@/constants';

export default function Home() {
  const weather = useWeather();
  return (
    <WeatherCard data={weather} />
    <FishSection fish={ALL_FISH} />
  );
}
```

### B. DRY (Don't Repeat Yourself)

**Before:**
```typescript
// Same color logic in 5 different files
const getColor = (activity) => activity === "High" ? "#22c55e" : ...
```

**After:**
```typescript
// constants/fishData.ts
export const getActivityColor = (activity: FishActivity) => ...

// Any file
import { getActivityColor } from '@/constants';
```

### C. Separation of Concerns

| Layer | Responsibility | Example |
|-------|----------------|---------|
| **Constants** | Static data | Fish species, regulations |
| **Types** | TypeScript definitions | FishData, WeatherData |
| **Hooks** | Stateful logic | useWeather(), useLocation() |
| **Components** | UI rendering | FishCard, WeatherCard |
| **Screens** | Page composition | Home, History |
| **Services** | API calls | fetchWeather(), uploadCatch() |

---

## 3. 📊 Data Management Best Practices

### A. Centralize Static Data

```typescript
// ✅ Good: Easy to find, update, and maintain
// constants/fishData.ts
export const ALL_FISH: FishData[] = [
  { id: "bass", name: "Largemouth Bass", ... },
  { id: "trout", name: "Rainbow Trout", ... },
];

// ❌ Bad: Scattered across components
const fishList = [{ id: "bass", ... }]; // in component A
const fishes = [{ id: "bass", ... }];   // duplicated in component B
```

### B. Type Everything

```typescript
// types/fish.ts
export type FishActivity = "High" | "Medium" | "Low";

export type FishData = {
  id: string;
  name: string;
  activity: FishActivity;  // Constrained, not just 'string'
  // ...
};

// Now TypeScript catches errors:
const fish: FishData = {
  activity: "Very High"  // ❌ Type error!
};
```

### C. Use Derived Data

```typescript
// ✅ Good: Single source of truth
export const ALL_FISH = [...];
export const IN_SEASON_FISH = ALL_FISH.filter(f => f.activity === "High");
export const getFishById = (id: string) => ALL_FISH.find(f => f.id === id);

// ❌ Bad: Multiple sources that can get out of sync
export const ALL_FISH = [...];
export const IN_SEASON_FISH = [...];  // Manually maintained separate list
```

---

## 4. 🔄 Update & Maintenance Workflow

### A. Adding a New Fish Species

1. **Edit one file:** `constants/fishData.ts`
2. **Add to ALL_FISH array:**
```typescript
{
  id: "muskie",
  name: "Muskellunge",
  activity: "Low",
  // ... rest of data
}
```
3. **Add regulation:** Add entry to `FISHING_REGULATIONS`
4. **Done!** Fish auto-appears in:
   - In Season section (if High activity)
   - Common Fish section
   - Search results
   - Species picker

### B. Version Control Commits

```bash
# Good commit messages
git commit -m "feat(fish): add Muskellunge species and regulations"
git commit -m "fix(weather): correct wind direction calculation"
git commit -m "refactor(constants): extract fish data to separate file"

# Follow conventional commits:
# feat: new feature
# fix: bug fix
# refactor: code restructuring
# docs: documentation
# style: formatting
# test: adding tests
```

### C. Code Review Checklist

- [ ] Types are properly defined
- [ ] No magic numbers/strings (use constants)
- [ ] Functions are small and focused
- [ ] Error handling is present
- [ ] No console.logs in production code
- [ ] Imports are organized
- [ ] Component is reasonably sized (<300 lines)

---

## 5. 📈 Scaling Considerations

### A. When to Split Components

| Symptom | Action |
|---------|--------|
| File > 300 lines | Split into smaller components |
| Component does 3+ things | Extract sub-components |
| Same code in 2+ places | Create shared component |
| Complex state logic | Extract to custom hook |

### B. Performance Optimization

```typescript
// ✅ Good: Memoize expensive computations
const filteredFish = useMemo(
  () => ALL_FISH.filter(f => f.name.includes(query)),
  [query]
);

// ✅ Good: Memoize callbacks
const handlePress = useCallback((fish) => {
  setSelectedFish(fish);
}, []);

// ✅ Good: Use FlatList for long lists
<FlatList
  data={fish}
  renderItem={({ item }) => <FishCard fish={item} />}
  keyExtractor={(item) => item.id}
/>

// ❌ Bad: map() in ScrollView for long lists
<ScrollView>
  {fish.map(f => <FishCard key={f.id} fish={f} />)}
</ScrollView>
```

### C. API & Data Caching

```typescript
// Consider implementing:
// 1. React Query or SWR for API caching
// 2. AsyncStorage for offline data
// 3. Optimistic updates for better UX

import { useQuery } from '@tanstack/react-query';

const { data: weather, isLoading } = useQuery({
  queryKey: ['weather', lat, lng],
  queryFn: () => fetchWeather(lat, lng),
  staleTime: 5 * 60 * 1000,  // Cache for 5 minutes
});
```

---

## 6. 🧪 Testing Strategy

### A. What to Test

| Priority | What | Why |
|----------|------|-----|
| **High** | Utility functions | Pure, easy to test |
| **High** | Data transformations | Critical for correctness |
| **Medium** | Custom hooks | Complex state logic |
| **Medium** | API services | Integration points |
| **Low** | UI components | Visual, harder to test |

### B. Example Tests

```typescript
// __tests__/constants/fishData.test.ts
import { getActivityColor, getFishById } from '@/constants/fishData';

describe('getActivityColor', () => {
  it('returns green for High activity', () => {
    expect(getActivityColor('High')).toBe('#22c55e');
  });
  
  it('returns gray for unknown activity', () => {
    expect(getActivityColor('Unknown')).toBe('#6b7280');
  });
});

describe('getFishById', () => {
  it('finds fish by id', () => {
    const fish = getFishById('bass');
    expect(fish?.name).toBe('Largemouth Bass');
  });
  
  it('returns undefined for invalid id', () => {
    expect(getFishById('invalid')).toBeUndefined();
  });
});
```

---

## 7. 📋 Maintenance Checklist

### Weekly
- [ ] Review and merge pending PRs
- [ ] Update dependencies (patch versions)
- [ ] Check crash reports / error logs
- [ ] Review user feedback

### Monthly
- [ ] Update dependencies (minor versions)
- [ ] Review and clean up TODO comments
- [ ] Audit and remove unused code
- [ ] Performance profiling
- [ ] Security audit

### Quarterly
- [ ] Major dependency updates
- [ ] Refactor technical debt
- [ ] Review and update documentation
- [ ] Evaluate new technologies/patterns

---

## 8. 🚀 Quick Wins for This Project

### Immediate (This Week)
1. ✅ Extract constants to separate files
2. Create `types/` folder with shared types
3. Add error boundaries for crash protection

### Short-term (This Month)
1. Extract `WeatherCard` to own component file
2. Extract `FishSection` to own component file
3. Create custom hooks: `useWeather`, `useLocation`
4. Add basic unit tests for utilities

### Long-term (This Quarter)
1. Implement React Query for API caching
2. Add comprehensive offline support
3. Implement proper error handling/reporting
4. Add analytics for user behavior

---

## Summary

The key principles for maintainable apps:

1. **Organize** - Clear folder structure, logical groupings
2. **Separate** - Constants, types, logic, UI in different places
3. **Centralize** - Single source of truth for data
4. **Type** - TypeScript catches bugs early
5. **Document** - Comments for "why", not "what"
6. **Test** - At least utility functions
7. **Review** - Regular code reviews and refactoring

**Remember:** The best code is code that's easy to change!
