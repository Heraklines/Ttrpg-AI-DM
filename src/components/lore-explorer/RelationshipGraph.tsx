'use client';

import { useRef, useEffect, useState, useMemo } from 'react';

type EntityType = 'npc' | 'faction' | 'location' | 'deity';
type RelationshipType = 'ally' | 'enemy' | 'rival' | 'servant' | 'patron' | 'family' | 'trade_partner' | 'neutral';

interface GraphNode {
  id: string;
  type: EntityType;
  name: string;
  tier?: string;
  isDiscovered: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  strength: number;
  isPublic: boolean;
  isDiscovered: boolean;
}

interface RelationshipGraphProps {
  centerId: string;
  centerType: EntityType;
  nodes: GraphNode[];
  edges: GraphEdge[];
  mode: 'player' | 'dm';
  onNodeClick: (entityType: EntityType, entityId: string) => void;
  compact?: boolean;
}

const typeColors: Record<EntityType, string> = {
  npc: '#C4A35A',
  faction: '#1E4D6B',
  location: '#4CAF50',
  deity: '#9C27B0',
};

const relationshipColors: Record<RelationshipType, string> = {
  ally: '#4CAF50',
  enemy: '#CF6679',
  rival: '#FFC107',
  servant: '#9C27B0',
  patron: '#673AB7',
  family: '#2196F3',
  trade_partner: '#795548',
  neutral: '#9E9E9E',
};

export function RelationshipGraph({
  centerId,
  centerType,
  nodes,
  edges,
  mode,
  onNodeClick,
  compact = false,
}: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [simulatedNodes, setSimulatedNodes] = useState<GraphNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const width = compact ? 300 : 600;
  const height = compact ? 200 : 400;
  const centerX = width / 2;
  const centerY = height / 2;

  const visibleNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (mode === 'player' && !node.isDiscovered) return false;
      return true;
    });
  }, [nodes, mode]);

  const visibleEdges = useMemo(() => {
    return edges.filter((edge) => {
      if (mode === 'player' && !edge.isPublic && !edge.isDiscovered) return false;
      const sourceVisible = visibleNodes.some((n) => n.id === edge.source);
      const targetVisible = visibleNodes.some((n) => n.id === edge.target);
      return sourceVisible && targetVisible;
    });
  }, [edges, mode, visibleNodes]);

  useEffect(() => {
    const centerKey = `${centerType}:${centerId}`;
    const nodesCopy = visibleNodes.map((node, i) => {
      const isCenter = node.id === centerKey;
      const angle = (i / visibleNodes.length) * 2 * Math.PI;
      const radius = isCenter ? 0 : (compact ? 80 : 150);
      
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    const iterations = 50;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < nodesCopy.length; i++) {
        for (let j = i + 1; j < nodesCopy.length; j++) {
          const dx = nodesCopy[j].x! - nodesCopy[i].x!;
          const dy = nodesCopy[j].y! - nodesCopy[i].y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = compact ? 40 : 60;
          
          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.5;
            nodesCopy[i].x! -= dx * force;
            nodesCopy[i].y! -= dy * force;
            nodesCopy[j].x! += dx * force;
            nodesCopy[j].y! += dy * force;
          }
        }
      }

      for (const edge of visibleEdges) {
        const source = nodesCopy.find((n) => n.id === edge.source);
        const target = nodesCopy.find((n) => n.id === edge.target);
        if (source && target) {
          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const idealDist = compact ? 80 : 120;
          const force = (dist - idealDist) / dist * 0.1;
          
          source.x! += dx * force;
          source.y! += dy * force;
          target.x! -= dx * force;
          target.y! -= dy * force;
        }
      }

      nodesCopy.forEach((node) => {
        node.x = Math.max(30, Math.min(width - 30, node.x!));
        node.y = Math.max(30, Math.min(height - 30, node.y!));
      });
    }

    setSimulatedNodes(nodesCopy);
  }, [visibleNodes, visibleEdges, centerId, centerType, width, height, centerX, centerY, compact]);

  const getNodeById = (id: string) => simulatedNodes.find((n) => n.id === id);

  const handleNodeClick = (node: GraphNode) => {
    const [type, id] = node.id.split(':');
    onNodeClick(type as EntityType, id);
  };

  return (
    <div className={`relative ${compact ? 'w-full' : 'w-full max-w-[600px]'}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-background-dark rounded-lg border border-primary-gold/20"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
        </defs>

        {visibleEdges.map((edge) => {
          const source = getNodeById(edge.source);
          const target = getNodeById(edge.target);
          if (!source || !target) return null;

          const dx = target.x! - source.x!;
          const dy = target.y! - source.y!;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const nodeRadius = compact ? 12 : 20;
          const offsetX = (dx / dist) * nodeRadius;
          const offsetY = (dy / dist) * nodeRadius;

          return (
            <line
              key={edge.id}
              x1={source.x! + offsetX}
              y1={source.y! + offsetY}
              x2={target.x! - offsetX}
              y2={target.y! - offsetY}
              stroke={relationshipColors[edge.type]}
              strokeWidth={Math.max(1, edge.strength / 3)}
              strokeOpacity={hoveredNode && hoveredNode !== source.id && hoveredNode !== target.id ? 0.2 : 0.8}
              strokeDasharray={edge.type === 'rival' ? '5,5' : undefined}
            />
          );
        })}

        {simulatedNodes.map((node) => {
          const isCenter = node.id === `${centerType}:${centerId}`;
          const nodeRadius = isCenter ? (compact ? 16 : 25) : (compact ? 10 : 18);
          const isHovered = hoveredNode === node.id;
          const displayName = mode === 'player' && !node.isDiscovered ? '???' : node.name;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => handleNodeClick(node)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              className="cursor-pointer"
            >
              <circle
                r={nodeRadius + (isHovered ? 3 : 0)}
                fill={typeColors[node.type]}
                stroke={isCenter ? '#C4A35A' : '#666'}
                strokeWidth={isCenter ? 3 : 1}
                opacity={hoveredNode && !isHovered ? 0.5 : 1}
              />

              {!compact && (
                <text
                  y={nodeRadius + 14}
                  textAnchor="middle"
                  fill="#F4E4BC"
                  fontSize="10"
                  className="pointer-events-none"
                >
                  {displayName.length > 12 ? displayName.slice(0, 10) + '...' : displayName}
                </text>
              )}

              {isHovered && compact && (
                <title>{displayName}</title>
              )}
            </g>
          );
        })}
      </svg>

      {!compact && (
        <div className="flex flex-wrap gap-2 mt-2 justify-center">
          {Object.entries(relationshipColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1 text-xs text-parchment/60">
              <div className="w-3 h-1 rounded" style={{ backgroundColor: color }} />
              <span className="capitalize">{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
