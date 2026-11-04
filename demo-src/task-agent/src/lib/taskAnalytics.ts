// Offline demo: preserve UI callbacks without loading analytics, identifiers or SDKs.
export type TaskAnalyticsContext = Record<string, any>;
export function trackTaskAction(..._args: any[]): void {}
export function trackTaskView(..._args: any[]): void {}
export function captureTaskView(_context?: TaskAnalyticsContext): (...args: any[]) => void { return () => {}; }
