import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Collapse, Empty, Input, Select, Space, Spin, Table, Typography, message } from 'antd';
import { CaretDownOutlined, CaretUpOutlined, DownOutlined, SearchOutlined, TableOutlined, UpOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { bdTaskApi } from '@/services/bdTaskApi';
import { batchExecutionApi } from '@/services/batchExecutionApi';
import { useTenantStore } from '@/stores/tenantStore';
import type { BatchColumn, BatchMatrixReq, BatchMatrixRow, BatchPeriod, BatchScope, MatrixOrgType } from '@/types/batchExecution';
import { MT } from '../../theme';
import PersonName from '../../components/PersonName';
import SortTabs from '../../components/SortTabs';
import InfoTooltip from './InfoTooltip';
import BatchOrgSelector from './BatchOrgSelector';
import type { OrgNode } from '../hooks/useOrgTree';
import { useBatchResource } from '../hooks/useBatchResource';
import { BATCH_PERIODS, buildMatrixCsv, describeMatrixMetric, describeBatchTarget, getMatrixTargetStatus, getMatrixMetric, hasVisibleMatrixValue, getMatrixRowOptions, indexMatrixCells, compareMatrixRates } from '../utils/batchExecution';

const { Text } = Typography;
const MAX_BATCHES = 50;
const BATCH_FILTER_FONT_SIZE = 14;
const BATCH_ACTION_BUTTON_STYLE: React.CSSProperties = { height: 32, paddingInline: 12, fontSize: 13 };
const BATCH_FILTER_LABEL_STYLE: React.CSSProperties = { color: MT.textMuted, fontSize: BATCH_FILTER_FONT_SIZE, whiteSpace: 'nowrap' };

interface Props {
  globalOrgs: OrgNode[];
  fetchOrgChildren: (parentId: number) => Promise<OrgNode[]>;
  scope: { createTimeFrom: number; createTimeTo: number; revision: number };
}

export default function BatchExecutionDetail(props: Props) {
  const tenantId = Number(useTenantStore((state) => state.currentTenantId));
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) return null;
  return <BatchExecutionForTenant key={tenantId} {...props} tenantId={tenantId} />;
}

function BatchExecutionForTenant({ scope, tenantId, ...props }: Props & { tenantId: number }) {
  const [positionRevision, setPositionRevision] = useState(0);
  const position = useBatchResource(`batch-position:${tenantId}:${positionRevision}`, true,
    () => bdTaskApi.queryUserPositionType(tenantId));
  const [rulesRevision, setRulesRevision] = useState(0);
  // 岗位和组织规则并行加载；纯 BD 查询不等待、也不依赖组织规则结果。
  const rules = useBatchResource(`batch-rules:${tenantId}:${rulesRevision}`, true,
    async () => {
      const options = await batchExecutionApi.queryOrgOptions(tenantId);
      if (!Array.isArray(options.orgTypes)) throw new Error('组织选项响应异常，请重试');
      return options;
    });
  const selfOnly = position.data === 'BD';
  // 本人模式不随全局组织切换重置；日期、刷新和模式变化均丢弃旧结果。
  const scopeKey = `${selfOnly ? 'self' : props.globalOrgs.map((node) => node.id).join(',')}:${scope.createTimeFrom}:${scope.createTimeTo}:${scope.revision}`;
  return <BatchExecutionContent key={scopeKey} {...props}
    scope={{ tenantId, createTimeFrom: scope.createTimeFrom, createTimeTo: scope.createTimeTo }}
    orgTypes={rules.data?.orgTypes ?? []} rulesLoading={rules.loading} rulesError={rules.error}
    retryRules={() => setRulesRevision((value) => value + 1)}
    selfOnly={selfOnly} positionLoading={position.loading} positionError={position.error}
    retryPosition={() => setPositionRevision((value) => value + 1)} />;
}

