import React, { useEffect, useState } from 'react';
import { Drawer, Alert, Button, Empty, Input, Modal, Skeleton, Tag, Typography, message } from 'antd';
import { InfoCircleOutlined, RocketOutlined, AppstoreOutlined, DownOutlined, ExportOutlined, CloseOutlined } from '@ant-design/icons';
import type { BdTaskDto, ParentTaskOverviewDto } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import type { ExecutionAbilityContext } from '@/components/shop-execution/types';
import { DEMO_EXECUTION_ABILITIES, DEMO_EXECUTION_GROUPS, type DemoExecutionAbility } from '@/components/shop-execution/demoExecutionCatalog';
import { bdTaskApi } from '@/services/bdTaskApi';
import { useTenantStore } from '@/stores/tenantStore';
import { MT, MT_BTN } from '../theme';
import './shop-execution-drawer.css';

export interface ShopExecutionDrawerProps {
  open: boolean; recommendationContext?: ExecutionAbilityContext; executionTaskIds?: number[];
  ordinaryTaskIds?: number[]; ordinaryShopIds?: string[]; conditionTask?: BdTaskDto;
  communicationParentTask?: ParentTaskOverviewDto; batchExecution: boolean;
  showUnsupportedBatchAbilities?: boolean; unsupportedBatchMessage?: string;
  contactObjectType?: number; onClose: () => void; onSuccess?: () => void;
  parentTaskId?: number; shopIds?: (number | string)[];
}
const uniqueIds = (ids: (number | string)[]) => [...new Set(ids.map(String).map(id => id.trim()).filter(Boolean))];
const defaultUnsupported = '不支持批量执行，请前往任务详情页依次执行各商家任务';
function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <h3 className="execution-demo-section-title"><span style={{ color: MT.brandPrimary }}>{icon}</span>{children}</h3>;
}

