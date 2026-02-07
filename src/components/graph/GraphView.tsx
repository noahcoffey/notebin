import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useNoteStore, useWorkspaceStore } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';
import { buildGraph, buildLocalGraph, type GraphNode, type GraphLink, type GraphData } from '../../services/graph';
import { X, Maximize2, Minimize2, Focus } from 'lucide-react';

interface GraphViewProps {
  onClose: () => void;
}

export function GraphView({ onClose }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notes } = useNoteStore();
  const { openNote, tabs, activeTabId } = useWorkspaceStore();
  const isMobile = useIsMobile();
  const [isLocalView, setIsLocalView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeNoteId = activeTab?.noteId;

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Build graph data
    const graphData: GraphData = isLocalView && activeNoteId
      ? buildLocalGraph(notes, activeNoteId, 2)
      : buildGraph(notes);

    if (graphData.nodes.length === 0) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-muted)')
        .text('No notes to display');
      return;
    }

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create container group for zoom/pan
    const g = svg.append('g');

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(graphData.links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', 'var(--border-primary)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => Math.min(8 + d.linkCount * 2, 20))
      .attr('fill', d => {
        if (d.id === activeNoteId) return 'var(--accent)';
        if (d.type === 'unresolved') return 'var(--text-faint)';
        return 'var(--link)';
      })
      .attr('stroke', d => d.id === activeNoteId ? 'var(--accent-hover)' : 'none')
      .attr('stroke-width', 2);

    // Add labels to nodes
    node.append('text')
      .text(d => d.title)
      .attr('x', 0)
      .attr('y', d => Math.min(8 + d.linkCount * 2, 20) + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.type === 'unresolved' ? 'var(--text-faint)' : 'var(--text-primary)')
      .attr('font-size', '11px')
      .attr('font-family', 'var(--font-ui)')
      .style('pointer-events', 'none');

    // Handle click on nodes
    node.on('click', (event, d) => {
      event.stopPropagation();
      if (d.type === 'note') {
        openNote(d.id, d.title);
      }
    });

    // Hover effects
    node.on('mouseenter', function(_, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(150)
        .attr('r', Math.min(8 + d.linkCount * 2, 20) + 3);
    });

    node.on('mouseleave', function(_, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(150)
        .attr('r', Math.min(8 + d.linkCount * 2, 20));
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Center view on active note if in local view
    if (isLocalView && activeNoteId) {
      const activeNode = graphData.nodes.find(n => n.id === activeNoteId);
      if (activeNode) {
        setTimeout(() => {
          const scale = 1;
          const x = width / 2 - (activeNode.x || 0) * scale;
          const y = height / 2 - (activeNode.y || 0) * scale;
          svg.transition()
            .duration(500)
            .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
        }, 1000);
      }
    }

    return () => {
      simulation.stop();
    };
  }, [notes, isLocalView, activeNoteId, openNote]);

  return (
    <div
      className={`flex flex-col bg-bg-primary ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-primary bg-bg-secondary">
        <span className="text-sm font-medium text-text-primary">
          {isLocalView ? 'Local Graph' : 'Graph View'}
        </span>
        <div className="flex items-center gap-1">
          {activeNoteId && (
            <button
              onClick={() => setIsLocalView(!isLocalView)}
              className={`p-1.5 rounded transition-colors ${
                isLocalView
                  ? 'bg-accent/20 text-accent'
                  : 'hover:bg-bg-hover text-text-muted hover:text-text-primary'
              }`}
              title={isLocalView ? 'Show full graph' : 'Show local graph'}
            >
              <Focus size={16} />
            </button>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
            title="Close graph"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ display: 'block' }}
        />
      </div>
      <div className="px-3 py-1.5 text-xs text-text-muted border-t border-border-primary bg-bg-secondary">
        {notes.length} notes • Drag to move • {isMobile ? 'Pinch' : 'Scroll'} to zoom • Click to open
      </div>
    </div>
  );
}
