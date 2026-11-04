import { useEffect, useRef } from 'react';
import { trackTaskView } from './taskAnalytics';

/** 仅在容器实际由关闭变为打开时记录；StrictMode重复effect不增加曝光。 */
export function useTaskAnalyticsView(open: boolean, action: Parameters<typeof trackTaskView>[0]) {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) trackTaskView(action);
    wasOpen.current = open;
  }, [open, action]);
}
