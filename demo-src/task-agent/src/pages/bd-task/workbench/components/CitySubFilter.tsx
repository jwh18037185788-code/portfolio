import React, { useMemo, useState, useEffect, useRef } from 'react';
import { TreeSelect, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { MT } from '../../theme';
import InfoTooltip from './InfoTooltip';
import type { OrgNode } from '../hooks/useOrgTree';
import { isSelectableCityNode } from '../hooks/useCityAnchor';

const { Text } = Typography;

interface CitySubFilterProps {
  cityOrgId: number | null;
  error: string | null;
  /** 拉取子节点列表的函数（parentId -> children），复用 useOrgTree 的同一份缓存 */
  fetchOrgChildren: (parentId: number) => Promise<OrgNode[]>;
  /** 按 orgId 获取节点信息（从缓存） */
  fetchOrgNodeById: (orgId: number) => OrgNode | undefined;
  /** 获取节点到根的路径（用于回显选中节点名称） */
  getNodePath: (orgId: number) => OrgNode[];
  /** 顶部全局筛选器已选中的 orgIds，作为城市筛选器的虚拟根节点范围 */
  rootOrgIds: number[];
  onChange: (orgId: number) => void;
}

/**
 * 将 OrgNode 转为 antd TreeSelect 的 DataNode。
 * 非城市层级的节点设 disabled=true（可展开但不可选中）。
 */
function toDataNode(node: OrgNode, loadedIds: Set<number>): DataNode {
  const isLeaf = node.isLeaf === true || (node.childrenList !== undefined && node.childrenList !== null && node.childrenList.length === 0);
  const selectable = isSelectableCityNode(node.orgType);
  return {
    key: node.id,
    value: node.id,
    title: node.name,
    isLeaf: !isLeaf ? false : true,
    disabled: !selectable,
  } as DataNode;
}

/**
 * BD 卡片内二级外卖城市筛选下拉（单选）：基于 antd TreeSelect 实现。
 *
 * - 以顶部全局筛选器已选中的 orgIds 为虚拟根节点，展示该范围内的完整组织树
 * - 通过 toDataNode 的 disabled 属性控制只有城市层级及其下一级节点可选
 * - loadData 异步懒加载子节点，复用 useOrgTree 的同一份内存缓存
 * - 选中值回显通过 getNodePath 从缓存中获取节点名称
 */
const CitySubFilter: React.FC<CitySubFilterProps> = ({
  cityOrgId,
  error,
  fetchOrgChildren,
  fetchOrgNodeById,
  getNodePath,
  rootOrgIds,
  onChange,
}) => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loadedIds, setLoadedIds] = useState<Set<number>>(new Set());
  const nameCacheRef = useRef<Map<number, string>>(new Map());

  // 初始加载虚拟根节点（rootOrgIds 对应的节点本身）
  useEffect(() => {
    if (!rootOrgIds || rootOrgIds.length === 0) {
      setTreeData([]);
      return;
    }
    const nodes = rootOrgIds
      .map((id) => fetchOrgNodeById(id))
      .filter((n): n is OrgNode => Boolean(n));
    nodes.forEach((n) => nameCacheRef.current.set(n.id, n.name));
    setLoadedIds((prev) => {
      const next = new Set(prev);
      nodes.forEach((n) => next.add(n.id));
      return next;
    });
    setTreeData(nodes.map((n) => toDataNode(n, new Set())));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rootOrgIds)]);

  // 默认城市由上级组织下钻异步计算得出。TreeSelect 的 treeData 尚未加载到该节点时，
  // 以 labelInValue 明确提供已缓存的中文名称，避免组件退化回显 orgId。
  const selectedValue = useMemo(() => {
    if (cityOrgId == null) return undefined;
    const nodePath = getNodePath(cityOrgId);
    const selectedNode = fetchOrgNodeById(cityOrgId) ?? nodePath[nodePath.length - 1];
    return { value: cityOrgId, label: selectedNode?.name ?? '正在加载组织名称…' };
  }, [cityOrgId, fetchOrgNodeById, getNodePath]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 12, color: MT.textMuted, whiteSpace: 'nowrap' }}>组织架构</Text>
      <InfoTooltip
        content="系统会根据顶部已选组织，自动定位一个可用于 BD 分析的城市范围并默认选中。如需查看其他城市或更细范围，可在此展开组织树手动切换；仅城市及其下一级组织可选，上级组织仅用于定位和展开。"
      />
      {error ? (
        <Text style={{ fontSize: 12, color: MT.danger }}>{error}</Text>
      ) : (
        <TreeSelect
          style={{ width: 280, color: '#222222' }}
          dropdownStyle={{ color: '#222222' }}
          size="small"
          labelInValue
          value={selectedValue}
          onChange={(val) => {
            const nextValue = val as { value?: number } | undefined;
            if (nextValue?.value !== undefined) onChange(nextValue.value);
          }}
          showSearch
          treeDefaultExpandAll={false}
          placeholder="请选择城市"
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
              // 静默失败
            }
          }}
          treeNodeFilterProp="title"
          listHeight={240}
        />
      )}
    </div>
  );
};

export default CitySubFilter;