function BatchExecutionContent({ scope, globalOrgs, orgTypes, fetchOrgChildren, selfOnly, positionLoading, positionError, retryPosition, rulesLoading, rulesError, retryRules }: Omit<Props, 'scope'> & {
  orgTypes: MatrixOrgType[]; rulesLoading: boolean; rulesError?: string; retryRules: () => void;
  scope: BatchScope; selfOnly: boolean; positionLoading: boolean; positionError?: string; retryPosition: () => void;
}) {
  const showOrgSelector = !selfOnly && !positionLoading;
  const [selectedOrg, setSelectedOrg] = useState<OrgNode>();
  const [rowCode, setRowCode] = useState<string>();
  // 全局选中的多个组织作为树根，局部仍单选且仅查询这些组织及其下级。
  const roots = globalOrgs;
  const org = selectedOrg ?? roots[0];
  const rowOptions = useMemo(() => org ? getMatrixRowOptions(org.orgType, orgTypes) : [], [org, orgTypes]);
  const rowOption = selfOnly ? { value: 'self', dimension: 1 as const, label: 'BD', orgTypeList: undefined }
    : rowOptions.find((option) => option.value === rowCode) ?? rowOptions[0];

  const rowControl = selfOnly ? <Text strong>BD</Text> : (
    <Select
      className="wb-batch-row-dimension-select"
      aria-label="任务批次完成数据行维度"
      value={rowOption?.value}
      options={rowOptions.map((option) => ({ ...option, label: <Text strong>{option.label}</Text> }))}
      onChange={value => { trackTaskAction('matrix.row_dimension'); setRowCode(value); }}
      disabled={rowOptions.length === 0}
      size="small"
      bordered={false}
      style={{ width: '100%' }}
    />
  );
  const orgControl = showOrgSelector ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Text style={BATCH_FILTER_LABEL_STYLE}>组织架构</Text>
      <InfoTooltip content="在顶部已选组织范围内切换当前执行明细的组织节点。" />
      <BatchOrgSelector roots={roots} value={org} fetchChildren={fetchOrgChildren} onChange={(node) => { trackTaskAction('matrix.org_select'); setSelectedOrg(node); setRowCode(undefined); }} />
    </div>
  ) : null;

  return (
    <Card
      className="v2-card analysis-batch-completion"
      style={{ minWidth: 0 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <Space size={7}>
          <span className="v2-module-icon"><TableOutlined /></span>
          <span className="v2-module-title">任务批次完成数据</span>
          <InfoTooltip content={selfOnly
            ? '展示本人未过期任务批次的执行情况，完成率＝统计周期内完成任务项数 ÷ 任务项总数。全部周期下，距离目标＝父任务目标比例－本人完成比例，达到目标显示已完成。'
            : '按所选组织节点展示未过期任务批次的执行情况，完成率＝统计周期内完成任务项数 ÷ 任务项总数。全部周期下，距离目标＝父任务目标比例－当前 BD／组织完成比例，达到目标显示已完成。'} />
        </Space>
        {orgControl}
      </div>
      {positionError && <Alert type="error" showIcon message="岗位信息加载失败" description={positionError}
        action={<Button onClick={() => { trackTaskAction('retry.matrix_position'); retryPosition(); }}>重试</Button>} />}
      {!positionLoading && !selfOnly && rulesError && <Alert type="error" showIcon message="组织规则加载失败" description={rulesError}
        action={<Button onClick={() => { trackTaskAction('retry.matrix_rules'); retryRules(); }}>重试</Button>} />}
      {positionLoading || (!selfOnly && rulesLoading) ? <BatchLoading /> : !selfOnly && rulesError ? (
        null
      ) : !rowOption ? (
        <Empty description={org ? '当前组织暂无可用的查询维度，请选择下级组织' : '请先选择全局组织架构'} />
      ) : (
        <BatchMatrixContent
          key={`${selfOnly ? 'self' : org?.id}`}
          scope={scope}
          orgId={selfOnly ? undefined : org?.id}
          dimension={rowOption.dimension}
          orgTypeList={rowOption.orgTypeList}
          rowLabel={rowOption.label}
          rowControl={rowControl}
        />
      )}
    </Card>
  );
}

function BatchLoading() {
  return <div role="status" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '40px 0' }}>
    <Spin size="small" /><Text type="secondary">数据加载中</Text>
  </div>;
}

