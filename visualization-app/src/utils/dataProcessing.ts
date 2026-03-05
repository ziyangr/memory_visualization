// src/utils/dataProcessing.ts

import { EventNode, GraphEdge } from '../types/event';

/**
 * Parse date string from format "2025-01-19 至 2025-01-19" or "2025-01-19"
 */
export function parseDateRange(dateStr: string): { start: Date; end: Date } {
  const parts = dateStr.split('至');
  const start = new Date(parts[0].trim());
  const end = parts[1] ? new Date(parts[1].trim()) : new Date(start);
  return { start, end };
}

/**
 * Determine location type from location string
 */
export function getLocationType(location: string): 'home' | 'work' | 'public' | 'remote' | 'unknown' {
  if (!location || location === '未知' || location === 'unknown') {
    return 'unknown';
  }
  
  const lowerLoc = location.toLowerCase();
  
  if (lowerLoc.includes('家') || lowerLoc.includes('家中') || 
      lowerLoc.includes('书房') || lowerLoc.includes('客厅') || 
      lowerLoc.includes('卧室') || lowerLoc.includes('厨房')) {
    return 'home';
  }
  
  if (lowerLoc.includes('办公室') || lowerLoc.includes('公司') || 
      lowerLoc.includes('会议室') || lowerLoc.includes('华泰证券') ||
      lowerLoc.includes('写字楼')) {
    return 'work';
  }
  
  if (lowerLoc.includes('餐厅') || lowerLoc.includes('咖啡厅') || 
      lowerLoc.includes('公园') || lowerLoc.includes('街') ||
      lowerLoc.includes('美术馆') || lowerLoc.includes('健身房') ||
      lowerLoc.includes('超市')) {
    return 'public';
  }
  
  // Check if it's a different city (remote)
  if (lowerLoc.includes('武汉') || lowerLoc.includes('上海') || 
      lowerLoc.includes('深圳') || lowerLoc.includes('北京') ||
      lowerLoc.includes('长沙') && !lowerLoc.includes('岳麓') && !lowerLoc.includes('开福')) {
    return 'remote';
  }
  
  // Default based on content
  if (lowerLoc.includes('线上') || lowerLoc.includes('论坛')) {
    return 'remote';
  }
  
  return 'unknown';
}

/**
 * Calculate duration in hours from date range
 */
export function calculateDuration(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // If same day and no specific time, estimate based on event type
  if (diffHours === 0) {
    return 1; // Default 1 hour for events without explicit duration
  }
  
  return Math.max(0.5, diffHours); // Minimum 30 minutes
}

/**
 * Process raw event data into EventNode
 */
export function processEvent(
  event: any,
  depth: number = 0,
  parentId?: string
): { node: EventNode; edges: GraphEdge[] } {
  const nodeId = String(event.event_id);
  
  // Parse date range
  const dateStr = event.date[0];
  const { start: startDate, end: endDate } = parseDateRange(dateStr);
  
  // Calculate duration
  const duration = calculateDuration(startDate, endDate);
  
  // Determine location type
  const locationType = getLocationType(event.location);
  
  // Create the node
  const node: EventNode = {
    event_id: event.event_id,
    name: event.name,
    description: event.description,
    date: event.date,
    type: event.type,
    participant: event.participant || [],
    location: event.location,
    decompose: event.decompose || 0,
    subevent: event.subevent,
    depth,
    subeventCount: event.subevent?.length || 0,
    participantCount: event.participant?.length || 0,
    duration,
    startDate,
    endDate,
    locationType,
    category: event.type,
    parentId
  };
  
  // Create edge from parent if exists
  const edges: GraphEdge[] = [];
  if (parentId) {
    edges.push({
      source: parentId,
      target: nodeId,
      type: 'CONTAINS',
      attributes: { order: 0 }
    });
  }
  
  return { node, edges };
}

/**
 * Load and process event tree data from JSON
 */
