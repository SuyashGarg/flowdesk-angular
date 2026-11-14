// Slice only the visible rows; clamp when a decision reduces the result count.
export function paginate<T>(items: readonly T[], requestedPage: number, pageSize: number) {
  const size = [25, 50, 100].includes(pageSize) ? pageSize : 25;
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(pageCount, Math.max(1, Math.floor(requestedPage) || 1));
  const offset = (page - 1) * size;
  return { rows: items.slice(offset, offset + size), page, pageCount,
    start: items.length ? offset + 1 : 0, end: Math.min(offset + size, items.length), total: items.length };
}
