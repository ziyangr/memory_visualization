// src/components/HierarchicalTree.tsx

import { useRef, useMemo, useState } from 'react';
import { hierarchy, tree } from 'd3-hierarchy';
import { forceManyBody, forceCollide, forceCenter, forceSimulation, forceLink } from 'd3-force';
import { EventNode, CATEGORY_COLORS, CATEGORY_ICONS } from '../types/event';
import { useEventTreeStore } from '../store/eventTreeStore';

interface HierarchicalTreeProps {
  width: number;
  height: number;
}

interface SimulationNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  data: EventNode;
  depth: number;
  children?: SimulationNode[];
}

export const HierarchicalTree: React.FC<HierarchicalTreeProps> = ({ width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Store node positions (allows drag updates to trigger re-renders)
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Drag state for nodes
  const [dragState, setDragState] = useState<{
    draggingNodeId: string | null;
    draggedSubtree: Set<string>;
    initialPositions: Map<string, { x: number; y: number }>;
  }>({
    draggingNodeId: null,
    draggedSubtree: new Set(),
    initialPositions: new Map()
  });

  // Canvas pan state
  const [panState, setPanState] = useState<{
    isPanning: boolean;
    panX: number;
    panY: number;
    lastMouseX: number;
    lastMouseY: number;
  }>({
    isPanning: false,
    panX: 0,
    panY: 0,
    lastMouseX: 0,
    lastMouseY: 0
  });

  const {
    visibleNodes,
    view,
    actions
  } = useEventTreeStore();
  
  const { expandedNodes, selectedNode, showLabels, showEdges } = view;

  // Build hierarchy from visible nodes with force-directed layout
  const layoutData = useMemo(() => {
    if (visibleNodes.length === 0) return null;

    // Build a map for quick lookup
    const nodeMap = new Map(visibleNodes.map(n => [String(n.event_id), n]));

    // Build hierarchy structure recursively
    function buildHierarchy(node: EventNode): any {
      const nodeId = String(node.event_id);
      const isExpanded = expandedNodes.has(nodeId);
      const hasChildren = node.subevent && node.subevent.length > 0;

      const children = hasChildren && isExpanded
        ? node.subevent!
            .map(sub => nodeMap.get(String(sub.event_id)))
            .filter(Boolean)
            .map(child => buildHierarchy(child!))
        : undefined;

      return {
        ...node,
        children: children && children.length > 0 ? children : undefined
      };
    }

    // Find the persona root or regular roots
    const personaNode = nodeMap.get('persona-root');

    let rootData;

    if (personaNode) {
      // Persona exists - it's the root
      rootData = buildHierarchy(personaNode);
    } else {
      // No persona - use regular depth 0 roots
      const rootNodes = visibleNodes.filter(n => n.depth === 0);
      rootData = {
        event_id: 'virtual-root',
        name: 'root',
        description: '',
        date: [''],
        type: '',
        participant: [],
        location: '',
        decompose: 1 as const,
        depth: -1,
        subeventCount: 0,
        participantCount: 0,
        duration: 0,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-03-31'),
        locationType: 'unknown' as const,
        category: '',
        children: rootNodes.map(r => buildHierarchy(r))
      };
    }

    const root = hierarchy(rootData);
    const nodes = root.descendants();
    const links = root.links();

    // Calculate initial positions using tree layout
    const treeLayout = tree<any>()
      .size([width - 300, height - 100])
      .nodeSize([50, 120]);

    treeLayout(root);

    // Create simulation nodes with initial tree positions
    const centerX = width / 2;
    const centerY = height / 2;

    const simulationNodes = nodes.map((node: any) => ({
      id: String(node.data.event_id),
      x: centerX + (node.x! - centerX) * 0.8, // Compress toward center
      y: centerY + (node.y! - 80) * 0.8,
      vx: 0,
      vy: 0,
      data: node.data,
      depth: node.depth,
      children: node.children
    }));

    // Create simulation links
    const simulationLinks = links.map((link: any) => ({
      source: String(link.source.data.event_id),
      target: String(link.target.data.event_id)
    }));

    // Run force simulation for floating layout
    const simulation = forceSimulation<SimulationNode>(simulationNodes)
      .force('charge', forceManyBody().strength(-200))
      .force('collide', forceCollide().radius((d: any) => {
        const node = d as SimulationNode;
        const radius = node.data.event_id === 'persona-root' ? 40 :
                       node.data.depth === 0 ? 30 :
                       node.data.depth === 1 ? 22 : 16;
        return radius + 10;
      }).iterations(2))
      .force('link', forceLink<any, any>(simulationLinks)
        .id((d: any) => d.id)
        .distance(100)
        .strength(0.1))
      .force('center', forceCenter(centerX, centerY).strength(0.05))
      .stop();

    // Run simulation for a fixed number of iterations
    for (let i = 0; i < 150; i++) {
      simulation.tick();
    }

    // Store final positions
    const positions = new Map<string, { x: number; y: number }>();
    simulationNodes.forEach(node => {
      positions.set(node.id, { x: node.x!, y: node.y! });
    });

    // Initialize positions if not already set
    setNodePositions(prev => {
      const newPositions = new Map(prev);
      positions.forEach((pos, id) => {
        if (!newPositions.has(id)) {
          newPositions.set(id, pos);
        }
      });
      return newPositions;
    });

    return {
      nodes: simulationNodes,
      links: simulationLinks,
      positions
    };
  }, [visibleNodes, expandedNodes, width, height]);

  // Get all descendant node IDs for a given node
  const getSubtreeNodes = (nodeId: string, nodes: SimulationNode[]): Set<string> => {
    const subtree = new Set<string>();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    function collectDescendants(id: string) {
      const node = nodeMap.get(id);
      if (!node || !node.children) return;

      for (const child of node.children) {
        subtree.add(child.id);
        collectDescendants(child.id);
      }
    }

    collectDescendants(nodeId);
    return subtree;
  };

  // Handle drag start
  const handleDragStart = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!layoutData) return;

    const subtree = getSubtreeNodes(nodeId, layoutData.nodes);
    const initialPositions = new Map<string, { x: number; y: number }>();

    // Store initial positions for all nodes in the subtree
    layoutData.nodes.forEach(n => {
      if (n.id === nodeId || subtree.has(n.id)) {
        const pos = nodePositions.get(n.id) || layoutData.positions.get(n.id);
        if (pos) {
          initialPositions.set(n.id, pos);
        }
      }
    });

    setDragState({
      draggingNodeId: nodeId,
      draggedSubtree: subtree,
      initialPositions
    });
  };

  // Handle drag move
  const handleDragMove = (event: React.MouseEvent) => {
    if (!dragState.draggingNodeId || !layoutData) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - panState.panX;
    const mouseY = event.clientY - rect.top - panState.panY;

    const baseInitialPos = dragState.initialPositions.get(dragState.draggingNodeId);
    if (!baseInitialPos) return;

    // Calculate the delta from the initial position
    const deltaX = mouseX - baseInitialPos.x;
    const deltaY = mouseY - baseInitialPos.y;

    // Update positions for all nodes in the subtree
    const newPositions = new Map(nodePositions);
    dragState.initialPositions.forEach((initialPos, nodeId) => {
      newPositions.set(nodeId, {
        x: initialPos.x + deltaX,
        y: initialPos.y + deltaY
      });
    });

    setNodePositions(newPositions);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDragState({
      draggingNodeId: null,
      draggedSubtree: new Set(),
      initialPositions: new Map()
    });
  };

  // Canvas panning handlers
  const handleCanvasPanStart = (event: React.MouseEvent) => {
    // Middle click (button 1) - always pan
    if (event.button === 1) {
      event.preventDefault();
      setPanState(prev => ({
        ...prev,
        isPanning: true,
        lastMouseX: event.clientX,
        lastMouseY: event.clientY
      }));
      return;
    }

    // Left click (button 0) on empty area - pan only if not clicking on a node
    // This is handled by the node's stopPropagation, so if we get here, it's an empty area click
    if (event.button === 0 && !dragState.draggingNodeId) {
      setPanState(prev => ({
        ...prev,
        isPanning: true,
        lastMouseX: event.clientX,
        lastMouseY: event.clientY
      }));
    }
  };

  const handleCanvasPanMove = (event: React.MouseEvent) => {
    if (!panState.isPanning) return;

    const deltaX = event.clientX - panState.lastMouseX;
    const deltaY = event.clientY - panState.lastMouseY;

    setPanState(prev => ({
      ...prev,
      panX: prev.panX + deltaX,
      panY: prev.panY + deltaY,
      lastMouseX: event.clientX,
      lastMouseY: event.clientY
    }));
  };

  const handleCanvasPanEnd = () => {
    setPanState(prev => ({
      ...prev,
      isPanning: false
    }));
  };

  // Reset pan to center
  const resetPan = () => {
    setPanState(prev => ({
      ...prev,
      panX: 0,
      panY: 0
    }));
  };

  // Handle double click to reset pan
  const handleSvgDoubleClick = () => {
    resetPan();
  };

  // Handle SVG mouse move/end for drag
  const handleSvgMouseMove = (event: React.MouseEvent) => {
    if (dragState.draggingNodeId) {
      handleDragMove(event);
    } else if (panState.isPanning) {
      handleCanvasPanMove(event);
    }
  };

  const handleSvgMouseUp = () => {
    if (dragState.draggingNodeId) {
      handleDragEnd();
    }
    if (panState.isPanning) {
      handleCanvasPanEnd();
    }
  };

  // Handle middle click to prevent default browser behavior
  const handleSvgContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
  };

  if (!layoutData || visibleNodes.length === 0) {
    return (
      <div className="empty-state">
        <p>No events to display. Adjust filters or expand nodes.</p>
      </div>
    );
  }

  const { nodes: simulationNodes, links: simulationLinks } = layoutData;

  const getNodeColor = (node: EventNode) => {
    const colors = CATEGORY_COLORS[node.type] || CATEGORY_COLORS['Personal Life'];
    return colors.main;
  };

  const getNodeLightColor = (node: EventNode) => {
    const colors = CATEGORY_COLORS[node.type] || CATEGORY_COLORS['Personal Life'];
    return colors.light;
  };

  const getNodeRadius = (node: EventNode) => {
    // Persona root gets the largest size
    if (node.event_id === 'persona-root') return 35;
    switch (node.depth) {
      case 0: return 25;
      case 1: return 18;
      default: return 12;
    }
  };

  const renderNode = (simNode: SimulationNode) => {
    const nodeId = simNode.id;
    const isSelected = selectedNode === nodeId;
    const isHovered = hoveredNode === nodeId;
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = simNode.data.subevent && simNode.data.subevent.length > 0;
    const isDragging = dragState.draggingNodeId === nodeId;
    const isInDraggedSubtree = dragState.draggedSubtree.has(nodeId);

    // Use stored position or fallback to simulation position
    const pos = nodePositions.get(nodeId);
    const x = pos?.x ?? simNode.x!;
    const y = pos?.y ?? simNode.y!;

    const radius = getNodeRadius(simNode.data);
    const color = getNodeColor(simNode.data);
    const lightColor = getNodeLightColor(simNode.data);

    return (
      <g
        key={nodeId}
        className="tree-node"
        transform={`translate(${x}, ${y})`}
        onMouseDown={(e) => {
          e.stopPropagation();
          handleDragStart(nodeId, e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) {
            actions.toggleNode(nodeId);
          }
          actions.selectNode(nodeId);
        }}
        onMouseEnter={() => setHoveredNode(nodeId)}
        onMouseLeave={() => setHoveredNode(null)}
        style={{
          cursor: isDragging || isInDraggedSubtree ? 'grabbing' : hasChildren ? 'pointer' : 'grab'
        }}
      >
        {/* Node shape - Persona root gets a special double circle */}
        {simNode.data.event_id === 'persona-root' && (
          <>
            <circle
              r={radius + 4}
              fill={lightColor}
              stroke={color}
              strokeWidth={3}
              filter={isHovered ? 'url(#glow)' : undefined}
            />
            <circle
              r={radius - 4}
              fill={color}
              fillOpacity={0.2}
              filter={isHovered ? 'url(#glow)' : undefined}
            />
          </>
        )}
        {simNode.data.depth === 0 && simNode.data.event_id !== 'persona-root' && (
          <circle
            r={radius}
            fill={lightColor}
            stroke={color}
            strokeWidth={isSelected ? 4 : isExpanded ? 3 : 2}
            filter={isHovered ? 'url(#glow)' : undefined}
          />
        )}
        {simNode.data.depth === 1 && (
          <rect
            x={-radius}
            y={-radius * 0.7}
            width={radius * 2}
            height={radius * 1.4}
            rx={4}
            fill={lightColor}
            stroke={color}
            strokeWidth={isSelected ? 4 : 2}
            filter={isHovered ? 'url(#glow)' : undefined}
          />
        )}
        {simNode.data.depth >= 2 && (
          <polygon
            points={`0,${-radius} ${radius},${radius} ${-radius},${radius}`}
            fill={lightColor}
            stroke={color}
            strokeWidth={isSelected ? 4 : 2}
            filter={isHovered ? 'url(#glow)' : undefined}
          />
        )}

        {/* Category icon */}
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={radius * 0.6}
          dy={simNode.data.depth >= 2 ? -2 : 0}
        >
          {CATEGORY_ICONS[simNode.data.type] || '📌'}
        </text>
        
        {/* Expand/collapse indicator */}
        {hasChildren && (
          <g transform={`translate(${radius + 8}, 0)`}>
            <circle r={8} fill="#fff" stroke={color} strokeWidth={1} />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fontWeight="bold"
              fill={color}
            >
              {isExpanded ? '−' : '+'}
            </text>
          </g>
        )}
        
        {/* Label */}
        {showLabels && (
          <g transform={`translate(0, ${radius + 18})`}>
            <text
              textAnchor="middle"
              fontSize={simNode.data.depth === 0 ? 13 : 11}
              fontWeight={simNode.data.depth === 0 ? 600 : 400}
              fill="#333"
            >
              {simNode.data.name.length > 20
                ? simNode.data.name.substring(0, 18) + '...'
                : simNode.data.name}
            </text>
            {simNode.data.depth === 0 && (
              <text
                textAnchor="middle"
                fontSize={9}
                fill="#666"
                dy={14}
              >
                {simNode.data.subeventCount} sub-events
              </text>
            )}
          </g>
        )}

        {/* Badge for participant count */}
        {simNode.data.participantCount > 1 && (
          <g transform={`translate(${-radius - 10}, ${-radius - 10})`}>
            <circle r={10} fill="#fff" stroke="#E5E7EB" strokeWidth={1} />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fill="#666"
            >
              👥
            </text>
          </g>
        )}
      </g>
    );
  };
  
  const renderEdge = (link: any, index: number) => {
    // Use stored positions for real-time edge following during drag
    const sourcePos = nodePositions.get(link.source.id) || { x: link.source.x!, y: link.source.y! };
    const targetPos = nodePositions.get(link.target.id) || { x: link.target.x!, y: link.target.y! };

    const sourceX = sourcePos.x;
    const sourceY = sourcePos.y;
    const targetX = targetPos.x;
    const targetY = targetPos.y;

    // Create curved path
    const pathData = `M${sourceX},${sourceY}
                      C${(sourceX + targetX) / 2},${sourceY}
                       ${(sourceX + targetX) / 2},${targetY}
                       ${targetX},${targetY}`;

    const color = getNodeColor(link.source.data);

    return (
      <path
        key={`edge-${index}`}
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={showEdges ? 0.6 : 0}
        markerEnd="url(#arrowhead)"
        style={{ transition: 'stroke-opacity 0.3s' }}
      />
    );
  };

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="hierarchical-tree"
      onMouseDown={handleCanvasPanStart}
      onMouseMove={handleSvgMouseMove}
      onMouseUp={handleSvgMouseUp}
      onMouseLeave={handleSvgMouseUp}
      onContextMenu={handleSvgContextMenu}
      onDoubleClick={handleSvgDoubleClick}
      style={{ cursor: panState.isPanning ? 'grabbing' : 'default' }}
    >
      <defs>
        {/* Glow filter for hover effect */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Arrow marker */}
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#666"
            opacity={0.5}
          />
        </marker>
      </defs>

      {/* Apply pan transform to all content */}
      <g transform={`translate(${panState.panX}, ${panState.panY})`}>
        {/* Render edges first (so they appear behind nodes) */}
        {simulationLinks.map(renderEdge)}

        {/* Render nodes */}
        {simulationNodes.map(renderNode)}
      </g>
    </svg>
  );
};