export default function ShopExecutionDrawer({ open, onClose, batchExecution, shopIds, parentTaskId, communicationParentTask, showUnsupportedBatchAbilities, unsupportedBatchMessage = defaultUnsupported, contactObjectType }: ShopExecutionDrawerProps) {
  const tenantId = useTenantStore(state => state.currentTenantId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allowedIds, setAllowedIds] = useState<string[] | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sourceKey = JSON.stringify(shopIds ?? null);
  const scopeParentId = parentTaskId || communicationParentTask?.parentTaskId;
  const isShop = contactObjectType == null || contactObjectType === CONTACT_OBJECT_TYPE.WM_SHOP || contactObjectType === CONTACT_OBJECT_TYPE.WDC_SHOP;
  const entityLabel = isShop ? '门店' : '对象';

  useEffect(() => {
    if (!open) return;
    let active = true;
    const suppliedIds = JSON.parse(sourceKey) as (number | string)[] | null;
    setManualInput(''); setError(''); setAllowedIds(null);
    setSelectedIds(uniqueIds(suppliedIds ?? []));
    if (!scopeParentId) { setLoading(false); return; }
    setLoading(true);
    bdTaskApi.queryDetail({ parentTaskId: scopeParentId, tenantId, page: 1, pageSize: 10000 })
      .then(result => {
        if (!active) return;
        const ids = uniqueIds(result.data.flatMap(task => [task, ...(task.skuTaskAggregation?.subTasks ?? [])]).map(task => task.shopId || task.objectId || '').filter(Boolean));
        setAllowedIds(ids);
        if (suppliedIds == null) setSelectedIds(ids);
      })
      .catch(() => { if (active) setError('示例任务范围加载失败，请关闭后重新打开'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, scopeParentId, sourceKey, tenantId]);

  const addIds = () => {
    const ids = uniqueIds(manualInput.split(/[,，、;；\s]+/));
    if (!ids.length) { message.warning(`请输入${entityLabel} ID`); return; }
    if (ids.some(id => !/^[1-9]\d*$/.test(id))) { message.warning('ID 仅支持正整数，请检查输入'); return; }
    if (!batchExecution && uniqueIds([...selectedIds, ...ids]).length > 1) { message.warning('单个执行仅支持选择一个对象'); return; }
    const invalid = allowedIds == null ? [] : ids.filter(id => !allowedIds.includes(id));
    if (invalid.length) { message.warning(`以下 ID 不属于当前任务批次：${invalid.slice(0, 5).join('、')}`); return; }
    setSelectedIds(current => uniqueIds([...current, ...ids]));
    setManualInput('');
    message.success(`已更新所选${entityLabel}`);
  };
  const showRemoteNotice = (ability: DemoExecutionAbility) => {
    Modal.info({ title: '交互演示暂不支持', content: `“${ability.title}”需要依赖远程组件或业务接口，当前交互演示暂不支持该功能。`, okText: '我知道了', centered: true });
  };
  const abilityCard = (ability: DemoExecutionAbility) => {
    const disabled = batchExecution && !!ability.singleOnly;
    if (disabled && !showUnsupportedBatchAbilities) return null;
    return <button key={ability.id} type="button" className="shop-execution-ability-card execution-demo-ability" data-disabled={disabled} disabled={disabled} title={disabled ? unsupportedBatchMessage : undefined} onClick={() => showRemoteNotice(ability)}>
      <span className="execution-demo-ability-icon" style={{ color: ability.color, background: ability.softColor }}>{ability.icon}</span>
      <span className="execution-demo-ability-text"><strong>{ability.title}</strong><span>{disabled ? unsupportedBatchMessage : ability.description}</span></span>
      <span className="execution-demo-ability-action" aria-hidden>{ability.external ? <ExportOutlined /> : <DownOutlined />}</span>
    </button>;
  };
  const recommended = isShop ? DEMO_EXECUTION_ABILITIES.filter(a => [5, 9].includes(a.id)) : [];
  return <Drawer title={<span className="shop-execution-drawer-title">{batchExecution ? '全部执行' : '单店执行'}</span>} open={open} onClose={onClose} width="min(600px, 100vw)" destroyOnClose rootClassName="shop-execution-drawer" styles={{ body: { padding: 0, background: MT.pageBg }, mask: { background: MT.overlayMask } }}>
    <div className="execution-demo-content">
      <section className="execution-demo-panel" aria-label={`所选${entityLabel}`}>
        <SectionTitle icon={<InfoCircleOutlined />}>所选{entityLabel}</SectionTitle>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {loading ? <Skeleton active paragraph={{ rows: 2 }} /> : <>
          <Typography.Text className="execution-demo-category">已选{selectedIds.length}个{entityLabel}</Typography.Text>
          <div className="execution-demo-tags">
            {selectedIds.map(id => <Tag className="shop-execution-selected-shop" key={id}><span>{id}</span><button type="button" aria-label={`移除${entityLabel} ${id}`} onClick={() => setSelectedIds(current => current.filter(item => item !== id))}><CloseOutlined /></button></Tag>)}
            {!selectedIds.length && <Typography.Text type="secondary">可在下方补充{entityLabel} ID</Typography.Text>}
          </div>
        </>}
        <div className="execution-demo-manual">
          <label className="execution-demo-category" htmlFor="execution-demo-manual-ids">手动补充{entityLabel} ID</label>
          <Input.TextArea id="execution-demo-manual-ids" value={manualInput} onChange={event => setManualInput(event.target.value)} disabled={loading || !!error} placeholder={batchExecution ? `多个${entityLabel} ID 可用逗号、空格或换行分隔` : `请输入单个${entityLabel} ID`} autoSize={{ minRows: 2, maxRows: 4 }} />
          <div className="execution-demo-buttons"><Button danger disabled={loading || !selectedIds.length} onClick={() => setSelectedIds([])}>清空列表</Button><Button type="primary" style={MT_BTN.primary} disabled={loading || !!error} onClick={addIds}>添加{entityLabel}</Button></div>
        </div>
      </section>
      <section className="execution-demo-panel" aria-label="推荐执行能力">
        <SectionTitle icon={<RocketOutlined />}>推荐执行能力</SectionTitle>
        <div className="execution-demo-ability-list">{recommended.map(abilityCard)}</div>
        {!recommended.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无推荐执行能力" />}
      </section>
      <section className="execution-demo-panel" aria-label="其他执行能力">
        <SectionTitle icon={<AppstoreOutlined />}>其他执行能力</SectionTitle>
        {DEMO_EXECUTION_GROUPS.map(group => <section key={group.title} className="execution-demo-group" aria-label={group.title}><h4 className="execution-demo-category">{group.title}</h4><div className="execution-demo-ability-list">{group.ids.map(id => DEMO_EXECUTION_ABILITIES.find(a => a.id === id)!).map(abilityCard)}</div></section>)}
      </section>
      <p className="execution-demo-note">交互演示 · 执行能力需连接远程组件或业务接口</p>
    </div>
  </Drawer>;
}
