import React from 'react';
import { Button, Spin } from 'antd';

interface Props {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/** 未加载或失败显示占位，不伪装成零。 */
export default function TaskStatsNotice({ loading, error, onRetry }: Props) {
  if (error) return <div role="alert">统计暂不可用<Button type="link" size="small" onClick={onRetry}>重试</Button></div>;
  if (loading) return <div role="status"><Spin size="small" /> 正在加载统计</div>;
  return null;
}
