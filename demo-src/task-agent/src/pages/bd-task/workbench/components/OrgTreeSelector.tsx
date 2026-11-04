import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useState, useEffect, useRef } from 'react';
import { TreeSelect, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { MT } from '../../theme';
import type { OrgNode } from '../hooks/useOrgTree';
import { useTenantStore } from '@/stores/tenantStore';

interface OrgTreeSelectorProps {
  value: number[];
  onChange: (orgIds: number[]) => void;
  /** 拉取子节点列表的函数（parentId -> children） */
  fetchOrgChildren: (parentId: number) => Promise<OrgNode[]>;
  /** 按 orgId 获取节点信息（从缓存） */
  fetchOrgNodeById: (orgId: number) => OrgNode | undefined;
  /** 获取节点到根的路径（用于回显选中节点名称） */
  getNodePath: (orgId: number) => OrgNode[];
  /** 搜索接口 URL（保留兼容，antd TreeSelect 使用前端搜索） */
  searchParams?: { pageUrl: string; tenantId: number | string | null; wmOrgBoxAuth: { authCode: string } };
  style?: React.CSSProperties;
}

/**
 * 将 OrgNode 转为 antd TreeSelect 的 DataNode。
 * 异步加载的节点默认 isLeaf=false（有 childrenList 或 isLeaf=true 时才为叶子）。
 */
function toDataNode(node: OrgNode, loadedIds: Set<number>): DataNode {
  const isLeaf = node.isLeaf === true || (node.childrenList !== undefined && node.childrenList !== null && node.childrenList.length === 0);
  const hasLoaded = loadedIds.has(node.id);
  return {
    key: node.id,
    value: node.id,
    title: node.name,
    isLeaf: isLeaf && !hasLoaded ? true : !isLeaf ? false : true,
    // 保留原始节点信息，供 disabled 判断等使用
  } as DataNode;
}

/**
 * 组织架构树形多选下拉组件：基于 antd TreeSelect 实现，支持懒加载子节点与选中值回显。
 *
 * - 初始加载顶级节点（parentId=0）
 * - 展开节点时通过 loadData 异步拉取子节点
 * - 选中值变化时通过 getNodePath 回溯路径，从缓存中获取节点名称用于回显
 * - 顶层拉取失败时展示"加载失败，点击重试"
 * - 租户未就绪时展示"加载中"，避免带 tenantId=null 发出请求
 */
const OrgTreeSelector: React.FC<OrgTreeSelectorProps> = ({
  value,
  onChange,
  fetchOrgChildren,
  fetchOrgNodeById,
  getNodePath,
  style,
}) => {
  const currentTenantId = useTenantStore((s) => s.currentTenantId);
  const [topLevelError, setTopLevelError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedIds, setLoadedIds] = useState<Set<number>>(new Set());
  // orgId -> name 的缓存，用于回显
  const nameCacheRef = useRef<Map<number, string>>(new Map());

  const tenantPending = currentTenantId === null || currentTenantId === undefined;

  // 初始加载顶级节点
  useEffect(() => {
    if (tenantPending) return;
    let cancelled = false;
    setLoading(true);
    setTopLevelError(false);
    fetchOrgChildren(0)
      .then((nodes) => {
        if (cancelled) return;
        nodes.forEach((n) => nameCacheRef.current.set(n.id, n.name));
        setLoadedIds((prev) => {
          const next = new Set(prev);
          nodes.forEach((n) => next.add(n.id));
          return next;
        });
        setTreeData(nodes.map((n) => toDataNode(n, new Set())));
      })
      .catch(() => {
        if (!cancelled) setTopLevelError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantPending, retryKey]);

  // 回显选中节点名称：value 变化时，从缓存路径中获取名称
  useEffect(() => {
    if (!value || value.length === 0) return;
    value.forEach((id) => {
      if (!nameCacheRef.current.has(id)) {
        const path = getNodePath(id);
        path.forEach((n) => nameCacheRef.current.set(n.id, n.name));
      }
    });
  }, [value, getNodePath]);

  const handleRetry = () => {
    trackTaskAction('retry.org_tree');
    setRetryKey((k) => k + 1);
  };

  if (topLevelError) {
    return (
      <div
        onClick={handleRetry}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 8,
          border: `1px solid ${MT.dangerBorder}`,
          background: MT.dangerBg,
          color: MT.danger,
          fontSize: 13,
          cursor: 'pointer',
          ...style,
        }}
      >
        <ReloadOutlined />
        组织架构加载失败，点击重试
      </div>
    );
  }

  if (tenantPending) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          minWidth: 260,
          height: 32,
          padding: '4px 12px',
          borderRadius: 8,
          border: `1px solid ${MT.cardBorder}`,
          color: MT.textMuted,
          fontSize: 13,
          ...style,
        }}
      >
        加载中...
      </div>
    );
  }

  return (
    <TreeSelect
      key={retryKey}
      style={{ minWidth: 260, ...style }}
      value={value}
      onChange={(val) => onChange(val as number[])}
      multiple
      treeCheckable
      treeCheckStrictly={false}
      showSearch
      treeDefaultExpandAll={false}
      placeholder="请选择组织架构"
      allowClear
      treeData={treeData}
      loadData={async (node) => {
        const parentId = node.key as number;
        try {
          const children = await fetchOrgChildren(parentId);
          children.forEach((n) => nameCacheRef.current.set(n.id, n.name));
          setLoadedIds((prev) => {
            const next = new Set(prev);
            children.forEach((n) => next.add(n.id));
            return next;
          });
          // 将子节点挂载到树中
          setTreeData((prev) => {
            const updateChildren = (nodes: DataNode[]): DataNode[] =>
              nodes.map((n) => {
                if (n.key === parentId) {
                  return { ...n, children: children.map((c) => toDataNode(c, loadedIds)), isLeaf: children.length === 0 };
                }
                if (n.children) {
                  return { ...n, children: updateChildren(n.children) };
                }
                return n;
              });
            return updateChildren(prev);
          });
        } catch {
          // 静默失败，节点保持未展开状态
        }
      }}
      notFoundContent={loading ? <Spin size="small" /> : '暂无数据'}
      treeNodeFilterProp="title"
      listHeight={280}
    />
  );
};

export default OrgTreeSelector;
