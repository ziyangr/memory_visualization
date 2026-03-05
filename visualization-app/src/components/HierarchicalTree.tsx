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

    return {
      nodes: simulationNodes,
      links: simulationLinks,
      positions
    };
  }, [visibleNodes, expandedNodes, width, height]);
  
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

    const x = simNode.x!;
    const y = simNode.y!;
    const radius = getNodeRadius(simNode.data);
    const color = getNodeColor(simNode.data);
    const lightColor = getNodeLightColor(simNode.data);
    
    return (
      <g
        key={nodeId}
        className="tree-node"
        transform={`translate(${x}, ${y})`}
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) {
            actions.toggleNode(nodeId);
          }
          actions.selectNode(nodeId);
        }}
        onMouseEnter={() => setHoveredNode(nodeId)}
        onMouseLeave={() => setHoveredNode(null)}
        style={{ cursor: hasChildren ? 'pointer' : 'default' }}
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
    const sourceX = link.source.x!;
    const sourceY = link.source.y!;
    const targetX = link.target.x!;
    const targetY = link.target.y!;

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

      {/* Render edges first (so they appear behind nodes) */}
      {simulationLinks.map(renderEdge)}

      {/* Render nodes */}
      {simulationNodes.map(renderNode)}
    </svg>
  );
};
