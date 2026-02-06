export function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || '';
}

export function getParentPath(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
}

export function joinPath(...parts: string[]): string {
  return parts
    .map((part, i) => {
      if (i === 0) return part.replace(/\/+$/, '');
      return part.replace(/^\/+|\/+$/g, '');
    })
    .filter(Boolean)
    .join('/');
}

export function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
