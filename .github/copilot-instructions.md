# OSHIT Data Visualization - AI Coding Guidelines

## 🏗️ Architecture Overview

**Full-stack data visualization platform** with Python FastAPI backend and React/TypeScript frontend. Backend serves calculated metrics from Google Sheets data, frontend renders interactive ECharts visualizations.

**Key Components:**
- `backend/`: FastAPI server with pandas calculations from Google Sheets
- `shadcn-frontend/`: React/TypeScript dashboard with shadcn/ui + ECharts
- `frontend/`: Legacy Ant Design version (being migrated to shadcn)

## 📊 Data Flow Patterns

### Backend Data Pipeline
```python
# 1. Load from Google Sheets to pandas DataFrames
df_ts = data_cache.data.get('TS_Log')

# 2. Apply date boundaries (varies by section)
ts_start = pd.to_datetime(request.start_date).replace(hour=8, minute=0)  # TS uses 8am
pos_start = pd.to_datetime(request.start_date).replace(hour=12, minute=0)  # POS uses 12pm

# 3. Calculate metrics with Current/Previous/Delta pattern
result = {
    'metrics': {
        'totalStakeCurrent': current_value,
        'totalStakePrev': prev_value,
        'totalStakeDelta': delta_percentage
    }
}
```

### Frontend Data Fetching
```typescript
// Always call loadData first, then calculate endpoints
await loadData(false);  // Initialize cache
const data = await fetchStakingData(startDate, endDate);
```

## 🎨 Component Patterns

### Statistics Page Structure
```tsx
// All statistics pages follow this pattern:
export default function SectionPage() {
  // 1. Data interfaces matching backend Pydantic models
  interface SectionMetrics { current: number; prev: number; delta: number; }
  interface SectionData { metrics: SectionMetrics; dailyData: []; topUsers?: []; }

  // 2. State management with loading/error states
  const [data, setData] = useState<SectionData | null>(null);

  // 3. Consistent layout: metrics grid + tabbed charts
  return (
    <div>
      <SectionToolbar onDateChange={handleDateChange} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">  {/* Metrics */}
      <Tabs>  {/* Charts */}
    </div>
  );
}
```

### Chart Component Usage
```tsx
// ECharts components with consistent theme system
<BarLineChart
  data={dailyData}
  barAxis={{ dataKey: "buyUsdt", name: "Buy Volume" }}
  lineAxis={{ dataKey: "sellUsdt", name: "Sell Volume" }}
  height={380}
/>
```

## 📅 Date Boundary Conventions

**Critical: Different sections use different day boundaries**

| Section | Boundary | Example |
|---------|----------|---------|
| TS | 8:00 AM | Trading day starts at 8am |
| POS | 12:00 PM | POS day starts at noon |
| Staking | 00:00 AM | Standard midnight |
| ShitCode | 00:00 AM | Standard midnight |
| Revenue | Per-source | TS=8am, POS=12pm, others=00:00 |
| DeFi | 00:00 AM | Standard midnight |

## 🔗 API Integration Patterns

### Backend Response Structure
```python
# All calculate endpoints return consistent structure
{
    "metrics": { "fieldCurrent": float, "fieldPrev": float, "fieldDelta": float },
    "dailyData": [{ "date": "2025-12-01", "value": 123.45 }],
    "topUsers": [{ "address": "0x...", "amount": 1000 }],
    "composition": [{ "source": "TS", "amount": 500 }]  # Revenue only
}
```

### Frontend Type Safety
```typescript
// Interfaces mirror backend Pydantic models exactly
interface StakingMetrics {
  totalStakeCurrent: number | null;
  totalStakePrev: number | null;
  totalStakeDelta: number | null;
  // ... all fields nullable for error states
}
```

## 🎨 UI/UX Conventions

### Theme System
```typescript
// Charts automatically adapt to dark/light mode
const theme = getEchartsTheme(isDark);
<ECharts option={{ ...chartConfig, ...theme }} />
```

### Layout Grid
```tsx
// Responsive metric cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards auto-adjust: 1 col mobile, 2 tablet, 3 desktop */}
</div>
```

### Error Handling
```tsx
// Specific error codes guide user actions
if (response.status === 412) {
  throw new Error("412: 需要先调用 loadData()");
}
```

## 🚀 Development Workflow

### Backend Development
```bash
cd backend
./start_local.sh  # Auto-reloads on changes
# API docs at http://localhost:8000/docs
```

### Frontend Development
```bash
cd shadcn-frontend
npm run dev  # Vite dev server with HMR
# App runs at http://localhost:5173
```

### Data Refresh Pattern
```typescript
// User clicks refresh button
await loadData(true);  // force_refresh=true
await fetchData(startDate, endDate);  // Re-fetch calculations
```

## 📝 Code Style Guidelines

### Naming Conventions
- **Backend**: snake_case (Python standard)
- **Frontend**: camelCase (TypeScript/React standard)
- **API fields**: Match backend Pydantic model names exactly

### Import Organization
```typescript
// Group by: React, UI components, custom components, services, utils
import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { StatisticCard } from "@/components/StatisticCard";
import { fetchStakingData } from "@/services/dataService";
```

### Error Boundaries
```tsx
// Always handle null/undefined data gracefully
{data?.metrics?.totalStakeCurrent?.toFixed(2) ?? 'N/A'}
{(data?.topUsers ?? []).map(user => ...)}
```

## 🔧 Common Pitfalls

### Data Loading Sequence
❌ **Wrong**: Call calculate endpoints before loadData
```typescript
await fetchStakingData();  // 412 error
```

✅ **Correct**: Always initialize cache first
```typescript
await loadData(false);
await fetchStakingData();
```

### Date Boundary Mistakes
❌ **Wrong**: Use 00:00 for TS calculations
```typescript
// TS trading day starts at 8am, not midnight
```

✅ **Correct**: Check section-specific boundaries
```typescript
// TS: 8am, POS: 12pm, others: 00:00
```

### Chart Data Keys
❌ **Wrong**: Assume frontend field names match backend
```tsx
// Backend: "source", "amount" → Frontend: "name", "value"
```

✅ **Correct**: Use data transformation or adjust chart props
```tsx
<StyledPieChart nameKey="source" valueKey="amount" />
```

## 📚 Key Reference Files

- `backend/routes/schemas.py` - All Pydantic data models
- `backend/routes/calculate.py` - API endpoints and date boundary logic
- `shadcn-frontend/src/services/dataService.ts` - Frontend API integration
- `shadcn-frontend/src/components/charts/utils.ts` - ECharts theme system
- `shadcn-frontend/src/pages/Statistics/Staking.tsx` - Statistics page template</content>
<parameter name="filePath">/Users/fupenglin/Desktop/Oshit/Official_Job/OSHIT_Data_Vis/.github/copilot-instructions.md