function BatchMatrixContent({ scope, orgId, dimension, orgTypeList, rowLabel, rowControl }: {
  scope: BatchScope; orgId?: number; dimension: 1 | 2; orgTypeList?: number[]; rowLabel: string;
  rowControl: React.ReactNode;
}) {
  const [revision, setRevision] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [queryRevision, setQueryRevision] = useState(0);
  const [period, setPeriod] = useState<BatchPeriod>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<{ id: number; order: 'ascend' | 'descend' }>();
  const candidates = useBatchResource(`columns:${revision}`, true, async () => {
    const response = await batchExecutionApi.queryColumns(scope, orgId === undefined ? undefined : [orgId]);
    if (!Array.isArray(response.availableColumns)) throw new Error('批次列表响应异常，请重试');
    return response.availableColumns;
  });
  const candidateMap = useMemo(() => new Map((candidates.data ?? []).map((column) => [column.parentTaskId, column])), [candidates.data]);
  const validIds = selectedIds.filter((id) => candidateMap.has(id));
  const periods = useMemo(() => Object.fromEntries(validIds.map((id) => [id, period])), [validIds, period]);
  const request: BatchMatrixReq = {
    tenantId: scope.tenantId,
    createTimeFrom: scope.createTimeFrom,
    createTimeTo: scope.createTimeTo,
    ...(orgId === undefined ? {} : { orgNodeIds: [orgId] }),
    dimension,
    parentTaskIds: validIds,
    ...(dimension === 2 && orgTypeList?.length ? { orgTypeList } : {}),
  };
  const queryKey = JSON.stringify([request, revision, queryRevision]);
  const matrix = useBatchResource(queryKey, validIds.length > 0 && !!candidates.data, async () => {
    const result = await batchExecutionApi.queryMatrix(request);
    if (!Array.isArray(result.rows) || !Array.isArray(result.columns)) throw new Error('明细响应异常，请重试');
    return result;
  });
  const baseCells = useMemo(() => indexMatrixCells(matrix.data), [matrix.data]);
  const sourceGroups = useMemo(() => {
    const groups = new Map<number, { name: string; columns: BatchColumn[] }>();
    (candidates.data ?? []).forEach((column) => {
      if (!groups.has(column.sourceGroup)) groups.set(column.sourceGroup, { name: column.sourceGroupName, columns: [] });
      groups.get(column.sourceGroup)!.columns.push(column);
    });
    return groups;
  }, [candidates.data]);

  const sortedRows = useMemo(() => {
    const allRows = matrix.data?.rows ?? [];
    const rows = allRows.filter((row) => hasVisibleMatrixValue(row,
      (matrix.data?.columns ?? []).map((column) => column.parentTaskId), period));
    if (!sort) return rows;
    const rate = (row: BatchMatrixRow) => getMatrixMetric(baseCells.get(row.rowKey)?.get(sort.id), period)?.rate;
    return [...rows].sort((a, b) => compareMatrixRates(rate(a), rate(b), sort.order));
  }, [matrix.data, sort, period, baseCells]);

  const updateSelected = (ids: number[]) => {
    if (ids.length > MAX_BATCHES) {
      message.warning({ content: `已达到可选上限，最多可选 ${MAX_BATCHES} 个任务批次`, key: 'batch-selection-limit' });
      return;
    }
    setSelectedIds(ids);
    if (sort && !ids.includes(sort.id)) setSort(undefined);
    setPage(1);
  };
  const columns = useMemo<ColumnsType<BatchMatrixRow>>(() => {
    const groups = new Map<number, { title: string; className: string; children: ColumnsType<BatchMatrixRow> }>();
    (matrix.data?.columns ?? []).forEach((column) => {
      if (!groups.has(column.sourceGroup)) {
        const tone = groups.size % 2 === 0 ? 'light' : 'dark';
        groups.set(column.sourceGroup, {
          title: column.sourceGroupName,
          className: `wb-batch-source-tone-${tone}`,
          children: [],
        });
      }
      const group = groups.get(column.sourceGroup)!;
      group.children.push({
        key: column.parentTaskId,
        className: group.className,
        width: 230,
        align: 'left',
        onHeaderCell: () => ({
          'aria-sort': sort?.id !== column.parentTaskId ? 'none' : sort.order === 'ascend' ? 'ascending' : 'descending',
        }),
        title: (
          <div className="wb-batch-sort-header">
            <div className="wb-batch-target-content">
              <Text
                ellipsis={{ tooltip: {
                  title: column.parentTaskName,
                  overlayStyle: { maxWidth: 'min(600px, calc(100vw - 32px))' },
                  overlayInnerStyle: { whiteSpace: 'normal', wordBreak: 'break-all', overflowWrap: 'anywhere' },
                } }}
                title={undefined}
                style={{ width: '100%', color: MT.textPrimary }}
              >{column.parentTaskName}</Text>
              {period === 'all' && <Text style={{ color: MT.textMuted, fontSize: 12, fontWeight: 400 }}>目标值：{describeBatchTarget(column.target)}</Text>}
            </div>
            <Button
              type="text"
              className="wb-batch-sort-button"
              aria-label={`${column.parentTaskName}：${sort?.id !== column.parentTaskId ? '按完成率降序排序' : sort.order === 'descend' ? '按完成率升序排序' : '取消排序'}`}
              onClick={() => {
                trackTaskAction('matrix.sort');
                setSort(sort?.id !== column.parentTaskId ? { id: column.parentTaskId, order: 'descend' }
                  : sort.order === 'descend' ? { id: column.parentTaskId, order: 'ascend' } : undefined);
                setPage(1);
              }}
            >
              <span className="wb-batch-sort-arrows" style={{ color: MT.clickArrow }}>
                <CaretUpOutlined style={sort?.id === column.parentTaskId && sort.order === 'ascend' ? { color: MT.brandPrimary } : undefined} />
                <CaretDownOutlined style={sort?.id === column.parentTaskId && sort.order === 'descend' ? { color: MT.brandPrimary } : undefined} />
              </span>
            </Button>
          </div>
        ),
        onCell: (row) => {
          const metric = getMatrixMetric(baseCells.get(row.rowKey)?.get(column.parentTaskId), period);
          const status = getMatrixTargetStatus(column.target, metric, period);
          return { className: status ? status.achieved ? 'wb-batch-target-achieved' : 'wb-batch-target-pending' : '' };
        },
        render: (_, row) => {
          const period = periods[column.parentTaskId] ?? 'all';
          const metric = getMatrixMetric(baseCells.get(row.rowKey)?.get(column.parentTaskId), period);
          const status = getMatrixTargetStatus(column.target, metric, period);
          return <div className="wb-batch-target-content">
            <Text style={{ color: MT.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{describeMatrixMetric(metric)}</Text>
            {status && <Text style={{ color: MT.textMuted, fontSize: 12 }}>{status.text}</Text>}
          </div>;
        },
      });
    });
    return [{
      title: rowControl, key: 'name', fixed: 'left', width: 160,
      render: (_, row) => <Text strong>{row.bdMis ? <PersonName name={row.displayName} mis={row.bdMis} /> : row.displayName}</Text>,
    }, ...Array.from(groups.entries()).map(([key, group]) => ({
      key: `source-${key}`,
      ...group,
      title: <span className="wb-batch-source-title">{group.title}</span>,
      align: 'left' as const,
    }))];
  }, [matrix.data, period, periods, baseCells, rowControl, sort]);

  const exportCsv = () => {
    if (!matrix.data || matrix.loading) return;
    // 与分组表头一致：同来源列连续排列，导出不受表格分页影响。
    const grouped = Array.from(new Set(matrix.data.columns.map((column) => column.sourceGroup)))
      .flatMap((sourceGroup) => matrix.data!.columns.filter((column) => column.sourceGroup === sourceGroup));
    const csv = buildMatrixCsv({ ...matrix.data, columns: grouped, rows: sortedRows }, periods, rowLabel);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `任务批次完成数据_${rowLabel}_${matrix.data.businessDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const retry = () => setRevision((value) => value + 1);
  const clearSelected = () => {
    updateSelected([]);
    setSort(undefined);
  };

  const toolbar = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <Space size={12} wrap>
        <Text style={{ ...BATCH_FILTER_LABEL_STYLE, color: '#222222' }}>选择任务批次</Text>
        <Input aria-label="搜索任务批次" placeholder="搜索批次名称或 ID" prefix={<SearchOutlined style={{ color: MT.textMuted }} />} allowClear value={search} onChange={(event) => setSearch(event.target.value)} onBlur={event => { if (event.target.value !== event.target.dataset.trackingInitial) trackTaskAction('matrix.batch_search'); }} onFocus={event => { event.target.dataset.trackingInitial = event.target.value; }} style={{ width: 230 }} disabled={candidates.loading || !!candidates.error} />
        <Text style={{ color: MT.textMuted, fontSize: BATCH_FILTER_FONT_SIZE, whiteSpace: 'nowrap' }}>已选 {validIds.length}/{candidateMap.size}</Text>
        <Button style={BATCH_ACTION_BUTTON_STYLE} disabled={!validIds.length} onClick={() => { trackTaskAction('matrix.clear_selected'); clearSelected(); }}>清空已选</Button>
      </Space>
    </div>
  );

  if (candidates.loading) return <>{toolbar}<BatchLoading /></>;
  if (candidates.error) return <>{toolbar}<Alert type="error" showIcon message="任务批次加载失败" description={candidates.error} action={<Button onClick={() => { trackTaskAction('retry.matrix_candidates'); retry(); }}>重试</Button>} /></>;

  return (
    <>
      {toolbar}
      <div className="wb-batch-source-selector wb-soft-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', alignItems: 'flex-start' }}>
        {Array.from(sourceGroups.entries()).map(([key, group]) => {
          const items = group.columns.filter((column) => `${column.parentTaskName} ${column.parentTaskId}`.toLowerCase().includes(search.trim().toLowerCase()));
          const selectedCount = group.columns.filter((column) => validIds.includes(column.parentTaskId)).length;
          const visibleIds = new Set(items.map((column) => column.parentTaskId));
          const visibleSelectedCount = validIds.filter((id) => visibleIds.has(id)).length;
          const selectAll = (
            <Checkbox
              aria-label={`${group.name}${search.trim() ? '全选搜索结果' : '全选'}`}
              disabled={!items.length}
              checked={items.length > 0 && visibleSelectedCount === items.length}
              indeterminate={visibleSelectedCount > 0 && visibleSelectedCount < items.length}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                trackTaskAction('matrix.select_group');
                if (event.target.checked && validIds.length === 0) {
                  updateSelected([...visibleIds].slice(0, MAX_BATCHES));
                  if (visibleIds.size > MAX_BATCHES) {
                    message.warning({ content: `已达到可选上限，最多可选 ${MAX_BATCHES} 个任务批次`, key: 'batch-selection-limit' });
                  }
                  return;
                }
                updateSelected(event.target.checked
                  ? [...new Set([...validIds, ...visibleIds])]
                  : validIds.filter((id) => !visibleIds.has(id)));
              }}
            />
          );
          return {
            key: String(key),
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {selectAll}
                <span style={{ fontWeight: 600 }}>{group.name}<span style={{ color: '#666666' }}>（{selectedCount}/{group.columns.length}）</span></span>
              </span>
            ),
            children: (
              <div role="group" aria-label={`${group.name}任务批次`} style={{ display: 'flex', flexDirection: 'column', maxHeight: 160, overflowY: 'auto', paddingInlineStart: 8 }}>
                {items.length ? items.map((column) => {
                  const checked = validIds.includes(column.parentTaskId);
                  return (
                    <Checkbox
                      key={column.parentTaskId}
                      className="wb-batch-option"
                      style={{ minWidth: 0, maxWidth: '100%', minHeight: 32, height: 32, flexShrink: 0, marginInlineStart: 0, alignItems: 'center' }}
                      checked={checked}
                      onChange={event => { trackTaskAction('matrix.select_batch'); updateSelected(event.target.checked ? [...validIds, column.parentTaskId] : validIds.filter(id => id !== column.parentTaskId)); }}
                    >
                      <Text
                        ellipsis={{ tooltip: { title: column.parentTaskName, color: '#1F1F1F', placement: 'top' } }}
                        style={{ display: 'block', minWidth: 0, maxWidth: '100%' }}
                      >{column.parentTaskName}</Text>
                    </Checkbox>
                  );
                }) : <Text type="secondary">没有匹配的任务批次</Text>}
              </div>
            ),
          };
        }).map((item) => (
          <Collapse
            key={item.key}
            defaultActiveKey={[item.key]}
            size="small"
            expandIconPosition="end"
            expandIcon={({ isActive }) => (
              <span style={{ display: 'inline-flex', alignItems: 'center', color: MT.textMuted, fontSize: BATCH_FILTER_FONT_SIZE }}>
                {isActive ? <UpOutlined aria-label="收起任务选项" /> : <DownOutlined aria-label="展开任务选项" />}
              </span>
            )}
            items={[item]}
            style={{ flex: '1 0 260px', minWidth: 0 }}
          />
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
          <Space size={9} wrap>
            <Text style={{ color: MT.textMuted, whiteSpace: 'nowrap' }}>任务完成周期</Text>
            <SortTabs value={period} options={BATCH_PERIODS} onChange={(value) => { trackTaskAction('matrix.period'); setPeriod(value); setPage(1); }} />
          </Space>
          <Button style={BATCH_ACTION_BUTTON_STYLE} disabled={!sortedRows.length || matrix.loading || !!matrix.error} onClick={() => { trackTaskAction('matrix.export'); exportCsv(); }}>导出</Button>
        </div>
        {matrix.error ? (
          <Alert type="error" showIcon message="任务批次完成数据加载失败" description={matrix.error} action={<Button onClick={() => { trackTaskAction('retry.matrix_data'); setQueryRevision(value => value + 1); }}>重试</Button>} />
        ) : (
          <>
            <Table<BatchMatrixRow>
              className="wb-batch-matrix-table wb-soft-scrollbar"
              style={{ '--wb-batch-target-success-bg': MT.successBg, '--wb-batch-target-pending-bg': MT.dangerBg } as React.CSSProperties}
              bordered
              rowKey="rowKey"
              columns={columns}
              dataSource={sortedRows}
              loading={matrix.loading}
              size="small"
              scroll={{ x: Math.max(620, 160 + validIds.length * 230) }}
              locale={{ emptyText: <Empty description={!candidates.data?.length ? '当前组织及创建日期范围内暂无未过期任务批次' : validIds.length === 0 ? '请选择任务批次' : '当前范围暂无执行明细'} /> }}
              pagination={{ current: Math.min(page, Math.max(1, Math.ceil(sortedRows.length / pageSize))), pageSize, onChange: (nextPage, size) => { trackTaskAction('matrix.page'); setPage(size === pageSize ? nextPage : 1); setPageSize(size); }, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
            />
          </>
        )}
      </div>
    </>
  );
}
