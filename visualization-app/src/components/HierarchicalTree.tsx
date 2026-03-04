// src/components/HierarchicalTree.tsx

import { useRef, useMemo, useState } from 'react';
import { hierarchy, tree } from 'd3-hierarchy';
import { EventNode, CATEGORY_COLORS, CATEGORY_ICONS } from '../types/event';
import { useEventTreeStore } from '../store/eventTreeStore';

interface HierarchicalTreeProps {
  width: number;
  height: number;
}

interface TreeNode extends d3.HierarchyNode<any> {
  data: EventNode;
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
  
  // Build hierarchy from visible nodes
  const layoutData = useMemo(() => {
    if (visibleNodes.length === 0) return null;
    
    // Find root nodes (depth 0)
    const rootNodes = visibleNodes.filter(n => n.depth === 0);
    
    // Build a map for quick lookup
    const nodeMap = new Map(visibleNodes.map(n => [String(n.event_id), n]));
    
    // Build hierarchy structure
    function buildHierarchy(node: EventNode): any {
      const nodeId = String(node.event_id);
      const isExpanded = expandedNodes.has(nodeId);

      const children = node.subevent
        ?.map(sub => nodeMap.get(String(sub.event_id)))
        .filter(Boolean)
        .filter(child => child && isExpanded) // Only include children if parent is expanded
        .map(child => buildHierarchy(child!)) || [];

      return {
        ...node,
        children: children.length > 0 ? children : undefined
      };
    }
    
    // Create root with all root nodes as children
    const rootData = {
      event_id: 'root',
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
    
    const root = hierarchy(rootData);
    
    // Compute tree layout
    const treeLayout = tree<any>()
      .size([width - 300, height - 100])
      .nodeSize([40, 100]); // [nodeWidth, levelHeight]
    
    return treeLayout(root);
  }, [visibleNodes, expandedNodes, width, height]);
  
  if (!layoutData || visibleNodes.length === 0) {
    return (
      <div className="empty-state">
        <p>No events to display. Adjust filters or expand nodes.</p>
      </div>
    );
  }
  
  const getNodeColor = (node: EventNode) => {
    const colors = CATEGORY_COLORS[node.type] || CATEGORY_COLORS['Personal Life'];
    return colors.main;
  };
  
  const getNodeLightColor = (node: EventNode) => {
    const colors = CATEGORY_COLORS[node.type] || CATEGORY_COLORS['Personal Life'];
    return colors.light;
  };
  
  const getNodeRadius = (node: EventNode) => {
    switch (node.depth) {
      case 0: return 25;
      case 1: return 18;
      default: return 12;
    }
  };

  const renderNode = (node: TreeNode) => {
    const nodeId = String(node.data.event_id);
    const isSelected = selectedNode === nodeId;
    const isHovered = hoveredNode === nodeId;
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = node.data.subevent && node.data.subevent.length > 0;
    
    const x = node.x!;
    const y = node.y!;
    const radius = getNodeRadius(node.data);
    const color = getNodeColor(node.data);
    const lightColor = getNodeLightColor(node.data);
    
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
        {/* Node shape */}
        {node.data.depth === 0 && (
          <circle
            r={radius}
            fill={lightColor}
            stroke={color}
            strokeWidth={isSelected ? 4 : isExpanded ? 3 : 2}
            filter={isHovered ? 'url(#glow)' : undefined}
          />
        )}
        {node.data.depth === 1 && (
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
        {node.data.depth >= 2 && (
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
          dy={node.data.depth >= 2 ? -2 : 0}
        >
          {CATEGORY_ICONS[node.data.type] || '📌'}
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
              fontSize={node.data.depth === 0 ? 13 : 11}
              fontWeight={node.data.depth === 0 ? 600 : 400}
              fill="#333"
            >
              {node.data.name.length > 20 
                ? node.data.name.substring(0, 18) + '...' 
                : node.data.name}
            </text>
            {node.data.depth === 0 && (
              <text
                textAnchor="middle"
                fontSize={9}
                fill="#666"
                dy={14}
              >
                {node.data.subeventCount} sub-events
              </text>
            )}
          </g>
        )}
        
        {/* Badge for participant count */}
        {node.data.participantCount > 1 && (
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
  
  const renderEdge = (link: d3.HierarchyLink<any>, index: number) => {
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
      
      <g transform="translate(250, 50)">
        {/* Render edges first (so they appear behind nodes) */}
        {layoutData.links().map(renderEdge)}
        
        {/* Render nodes */}
        {layoutData.descendants().map(renderNode)}
      </g>
    </svg>
  );
};
