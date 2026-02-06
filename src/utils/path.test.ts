import { describe, it, expect } from 'vitest';
import { getFileName, getParentPath, joinPath, normalizePath, slugify } from './path';

describe('getFileName', () => {
  it('returns the file name from a path', () => {
    expect(getFileName('folder/file.txt')).toBe('file.txt');
  });

  it('returns the name for a deeply nested path', () => {
    expect(getFileName('a/b/c/d')).toBe('d');
  });

  it('returns the string itself when there is no separator', () => {
    expect(getFileName('file.txt')).toBe('file.txt');
  });

  it('returns empty string for a trailing slash', () => {
    expect(getFileName('folder/')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(getFileName('')).toBe('');
  });

  it('returns empty string for root path', () => {
    expect(getFileName('/')).toBe('');
  });
});

describe('getParentPath', () => {
  it('returns the parent directory', () => {
    expect(getParentPath('folder/file.txt')).toBe('folder');
  });

  it('returns root for a top-level file', () => {
    expect(getParentPath('file.txt')).toBe('/');
  });

  it('returns the parent for a nested path', () => {
    expect(getParentPath('a/b/c')).toBe('a/b');
  });

  it('returns root for empty input', () => {
    expect(getParentPath('')).toBe('/');
  });

  it('returns parent for a trailing slash path', () => {
    expect(getParentPath('a/b/')).toBe('a/b');
  });

  it('returns root for root path', () => {
    expect(getParentPath('/')).toBe('/');
  });
});

describe('joinPath', () => {
  it('joins two simple parts', () => {
    expect(joinPath('a', 'b')).toBe('a/b');
  });

  it('joins multiple parts', () => {
    expect(joinPath('a', 'b', 'c')).toBe('a/b/c');
  });

  it('strips trailing slashes from the first part', () => {
    expect(joinPath('a/', 'b')).toBe('a/b');
  });

  it('strips leading and trailing slashes from middle parts', () => {
    expect(joinPath('a', '/b/', 'c')).toBe('a/b/c');
  });

  it('filters out empty parts', () => {
    expect(joinPath('a', '', 'b')).toBe('a/b');
  });

  it('handles a single part', () => {
    expect(joinPath('a')).toBe('a');
  });
});

describe('normalizePath', () => {
  it('collapses multiple slashes', () => {
    expect(normalizePath('a//b///c')).toBe('a/b/c');
  });

  it('removes trailing slash', () => {
    expect(normalizePath('a/b/')).toBe('a/b');
  });

  it('collapses and strips together', () => {
    expect(normalizePath('a///b//')).toBe('a/b');
  });

  it('returns root for a single slash', () => {
    expect(normalizePath('/')).toBe('/');
  });

  it('returns root for empty input', () => {
    expect(normalizePath('')).toBe('/');
  });

  it('leaves a clean path unchanged', () => {
    expect(normalizePath('a/b/c')).toBe('a/b/c');
  });
});

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('trims whitespace', () => {
    expect(slugify('  Hello World  ')).toBe('hello-world');
  });

  it('collapses multiple separators into one hyphen', () => {
    expect(slugify('a   b---c__d')).toBe('a-b-c-d');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('-hello-')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('handles strings with only special characters', () => {
    expect(slugify('!@#$%')).toBe('');
  });
});
