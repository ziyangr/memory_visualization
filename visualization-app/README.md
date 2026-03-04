# Event Tree Knowledge Graph Visualization

An interactive knowledge graph visualization for exploring hierarchical event data with integrated attributes and time filtering.

## Features

### 🌳 Hierarchical Event Tree
- **Parent → Sub-event → Atomic** event structure visualization
- Expandable/collapsible nodes at any level
- Shape encoding: Circle (Parent), Rectangle (Sub-event), Triangle (Atomic)

### 🎨 Attribute Integration
- **Color-coded categories**: Career, Family, Personal Life, Relationships, Health, Education, Finance
- **Participant badges**: Show number of people involved
- **Location type indicators**: Home, Work, Public, Remote
- **Rich tooltips**: Full event details on hover

### ⏰ Time Filtering
- Date range slider with preset options (January, February, March, etc.)
- Animated transitions when filtering
- Automatic temporal clustering at different zoom levels

### 🔍 Attribute-Based Exploration
- Filter by category, participant, location type, hierarchy level
- Full-text search across events, people, and locations
- Active filter summary with quick removal

### 📋 Detail Panel
- Comprehensive event information
- Participant list with relations
- Sub-event hierarchy
- Navigation to parent/child events

## Project Structure

```
visualization-app/
├── src/
│   ├── components/
│   │   ├── HierarchicalTree.tsx    # Main tree visualization
│   │   ├── TimeFilter.tsx          # Time range filter
│   │   ├── AttributeFilter.tsx     # Category/participant filters
│   │   ├── DetailPanel.tsx         # Event detail sidebar
│   │   └── Header.tsx              # App header with controls
│   ├── store/
│   │   └── eventTreeStore.ts       # Zustand state management
│   ├── utils/
│   │   └── dataProcessing.ts       # Data loading and filtering
│   ├── types/
│   │   └── event.ts                # TypeScript interfaces
│   ├── styles/
│   │   └── App.css                 # Application styles
│   ├── App.tsx                     # Main app component
│   └── main.tsx                    # Entry point
├── public/
│   └── data/
│       └── event_tree_3months.json # Event data
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+

### Installation

```bash
cd visualization-app
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build

```bash
npm run build
```

Production files will be in the `dist/` folder.

## Usage Guide

### Navigation
- **Pan**: Click and drag on empty space
- **Zoom**: Use zoom controls (+/-) in toolbar
- **Expand/Collapse**: Click on parent nodes or use toolbar buttons

### Filtering
1. Use the **Time Filter** to select a date range
2. Use **Category Filter** to show/hide event types
3. Use **Hierarchy Level** to filter by depth
4. Use **Search** to find specific events, people, or locations

### Event Details
- Click any node to view details in the right panel
- Click participant names to filter by that person
- Click sub-events to navigate the hierarchy

## Data Format

The visualization expects `event_tree_3months.json` with this structure:

```json
[
  {
    "event_id": 173,
    "name": "Event Name",
    "description": "Detailed description",
    "date": ["2025-01-19 至 2025-01-19"],
    "type": "Category",
    "participant": [{"name": "Name", "relation": "Relation"}],
    "location": "Location string",
    "decompose": 1,
    "subevent": [...]
  }
]
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Zustand** - State management
- **D3.js** - Tree layout computation
- **date-fns** - Date formatting
- **Vite** - Build tool

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `+` / `-` | Zoom in/out |
| Click node | Select/Expand |
| Double-click | Focus on node |

## Screenshot

The visualization displays:
- **Left sidebar**: Time and attribute filters
- **Center**: Interactive hierarchical tree
- **Right sidebar**: Event details panel
- **Bottom**: Legend for shapes and colors

## License

MIT