export async function loadEventData(url: string): Promise<{
  nodes: Map<string, EventNode>;
  edges: GraphEdge[];
  rootIds: string[];
}> {
  const response = await fetch(url);
  const data = await response.json();
  
  const nodes = new Map<string, EventNode>();
  const edges: GraphEdge[] = [];
  const rootIds: string[] = [];
  
  /**
   * Recursively process events and their sub-events
   */
  function processEventTree(eventData: any, depth: number = 0, parentId?: string) {
    const { node, edges: newEdges } = processEvent(eventData, depth, parentId);
    const nodeId = String(node.event_id);
    
    nodes.set(nodeId, node);
    
    if (!parentId) {
      rootIds.push(nodeId);
    }
    
    edges.push(...newEdges);
    
    // Process sub-events if this event has them
    if (eventData.decompose && eventData.subevent) {
      eventData.subevent.forEach((subEvent: any, index: number) => {
        const subNodeId = String(subEvent.event_id);
        const { node: subNode, edges: subEdges } = processEvent(subEvent, depth + 1, nodeId);
        
        // Update edge with correct order
        const edge = subEdges.find(e => e.target === subNodeId);
        if (edge) {
          edge.attributes.order = index;
        }
        
        nodes.set(subNodeId, subNode);
        edges.push(...subEdges);
        
        // Recursively process nested sub-events
        if (subEvent.decompose && subEvent.subevent) {
          processEventTree({
            ...subEvent,
            date: subEvent.date,
            decompose: subEvent.decompose,
            subevent: subEvent.subevent
          }, depth + 1, subNodeId);
        }
      });
    }
  }
  
  // Process all root events
  data.forEach((event: any) => {
    processEventTree(event);
  });
  
  return { nodes, edges, rootIds };
}

/**
 * Filter nodes based on various criteria
 */
