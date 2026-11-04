import { useEffect, useRef, useState } from 'react';

/** 当前查询与结果绑定，查询变化或卸载后旧响应不能回写，也不能导出旧范围数据。 */
export function useBatchResource<T>(key: string, enabled: boolean, load: () => Promise<T>) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const [state, setState] = useState<{ key: string; data?: T; error?: string; loading: boolean }>({ key: '', loading: false });

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setState({ key, loading: false });
      return;
    }
    setState({ key, loading: true });
    Promise.resolve().then(() => loadRef.current()).then(
      (data) => { if (!cancelled) setState({ key, data, loading: false }); },
      (error) => { if (!cancelled) setState({ key, error: error instanceof Error ? error.message : '加载失败，请重试', loading: false }); },
    );
    return () => { cancelled = true; };
  }, [key, enabled]);

  return enabled && state.key === key ? state : { key, loading: enabled, data: undefined, error: undefined };
}
