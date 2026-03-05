// src/store/eventTreeStore.ts

import { create } from 'zustand';
import { EventNode, GraphEdge, LocationType, Persona } from '../types/event';
import { loadEventData, filterNodes, getEventStatistics } from '../utils/dataProcessing';

export interface DailyEvent {
  event_id: string;
  name: string;
  date: string[];
  type: string;
  description: string;
  participant: { name: string; relation: string }[];
  location: string;
  atomic_id: string[];
}

export interface FilterState {
  timeRange: {
    start: string;
    end: string;
    enabled: boolean;
  };
  categories: string[];
  participants: string[];
  locationTypes: LocationType[];
  hierarchyLevels: number[];
  searchQuery: string;
}

export interface ViewState {
  expandedNodes: Set<string>;
  selectedNode: string | null;
  highlightedNodes: Set<string>;
  zoomLevel: number;
  viewMode: 'tree' | 'network' | 'timeline';
  showLabels: boolean;
  showEdges: boolean;
}

interface EventTreeState {
  // Data
  nodes: Map<string, EventNode>;
  edges: GraphEdge[];
  rootIds: string[];
  isLoading: boolean;
  error: string | null;
  
  // Filters & View
  filters: FilterState;
  view: ViewState;
  
  // Computed
  visibleNodes: EventNode[];
  visibleEdges: GraphEdge[];
  statistics: ReturnType<typeof getEventStatistics> | null;
  
  // Available options for filters
  availableCategories: string[];
  availableParticipants: string[];
  availableLocationTypes: LocationType[];

  // Persona data
  persona: Persona | null;

  // Daily events and atomic index
  dailyEvents: DailyEvent[];
  atomicEventMap: Map<string, { event_id: string; name: string; parentId?: string }>;
  
  // Actions
  actions: {
    loadData: (url: string) => Promise<void>;
    loadDailyEvents: () => Promise<void>;
    buildAtomicEventMap: () => void;
    toggleNode: (nodeId: string) => void;
    expandAll: () => void;
    collapseAll: () => void;
    expandToLevel: (level: number) => void;
    setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
    resetFilters: () => void;
    selectNode: (nodeId: string | null) => void;
    setZoomLevel: (level: number) => void;
    setViewMode: (mode: ViewState['viewMode']) => void;
    toggleLabels: () => void;
    toggleEdges: () => void;
    computeVisibleNodes: () => void;
  };
}

const DEFAULT_FILTERS: FilterState = {
  timeRange: {
    start: '2025-01-01',
    end: '2025-03-31',
    enabled: false
  },
  categories: [],
  participants: [],
  locationTypes: [],
  hierarchyLevels: [0, 1, 2, 3],  // Include all levels by default
  searchQuery: ''
};

const DEFAULT_VIEW: ViewState = {
  expandedNodes: new Set(),
  selectedNode: null,
  highlightedNodes: new Set(),
  zoomLevel: 1,
  viewMode: 'tree',
  showLabels: true,
  showEdges: true
};

