import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

export interface AsyncCardState<T> {
  data: T | undefined;
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

/**
 * 通用的"独立加载态"封装：保证单个卡片失败不影响其余卡片渲染（Requirement 10.1/10.2）。
 * @param fetcher 返回 Promise<T> 的请求函数
 * @param deps 依赖数组，变化时自动重新请求（仅当 enabled=true）
 * @param enabled 是否允许发起请求；false 时不请求、清空 loading/error，data 保持 undefined
 */
export function useAsyncCard<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList,
  enabled: boolean,
): AsyncCardState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // 用递增 token 防止竞态：仅最新一次请求的结果生效
  const tokenRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(() => {
    if (!enabled) {
      setData(undefined);
      setLoading(false);
      setError(false);
      return;
    }
    const myToken = ++tokenRef.current;
    setLoading(true);
    setError(false);
    fetcherRef.current()
      .then((result) => {
        if (tokenRef.current !== myToken) return;
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (tokenRef.current !== myToken) return;
        setError(true);
        setLoading(false);
      });
  }, [enabled]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const refetch = useCallback(() => {
    run();
  }, [run]);

  return { data, loading, error, refetch };
}