export function filterNodes(
  nodes: Map<string, EventNode>,
  edges: GraphEdge[],
  filters: {
    timeRange?: { start: Date; end: Date; enabled: boolean };
    categories?: string[];
    participants?: string[];
    locationTypes?: string[];
    hierarchyLevels?: number[];
    searchQuery?: string;
  },
  expandedNodes: Set<string>
): { visibleNodes: EventNode[]; visibleEdges: GraphEdge[] } {
  const {
    timeRange,
    categories = [],
    participants = [],
    locationTypes = [],
    hierarchyLevels = [],
    searchQuery = ''
  } = filters;
  
  const visibleNodes: EventNode[] = [];
  const visibleNodeIds = new Set<string>();
  
  /**
   * Check if a node passes all filters
   */
  function passesFilters(node: EventNode): boolean {
    // Persona node always passes filters (it's the fixed root)
    if (node.event_id === 'persona-root') {
      return true;
    }

    // Time filter
    if (timeRange?.enabled) {
      if (node.endDate < timeRange.start || node.startDate > timeRange.end) {
        return false;
      }
    }

    // Category filter
    if (categories.length > 0 && !categories.includes(node.type)) {
      return false;
    }

    // Participant filter
    if (participants.length > 0) {
      const hasParticipant = node.participant.some(p =>
        participants.includes(p.name)
      );
      if (!hasParticipant) return false;
    }

    // Location type filter
    if (locationTypes.length > 0 && !locationTypes.includes(node.locationType)) {
      return false;
    }

    // Hierarchy level filter - adjust for persona at level 0
    // Level 0 = Persona (always shown), Level 1 = Main Events, Level 2 = Sub-Events, etc.
    if (hierarchyLevels.length > 0) {
      // Persona is always included if level 0 is selected
      if (node.event_id === 'persona-root') {
        return hierarchyLevels.includes(0);
      }
      // For other nodes, check if their depth is in the selected levels
      if (!hierarchyLevels.includes(node.depth)) {
        return false;
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = node.name.toLowerCase().includes(query);
      const matchesDesc = node.description.toLowerCase().includes(query);
      const matchesParticipant = node.participant.some(p =>
        p.name.toLowerCase().includes(query)
      );
      const matchesLocation = node.location.toLowerCase().includes(query);

      if (!matchesName && !matchesDesc && !matchesParticipant && !matchesLocation) {
        return false;
      }
    }

    return true;
  }

  /**
   * Recursively collect visible nodes
   */
  function collectNodes(nodeId: string, parentVisible: boolean) {
    const node = nodes.get(nodeId);
    if (!node) return;

    const isExpanded = expandedNodes.has(nodeId) || !node.subevent || node.subevent.length === 0;

    // Node is visible if it passes filters AND parent is visible (or it's a root)
    const nodePassesFilters = passesFilters(node);
    const isVisible = nodePassesFilters && parentVisible;

    if (isVisible) {
      visibleNodes.push(node);
      visibleNodeIds.add(nodeId);
    }

    // Process children if this node is expanded
    if (node.decompose && node.subevent && isExpanded) {
      for (const subEvent of node.subevent) {
        const subId = String(subEvent.event_id);
        // Children visibility depends on parent visibility
        collectNodes(subId, isVisible);
      }
    }
  }

  // Start from persona root node (always exists when persona is loaded)
  const personaNode = nodes.get('persona-root');
  if (personaNode) {
    collectNodes('persona-root', true);
  } else {
    // Fallback to regular roots if no persona
    const rootNodes = Array.from(nodes.values()).filter(n => n.depth === 0);
    for (const root of rootNodes) {
      collectNodes(String(root.event_id), true);
    }
  }
  
  // Collect edges between visible nodes
  const visibleEdges = edges.filter(
    edge => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );
  
  return { visibleNodes, visibleEdges };
}

/**
 * Get statistics about the event data
 */
export function getEventStatistics(nodes: Map<string, EventNode>): {
  totalEvents: number;
  parentEvents: number;
  subEvents: number;
  byCategory: Record<string, number>;
  byLocationType: Record<string, number>;
  byParticipantCount: Record<string, number>;
  dateRange: { min: Date; max: Date };
  topParticipants: { name: string; count: number }[];
} {
  const stats = {
    totalEvents: nodes.size,
    parentEvents: 0,
    subEvents: 0,
    byCategory: {} as Record<string, number>,
    byLocationType: {} as Record<string, number>,
    byParticipantCount: {} as Record<string, number>,
    dateRange: { min: new Date('2099-12-31'), max: new Date('1970-01-01') },
    participantCounts: {} as Record<string, number>
  };
  
  for (const node of nodes.values()) {
    // Count parent vs sub-events
    if (node.depth === 0) {
      stats.parentEvents++;
    } else {
      stats.subEvents++;
    }
    
    // Count by category
    stats.byCategory[node.type] = (stats.byCategory[node.type] || 0) + 1;
    
    // Count by location type
    stats.byLocationType[node.locationType] = (stats.byLocationType[node.locationType] || 0) + 1;
    
    // Count by participant count ranges
    const pCount = node.participantCount;
    const range = pCount === 1 ? '1 (solo)' : pCount <= 3 ? '2-3 (small)' : '4+ (group)';
    stats.byParticipantCount[range] = (stats.byParticipantCount[range] || 0) + 1;
    
    // Track date range
    if (node.startDate < stats.dateRange.min) {
      stats.dateRange.min = node.startDate;
    }
    if (node.endDate > stats.dateRange.max) {
      stats.dateRange.max = node.endDate;
    }
    
    // Count participants
    for (const p of node.participant) {
      stats.participantCounts[p.name] = (stats.participantCounts[p.name] || 0) + 1;
    }
  }
  
  // Convert participant counts to sorted array
  const topParticipants = Object.entries(stats.participantCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Clean up temp field
  delete (stats as any).participantCounts;
  
  return { ...stats, topParticipants };
}
