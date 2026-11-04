import { useCallback, useEffect, useRef, useState } from 'react';

type QueryState<T> = { key: string; status: 'idle' | 'loading' | 'success' | 'error'; data?: T };

/** 筛选、租户、批次变化时立即隔离旧数据；同范围也只接收最后一次请求（含翻页）。 */
export function useTaskQuery<T>(key: string) {
  const activeKey = useRef(key);
  activeKey.current = key;
  const sequence = useRef(0);
  const [state, setState] = useState<QueryState<T>>({ key, status: 'idle' });

  useEffect(() => () => { sequence.current += 1; }, [key]);

  const run = useCallback(async (load: () => Promise<T>) => {
    const request = ++sequence.current;
    const isCurrent = () => request === sequence.current && activeKey.current === key;
    setState({ key, status: 'loading' });
    try {
      const data = await load();
      if (data == null) throw new Error('接口未返回数据');
      if (isCurrent()) setState({ key, status: 'success', data });
    } catch {
      if (isCurrent()) setState({ key, status: 'error' });
    }
  }, [key]);

  const current: QueryState<T> = state.key === key ? state : { key, status: 'idle' as const };
  return { data: current.data, loading: current.status === 'loading' || current.status === 'idle',
    error: current.status === 'error', run };
}