export const useEventTreeStore = create<EventTreeState>((set, get) => ({
  // Initial state
  nodes: new Map(),
  edges: [],
  rootIds: [],
  isLoading: false,
  error: null,
  
  filters: DEFAULT_FILTERS,
  view: DEFAULT_VIEW,
  
  visibleNodes: [],
  visibleEdges: [],
  statistics: null,
  
  availableCategories: [],
  availableParticipants: [],
  availableLocationTypes: [],

  persona: null,

  dailyEvents: [],
  atomicEventMap: new Map(),
  
  actions: {
    loadData: async (url: string) => {
      set({ isLoading: true, error: null });

      try {
        const { nodes, edges, rootIds } = await loadEventData(url);

        // Load persona data
        let persona: Persona | null = null;
        let personaRootId: string | null = null;

        try {
          const personaResponse = await fetch('/data/persona.json');
          if (personaResponse.ok) {
            persona = await personaResponse.json();
            personaRootId = 'persona-root';
          }
        } catch (e) {
          console.warn('Persona file not found or invalid, continuing without persona data');
        }

        // Compute available filter options - only keep specified categories
        const ALLOWED_CATEGORIES = [
          'Career',
          'Education',
          'Family&Living Situation',
          'Finance',
          'Health',
          'Personal Life',
          'Relationships',
          'Persona'  // Include Persona category
        ];

        const categories = Array.from(new Set(
          Array.from(nodes.values()).map(n => n.type)
        ))
          .filter(cat => ALLOWED_CATEGORIES.includes(cat))
          .sort();

        const participants = Array.from(new Set(
          Array.from(nodes.values()).flatMap(n => n.participant.map(p => p.name))
        )).sort();

        const locationTypes = Array.from(new Set(
          Array.from(nodes.values()).map(n => n.locationType)
        )) as LocationType[];

        // Get statistics
        const stats = getEventStatistics(nodes);

        // Auto-expand first level
        const expandedNodes = new Set<string>();
        for (const node of nodes.values()) {
          if (node.depth === 0 && node.subevent && node.subevent.length > 0) {
            expandedNodes.add(String(node.event_id));
          }
        }

        // If persona exists, create a root node for the person
        if (persona && personaRootId) {
          // Create subevent references for all root events
          const rootSubevents = rootIds.map(id => {
            const rootNode = nodes.get(id);
            return {
              event_id: String(id),
              name: rootNode?.name || 'Event',
              date: rootNode?.date || [''],
              type: rootNode?.type || 'Unknown',
              description: rootNode?.description || '',
              participant: rootNode?.participant || [],
              location: rootNode?.location || '',
              decompose: rootNode?.decompose || 0 as const
            };
          });

          const personaNode: EventNode = {
            event_id: personaRootId,
            name: persona.name,
            description: persona.description,
            date: [persona.birth],
            type: 'Persona',
            participant: [{ name: persona.name, relation: '自己' }],
            location: `${persona.home_address.province}${persona.home_address.city}${persona.home_address.district}`,
            decompose: 1,
            depth: 0,
            subevent: rootSubevents,
            subeventCount: rootIds.length,
            participantCount: 1,
            duration: 0,
            startDate: new Date(persona.birth),
            endDate: new Date(),
            locationType: 'home' as LocationType,
            category: 'Persona',
            parentId: undefined
          };

          nodes.set(personaRootId, personaNode);

          // Update parent references for all root events
          rootIds.forEach(id => {
            const rootNode = nodes.get(id);
            if (rootNode) {
              rootNode.parentId = personaRootId;
              rootNode.depth = 1; // Change root events from depth 0 to 1
              nodes.set(id, rootNode);
            }
          });
        }

        set({
          nodes,
          edges,
          rootIds: personaRootId ? [personaRootId] : rootIds,
          availableCategories: categories,
          availableParticipants: participants,
          availableLocationTypes: locationTypes,
          statistics: stats,
          persona,
          view: { ...DEFAULT_VIEW, expandedNodes: personaRootId ? new Set([personaRootId]) : expandedNodes },
          isLoading: false
        });

        // Load daily events and build atomic index
        get().actions.loadDailyEvents();
        get().actions.buildAtomicEventMap();
        get().actions.computeVisibleNodes();
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load data',
          isLoading: false
        });
      }
    },

    loadDailyEvents: async () => {
      try {
        const response = await fetch('/data/daily_event_3months.json');
        if (response.ok) {
          const dailyEvents = await response.json();
          set({ dailyEvents });
        }
      } catch (error) {
        console.error('Failed to load daily events:', error);
      }
    },

    buildAtomicEventMap: () => {
      const { nodes } = get();
      const atomicEventMap = new Map();

      // Build index of all atomic events (sub-events) for linking
      nodes.forEach(node => {
        // Index sub-events
        if (node.subevent) {
          node.subevent.forEach(sub => {
            atomicEventMap.set(String(sub.event_id), {
              event_id: String(sub.event_id),
              name: sub.name,
              parentId: String(node.event_id)
            });
          });
        }
      });

      set({ atomicEventMap });
    },
    
    toggleNode: (nodeId: string) => {
      const { expandedNodes } = get().view;
      const newExpanded = new Set(expandedNodes);
      
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      
      set(state => ({
        view: { ...state.view, expandedNodes: newExpanded }
      }));
      
      get().actions.computeVisibleNodes();
    },
    
    expandAll: () => {
      const { nodes } = get();
      const allParentIds = Array.from(nodes.values())
        .filter(n => n.decompose === 1 && n.subevent && n.subevent.length > 0)
        .map(n => String(n.event_id));
      
      set(state => ({
        view: { ...state.view, expandedNodes: new Set(allParentIds) }
      }));
      
      get().actions.computeVisibleNodes();
    },
    
    collapseAll: () => {
      set(state => ({
        view: { ...state.view, expandedNodes: new Set() }
      }));
      
      get().actions.computeVisibleNodes();
    },
    
    expandToLevel: (level: number) => {
      const { nodes } = get();
      const expandedNodes = new Set<string>();
      
      for (const node of nodes.values()) {
        if (node.depth < level && node.decompose === 1) {
          expandedNodes.add(String(node.event_id));
        }
      }
      
      set(state => ({
        view: { ...state.view, expandedNodes }
      }));
      
      get().actions.computeVisibleNodes();
    },
    
    setFilter: (key, value) => {
      set(state => ({
        filters: { ...state.filters, [key]: value }
      }));
      
      // Debounced compute
      setTimeout(() => {
        get().actions.computeVisibleNodes();
      }, 100);
    },
    
    resetFilters: () => {
      set({ filters: DEFAULT_FILTERS });
      get().actions.computeVisibleNodes();
    },
    
    selectNode: (nodeId: string | null) => {
      set(state => ({
        view: { ...state.view, selectedNode: nodeId }
      }));
    },
    
    setZoomLevel: (level: number) => {
      set(state => ({
        view: { ...state.view, zoomLevel: Math.max(0.5, Math.min(3, level)) }
      }));
    },
    
    setViewMode: (mode) => {
      set(state => ({
        view: { ...state.view, viewMode: mode }
      }));
    },
    
    toggleLabels: () => {
      set(state => ({
        view: { ...state.view, showLabels: !state.view.showLabels }
      }));
    },
    
    toggleEdges: () => {
      set(state => ({
        view: { ...state.view, showEdges: !state.view.showEdges }
      }));
    },
    
    computeVisibleNodes: () => {
      const { nodes, edges, filters, view } = get();

      const timeRange = filters.timeRange.enabled ? {
        start: new Date(filters.timeRange.start),
        end: new Date(filters.timeRange.end),
        enabled: true
      } : undefined;

      const { visibleNodes, visibleEdges } = filterNodes(
        nodes,
        edges,
        {
          timeRange,
          categories: filters.categories,
          participants: filters.participants,
          locationTypes: filters.locationTypes,
          hierarchyLevels: filters.hierarchyLevels,
          searchQuery: filters.searchQuery
        },
        view.expandedNodes
      );

      set({ visibleNodes, visibleEdges });
    }
  }
}));
