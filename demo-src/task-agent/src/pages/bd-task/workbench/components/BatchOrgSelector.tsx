import React, { useEffect, useState } from 'react';
import { TreeSelect, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { OrgNode } from '../hooks/useOrgTree';

interface Props {
  ariaLabel?: string;
  roots: OrgNode[];
  value?: OrgNode;
  onChange: (node: OrgNode) => void;
  fetchChildren: (parentId: number) => Promise<OrgNode[]>;
}

// 沿用当前组织 TreeSelect 的懒加载、名称搜索和错误重试方式，限定为单节点。
export default function BatchOrgSelector({ roots, value, onChange, fetchChildren, ariaLabel = '任务批次完成数据组织架构' }: Props) {
  const [tree, setTree] = useState<DataNode[]>([]);
  const [nodes, setNodes] = useState<Map<number, OrgNode>>(new Map());
  const toDataNode = (node: OrgNode): DataNode => ({
    key: node.id,
    value: node.id,
    title: node.name,
    isLeaf: node.isLeaf,
  } as DataNode);

  useEffect(() => {
    setTree(roots.map((node) => ({
      key: node.id, value: node.id, title: node.name, isLeaf: node.isLeaf,
    })));
    setNodes(new Map(roots.map((node) => [node.id, node])));
  }, [roots]);

  return (
    <TreeSelect
      aria-label={ariaLabel}
      placeholder="请选择组织节点"
      size="small"
      labelInValue
      value={value ? { value: value.id, label: value.name } : undefined}
      treeData={tree}
      showSearch
      treeNodeFilterProp="title"
      style={{ width: 280, color: '#222222' }}
      dropdownStyle={{ color: '#222222' }}
      listHeight={280}
      onChange={(selected: { value: number; label?: React.ReactNode }) => {
        const node = nodes.get(selected.value);
        if (node) onChange(node);
      }}
      loadData={async (node) => {
        try {
          const children = await fetchChildren(Number(node.key));
          setNodes((previous) => new Map([...previous, ...children.map((child): [number, OrgNode] => [child.id, child])]));
          const append = (items: DataNode[]): DataNode[] => items.map((item) =>
            item.key === node.key
              ? { ...item, children: children.map(toDataNode), isLeaf: children.length === 0 }
              : { ...item, children: item.children ? append(item.children) : undefined },
          );
          setTree(append);
        } catch (error) {
          message.error('组织加载失败，请重新展开重试');
          throw error;
        }
      }}
    />
  );
}
