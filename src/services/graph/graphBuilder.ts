import type { Note } from '../../types';

export interface GraphNode {
  id: string;
  title: string;
  type: 'note' | 'unresolved';
  linkCount: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function buildGraph(notes: Note[]): GraphData {
  const nodeMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  // Create nodes for all notes
  for (const note of notes) {
    nodeMap.set(note.title.toLowerCase(), {
      id: note.id,
      title: note.title,
      type: 'note',
      linkCount: 0,
    });
  }

  // Process links and create unresolved nodes
  for (const note of notes) {
    const outgoingLinks = note.metadata?.outgoingLinks || [];

    for (const link of outgoingLinks) {
      const targetKey = link.target.toLowerCase();
      let targetNode = nodeMap.get(targetKey);

      // Create unresolved node if target doesn't exist
      if (!targetNode) {
        targetNode = {
          id: `unresolved-${link.target}`,
          title: link.target,
          type: 'unresolved',
          linkCount: 0,
        };
        nodeMap.set(targetKey, targetNode);
      }

      // Add link
      links.push({
        source: note.id,
        target: targetNode.id,
      });

      // Increment link counts
      const sourceNode = nodeMap.get(note.title.toLowerCase());
      if (sourceNode) {
        sourceNode.linkCount++;
      }
      targetNode.linkCount++;
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links,
  };
}

export function buildLocalGraph(notes: Note[], activeNoteId: string, depth: number = 1): GraphData {
  const activeNote = notes.find(n => n.id === activeNoteId);
  if (!activeNote) {
    return { nodes: [], links: [] };
  }

  const relevantNoteIds = new Set<string>([activeNoteId]);
  const relevantTitles = new Set<string>([activeNote.title.toLowerCase()]);

  // Find directly connected notes
  const findConnections = (noteId: string, currentDepth: number) => {
    if (currentDepth > depth) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    // Outgoing links
    const outgoingLinks = note.metadata?.outgoingLinks || [];
    for (const link of outgoingLinks) {
      relevantTitles.add(link.target.toLowerCase());
      const targetNote = notes.find(n => n.title.toLowerCase() === link.target.toLowerCase());
      if (targetNote) {
        if (!relevantNoteIds.has(targetNote.id)) {
          relevantNoteIds.add(targetNote.id);
          if (currentDepth < depth) {
            findConnections(targetNote.id, currentDepth + 1);
          }
        }
      }
    }

    // Incoming links (backlinks)
    for (const otherNote of notes) {
      const otherLinks = otherNote.metadata?.outgoingLinks || [];
      for (const link of otherLinks) {
        if (link.target.toLowerCase() === note.title.toLowerCase()) {
          if (!relevantNoteIds.has(otherNote.id)) {
            relevantNoteIds.add(otherNote.id);
            relevantTitles.add(otherNote.title.toLowerCase());
            if (currentDepth < depth) {
              findConnections(otherNote.id, currentDepth + 1);
            }
          }
        }
      }
    }
  };

  findConnections(activeNoteId, 1);

  // Filter notes and build graph
  const relevantNotes = notes.filter(n => relevantNoteIds.has(n.id));
  const fullGraph = buildGraph(relevantNotes);

  // Also include unresolved nodes that are linked from relevant notes
  const filteredNodes = fullGraph.nodes.filter(
    n => relevantNoteIds.has(n.id) || relevantTitles.has(n.title.toLowerCase())
  );

  const nodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredLinks = fullGraph.links.filter(
    l => {
      const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
      const targetId = typeof l.target === 'string' ? l.target : l.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    }
  );

  return {
    nodes: filteredNodes,
    links: filteredLinks,
  };
}
