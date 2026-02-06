import { describe, it, expect } from 'vitest';
import { buildGraph, buildLocalGraph } from './graphBuilder';
import type { Note } from '../../types';
import type { GraphLink } from './graphBuilder';

function makeNote(overrides: Partial<Note> & { id: string; title: string }): Note {
  return {
    path: `/${overrides.title}`,
    folderId: null,
    content: '',
    frontmatter: {},
    metadata: {
      wordCount: 0,
      headings: [],
      outgoingLinks: [],
      blockIds: [],
      inlineTags: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeLink(target: string, position = 0) {
  return {
    target,
    type: 'wikilink' as const,
    position: { start: position, end: position + target.length + 4, line: 0 },
  };
}

function linkSourceTarget(link: GraphLink) {
  return {
    source: typeof link.source === 'string' ? link.source : link.source.id,
    target: typeof link.target === 'string' ? link.target : link.target.id,
  };
}

describe('buildGraph', () => {
  it('returns empty graph for empty note list', () => {
    const result = buildGraph([]);
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it('builds nodes from notes', () => {
    const notes = [
      makeNote({ id: '1', title: 'Alpha' }),
      makeNote({ id: '2', title: 'Beta' }),
    ];
    const result = buildGraph(notes);

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '1', title: 'Alpha', type: 'note', linkCount: 0 }),
        expect.objectContaining({ id: '2', title: 'Beta', type: 'note', linkCount: 0 }),
      ]),
    );
    expect(result.links).toHaveLength(0);
  });

  it('creates links between notes via outgoingLinks', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Beta')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({ id: '2', title: 'Beta' }),
    ];
    const result = buildGraph(notes);

    expect(result.nodes).toHaveLength(2);
    expect(result.links).toHaveLength(1);
    expect(linkSourceTarget(result.links[0])).toEqual({ source: '1', target: '2' });

    const alpha = result.nodes.find(n => n.id === '1')!;
    const beta = result.nodes.find(n => n.id === '2')!;
    expect(alpha.linkCount).toBe(1);
    expect(beta.linkCount).toBe(1);
  });

  it('creates unresolved nodes for links to non-existent notes', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('NonExistent')],
          blockIds: [],
          inlineTags: [],
        },
      }),
    ];
    const result = buildGraph(notes);

    expect(result.nodes).toHaveLength(2);
    const unresolved = result.nodes.find(n => n.type === 'unresolved')!;
    expect(unresolved).toBeDefined();
    expect(unresolved.id).toBe('unresolved-NonExistent');
    expect(unresolved.title).toBe('NonExistent');
    expect(unresolved.linkCount).toBe(1);

    expect(result.links).toHaveLength(1);
    expect(linkSourceTarget(result.links[0])).toEqual({ source: '1', target: 'unresolved-NonExistent' });
  });

  it('resolves link targets case-insensitively', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('BETA')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({ id: '2', title: 'Beta' }),
    ];
    const result = buildGraph(notes);

    // Should resolve to Beta note, not create unresolved node
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.every(n => n.type === 'note')).toBe(true);
    expect(linkSourceTarget(result.links[0])).toEqual({ source: '1', target: '2' });
  });

  it('handles bidirectional links between two notes', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Beta')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({
        id: '2',
        title: 'Beta',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Alpha')],
          blockIds: [],
          inlineTags: [],
        },
      }),
    ];
    const result = buildGraph(notes);

    expect(result.nodes).toHaveLength(2);
    expect(result.links).toHaveLength(2);

    const linkPairs = result.links.map(linkSourceTarget);
    expect(linkPairs).toContainEqual({ source: '1', target: '2' });
    expect(linkPairs).toContainEqual({ source: '2', target: '1' });

    const alpha = result.nodes.find(n => n.id === '1')!;
    const beta = result.nodes.find(n => n.id === '2')!;
    // Each note is source once and target once = linkCount 2
    expect(alpha.linkCount).toBe(2);
    expect(beta.linkCount).toBe(2);
  });

  it('handles self-referencing links', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Alpha')],
          blockIds: [],
          inlineTags: [],
        },
      }),
    ];
    const result = buildGraph(notes);

    expect(result.nodes).toHaveLength(1);
    expect(result.links).toHaveLength(1);
    expect(linkSourceTarget(result.links[0])).toEqual({ source: '1', target: '1' });

    // Self-link increments linkCount twice (once as source, once as target)
    expect(result.nodes[0].linkCount).toBe(2);
  });

  it('handles notes with no content and no metadata outgoingLinks', () => {
    const notes = [
      makeNote({ id: '1', title: 'Empty', content: '' }),
    ];
    const result = buildGraph(notes);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({ id: '1', title: 'Empty', type: 'note', linkCount: 0 });
    expect(result.links).toHaveLength(0);
  });

  it('handles orphan notes among connected notes', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Beta')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({ id: '2', title: 'Beta' }),
      makeNote({ id: '3', title: 'Orphan' }),
    ];
    const result = buildGraph(notes);

    expect(result.nodes).toHaveLength(3);
    const orphan = result.nodes.find(n => n.id === '3')!;
    expect(orphan.linkCount).toBe(0);
    expect(result.links).toHaveLength(1);
  });

  it('handles multiple outgoing links from one note', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Hub',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('A'), makeLink('B'), makeLink('C')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({ id: '2', title: 'A' }),
      makeNote({ id: '3', title: 'B' }),
      makeNote({ id: '4', title: 'C' }),
    ];
    const result = buildGraph(notes);

    expect(result.nodes).toHaveLength(4);
    expect(result.links).toHaveLength(3);

    const hub = result.nodes.find(n => n.id === '1')!;
    expect(hub.linkCount).toBe(3);
  });

  it('deduplicates unresolved nodes when multiple notes link to same missing target', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Missing')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({
        id: '2',
        title: 'Beta',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Missing')],
          blockIds: [],
          inlineTags: [],
        },
      }),
    ];
    const result = buildGraph(notes);

    // Only one unresolved node should be created
    const unresolvedNodes = result.nodes.filter(n => n.type === 'unresolved');
    expect(unresolvedNodes).toHaveLength(1);
    expect(unresolvedNodes[0].linkCount).toBe(2);

    expect(result.links).toHaveLength(2);
  });
});

