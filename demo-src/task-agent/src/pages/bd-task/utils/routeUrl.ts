/** Refresh-safe URLs: keep the current static document path and change only its hash. */
export function getRouterBase(): string { return window.location.pathname; }
export function getParentTaskDetailUrl(id: number | string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = `/bd-task/${encodeURIComponent(id)}`;
  return url.href;
}