describe('buildLocalGraph', () => {
  it('returns empty graph when activeNoteId does not exist', () => {
    const notes = [makeNote({ id: '1', title: 'Alpha' })];
    const result = buildLocalGraph(notes, 'nonexistent');
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it('returns only the active note when it has no connections', () => {
    const notes = [
      makeNote({ id: '1', title: 'Alpha' }),
      makeNote({ id: '2', title: 'Beta' }),
    ];
    const result = buildLocalGraph(notes, '1');

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('1');
    expect(result.links).toHaveLength(0);
  });

  it('includes outgoing link targets at depth 1', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Beta')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({ id: '2', title: 'Beta' }),
      makeNote({ id: '3', title: 'Gamma' }),
    ];
    const result = buildLocalGraph(notes, '1');

    expect(result.nodes).toHaveLength(2);
    const nodeIds = result.nodes.map(n => n.id);
    expect(nodeIds).toContain('1');
    expect(nodeIds).toContain('2');
    expect(nodeIds).not.toContain('3');
  });

  it('includes backlinks (incoming links) at depth 1', () => {
    const notes = [
      makeNote({ id: '1', title: 'Alpha' }),
      makeNote({
        id: '2',
        title: 'Beta',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Alpha')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({ id: '3', title: 'Gamma' }),
    ];
    const result = buildLocalGraph(notes, '1');

    expect(result.nodes).toHaveLength(2);
    const nodeIds = result.nodes.map(n => n.id);
    expect(nodeIds).toContain('1');
    expect(nodeIds).toContain('2');
  });

  it('respects depth parameter for multi-hop traversal', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Beta')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({
        id: '2',
        title: 'Beta',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Gamma')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({ id: '3', title: 'Gamma' }),
      makeNote({ id: '4', title: 'Delta' }),
    ];

    // Depth 1: only Alpha and Beta
    const depth1 = buildLocalGraph(notes, '1', 1);
    const depth1Ids = depth1.nodes.map(n => n.id);
    expect(depth1Ids).toContain('1');
    expect(depth1Ids).toContain('2');
    expect(depth1Ids).not.toContain('3');

    // Depth 2: Alpha, Beta, and Gamma
    const depth2 = buildLocalGraph(notes, '1', 2);
    const depth2Ids = depth2.nodes.map(n => n.id);
    expect(depth2Ids).toContain('1');
    expect(depth2Ids).toContain('2');
    expect(depth2Ids).toContain('3');
    expect(depth2Ids).not.toContain('4');
  });

  it('includes unresolved nodes for missing link targets', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Missing')],
          blockIds: [],
          inlineTags: [],
        },
      }),
    ];
    const result = buildLocalGraph(notes, '1');

    expect(result.nodes).toHaveLength(2);
    const unresolved = result.nodes.find(n => n.type === 'unresolved')!;
    expect(unresolved).toBeDefined();
    expect(unresolved.title).toBe('Missing');
  });

  it('includes links only between included nodes', () => {
    const notes = [
      makeNote({
        id: '1',
        title: 'Alpha',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Beta')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({
        id: '2',
        title: 'Beta',
        metadata: {
          wordCount: 0,
          headings: [],
          outgoingLinks: [makeLink('Gamma')],
          blockIds: [],
          inlineTags: [],
        },
      }),
      makeNote({ id: '3', title: 'Gamma' }),
    ];

    // Depth 1 from Alpha: includes Alpha and Beta, but not Gamma
    const result = buildLocalGraph(notes, '1', 1);
    const linkPairs = result.links.map(linkSourceTarget);

    // Alpha -> Beta should be present
    expect(linkPairs).toContainEqual({ source: '1', target: '2' });
    // Beta -> Gamma should NOT be present (Gamma is not included)
    expect(linkPairs).not.toContainEqual({ source: '2', target: '3' });
  });

  it('handles empty notes array', () => {
    const result = buildLocalGraph([], '1');
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });
});
