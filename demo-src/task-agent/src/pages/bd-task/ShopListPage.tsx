import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input, Spin, Empty, Pagination, Tabs, Button, Tooltip, Alert, Select, message } from 'antd';
import { SearchOutlined, ReloadOutlined, ShopOutlined, DownOutlined, UpOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { bdTaskApi } from '@/services/bdTaskApi';
import type { ShopDimensionItemDto, BdShopDimensionPageReq, ParentTaskOverviewDto, VisibleTabItem } from '@/types/bdTask';
import { CONTACT_OBJECT_TYPE } from '@/types/bdTask';
import ShopCard from './components/ShopCard';
import BrandCard from './components/BrandCard';
import IndustryShopCard from './components/IndustryShopCard';
import { useVisibleObjectTypes } from './hooks/useVisibleObjectTypes';
import { useTenantStore } from '@/stores/tenantStore';
import ShopProfileFilterFields, { ShopProfileFilterValue } from './components/ShopProfileFilterFields';
import FilterFieldLabel from './components/FilterFieldLabel';
import { TASK_FILTER_RESULT_COUNT_STYLE } from './components/TaskFilterBar';
import { useShopFilterOptions } from './hooks/useShopFilterOptions';
import { useTaskTypeDictionary } from './hooks/useTaskTypeDictionary';
import { isValidNumericIdSearch } from './utils/numericIdSearch';
import { MT } from './theme';
import './workbench/components/workbench-responsive.css';

const DEFAULT_PAGE_SIZE = 20;
type TabValue = VisibleTabItem['tab'];
const TAB_CONFIGS = {
  1: { label: '外卖门店', contactObjectType: CONTACT_OBJECT_TYPE.WM_SHOP, card: ShopCard },
  2: { label: '公海门店', contactObjectType: CONTACT_OBJECT_TYPE.WDC_SHOP, card: ShopCard },
  3: { label: '业务品牌', contactObjectType: CONTACT_OBJECT_TYPE.BRAND, card: BrandCard },
  4: { label: '行业商家', contactObjectType: CONTACT_OBJECT_TYPE.TS_POI, card: IndustryShopCard },
};


const ShopListPage: React.FC = () => {
  const navigate = useNavigate();
  const { tabs, loading: tabsLoading, error: tabsError } = useVisibleObjectTypes();
  const tenantId = useTenantStore(state => state.currentTenantId);
  const [activeTab, setActiveTab] = useState<TabValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [data, setData] = useState<ShopDimensionItemDto[]>([]);
  const [parentTaskMap, setParentTaskMap] = useState<Record<number, ParentTaskOverviewDto>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // 搜索字段：草稿值 + 查询按钮生效两套状态，对齐 NoCode MerchantListPage handleSearch 交互
  const [shopIdSearchDraft, setShopIdSearchDraft] = useState('');
  const [shopIdSearch, setShopIdSearch] = useState('');
  const [shopNameSearchDraft, setShopNameSearchDraft] = useState('');
  const [shopNameSearch, setShopNameSearch] = useState('');
  // 【待后端接口就绪后联调】经营地址/任务名称/任务创建人、跟进人搜索，同样草稿+生效两套状态
  const [addressSearchDraft, setAddressSearchDraft] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [taskNameSearchDraft, setTaskNameSearchDraft] = useState('');
  const [taskNameSearch, setTaskNameSearch] = useState('');
  const [creatorIdSearchDraft, setCreatorIdSearchDraft] = useState('');
  const [creatorIdSearch, setCreatorIdSearch] = useState('');
  const [bdIdSearchDraft, setBdIdSearchDraft] = useState('');
  const [bdIdSearch, setBdIdSearch] = useState('');
  // 【待后端接口就绪后联调】商家画像筛选：营业状态/上单状态/配送方式/认领上单状态/品类/商家标签/体验分区间，
  // 选项来源于 getShopFilterOptions() 字典接口。
  // 【回归修复3】按用户要求改为「草稿值 + 查询按钮」两套状态，与其余搜索框统一由「查询」按钮驱动生效，
  // 不再是此前的「选中即生效」（选中即生效在多选场景下容易导致连续勾选时触发多次请求、体验不可控）
  const [profileFilterDraft, setProfileFilterDraft] = useState<ShopProfileFilterValue>({});
  const [profileFilter, setProfileFilter] = useState<ShopProfileFilterValue>({});
  // 【全面排查修复】筛选搜索区默认只展示到「跟进人」，商家画像筛选组（营业状态/上单状态/配送方式/
  // 门店品类/商家标签/体验分区间等）默认折叠收起，通过「展开更多筛选」按钮按需展开，减少默认屏效占用；
  // 商家画像筛选组存在生效中的筛选值时（如切换 tab 前已设置过）自动展开，避免用户看不到已生效的筛选条件
  const [filterExpanded, setFilterExpanded] = useState(false);

  const [skuIdDraft, setSkuIdDraft] = useState('');
  const [skuId, setSkuId] = useState('');
  const [matchTypesDraft, setMatchTypesDraft] = useState<number[]>([]);
  const [matchTypes, setMatchTypes] = useState<number[]>([]);

  const { taskTypeNameMap } = useTaskTypeDictionary();

  const isWdcTab = activeTab === 2;
  const isShopTab = activeTab === 1 || isWdcTab;
  const isBrandTab = activeTab === 3;
  const activeObjectType = TAB_CONFIGS[activeTab ?? 1].contactObjectType;
  const entityLabel = isShopTab ? (isWdcTab ? '公海门店' : '门店') : isBrandTab ? '品牌' : '行业门店';

  const { options: filterOptions, loading: filterOptionsLoading } = useShopFilterOptions(activeTab === 4 ? CONTACT_OBJECT_TYPE.TS_POI : isWdcTab ? CONTACT_OBJECT_TYPE.WDC_SHOP : CONTACT_OBJECT_TYPE.WM_SHOP);

  const buildReq = useCallback((p: number, ps: number, tab: TabValue): BdShopDimensionPageReq => {
    const req: BdShopDimensionPageReq = { page: p, pageSize: ps, tab };
    if (tab === 2) req.contactObjectType = CONTACT_OBJECT_TYPE.WDC_SHOP;
    if (tab <= 2) {
      if (shopIdSearch.trim() && /^\d+$/.test(shopIdSearch.trim())) req.shopId = Number(shopIdSearch.trim());
      if (shopNameSearch.trim()) req.shopName = shopNameSearch.trim();
      if (addressSearch.trim()) req.address = addressSearch.trim();
    } else {
      if (tab === 3 && shopNameSearch.trim()) req.objectName = shopNameSearch.trim();
      if (tab === 4 && shopNameSearch.trim()) req.tsPoiName = shopNameSearch.trim();
      if (tab === 4 && addressSearch.trim()) req.address = addressSearch.trim();
      if (shopIdSearch.trim()) {
        if (tab === 4) req.tsPoiId = shopIdSearch.trim();
        else req.objectId = shopIdSearch.trim();
      }
    }
    if ((tab === 1 || tab === 4) && skuId.trim()) req.objectId = skuId.trim();
    if (tab === 4 && matchTypes.length) req.matchTypes = matchTypes;
    if (taskNameSearch.trim()) req.taskName = taskNameSearch.trim();
    if (creatorIdSearch.trim()) req.creatorId = creatorIdSearch.trim();
    if (bdIdSearch.trim()) req.bdId = bdIdSearch.trim();
    if (profileFilter.businessStatus?.length) req.businessStatus = profileFilter.businessStatus;
    if (profileFilter.onlineStatus?.length) req.onlineStatus = profileFilter.onlineStatus;
    if (profileFilter.deliveryType?.length) req.deliveryType = profileFilter.deliveryType;
    if (profileFilter.claimStatus?.length) req.claimStatus = profileFilter.claimStatus;
    if (profileFilter.categoryId?.length) req.categoryId = profileFilter.categoryId;
    if (profileFilter.poiTags?.length) req.poiTags = profileFilter.poiTags;
    if (profileFilter.experienceScoreFrom != null) req.experienceScoreFrom = profileFilter.experienceScoreFrom;
    if (profileFilter.experienceScoreTo != null) req.experienceScoreTo = profileFilter.experienceScoreTo;
    return req;
  }, [shopIdSearch, shopNameSearch, addressSearch, taskNameSearch, creatorIdSearch, bdIdSearch, profileFilter, skuId, matchTypes]);

  // 请求序号竞态保护：并发多次调用 fetchPage 时（如快速切换筛选条件、连续点击查询），
  // 仅让"最后一次发起"的请求结果真正写入 data/total，避免网络时序不稳定导致旧请求晚于新请求
  // 返回、用过期数据覆盖最新结果，引发列表数据与当前筛选条件不一致（表现为页面闪烁/数据突然清空）
  const requestSeqRef = useRef(0);
  const fetchPage = useCallback(async (p: number, ps: number, tab: TabValue) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setListError(null);
    try {
      const result = await bdTaskApi.queryShopDimensionList(buildReq(p, ps, tab));
      if (seq !== requestSeqRef.current) return; // 已有更新的请求发出，本次结果作废
      const rows = result?.data || [];
      const parentTaskIds = Array.from(new Set(rows.flatMap(row =>
        (row.subTaskOverviews ?? []).map(task => task.parentTaskId).filter(Boolean),
      )));
      let nextParentTaskMap: Record<number, ParentTaskOverviewDto> = {};
      if (parentTaskIds.length > 0) {
        const parentResult = await bdTaskApi.queryParentTaskList({
          parentTaskIdList: parentTaskIds,
          page: 1,
          pageSize: parentTaskIds.length,
        });
        if (seq !== requestSeqRef.current) return;
        nextParentTaskMap = Object.fromEntries(
          (parentResult?.data ?? []).map(task => [task.parentTaskId, task]),
        );
      }
      setParentTaskMap(nextParentTaskMap);
      setData(rows);
      setTotal(result?.total || 0);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setData([]);
      setParentTaskMap({});
      setTotal(0);
      setListError('任务项列表加载失败，请重试');
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [buildReq]);

  // 搜索/筛选生效值变化时重新拉取（真实生效，非本地过渡）；首次挂载时该 effect 本就会执行一次，
  // 等效覆盖"首次拉取"需求，故不再额外拆出一个仅依赖 [] 的独立 effect——此前两个 effect 会在挂载时
  // 同时各自发起一次请求，产生两个几乎同时的并发请求，网络时序不稳定时后返回的请求会覆盖先返回的结果，
  // 是 TC 回归反馈"筛选输入框打字过程中页面闪烁、列表数据一度清空"的根因之一，现合并为单一数据源避免竞态
  useEffect(() => {
    if (tabsLoading || tabsError) return;
    if (!tabs.some(tab => tab.tab === activeTab)) setActiveTab(tabs[0]?.tab ?? null);
  }, [tabs, tabsLoading, tabsError, activeTab]);

  useEffect(() => {
    if (activeTab == null || tabsLoading || tabsError || !tabs.some(tab => tab.tab === activeTab)) return;
    setPage(1);
    fetchPage(1, pageSize, activeTab);
    return () => { requestSeqRef.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, activeTab, tenantId, tabsLoading, tabsError]);

  // 商家排序（按关联任务数降序）以及单个商家卡片底部任务概览的排序均已改为后端接管（后端技术方案补充 KM 2779238690
      // 一/二节），前端不再对列表做本地二次排序，直接使用接口返回的原始顺序
  const sortedData = data;

  const handleTabChange = (tab: string) => {
    trackTaskAction('entity_type.tab');
    const tabValue = Number(tab) as TabValue;
    requestSeqRef.current += 1;
    setData([]);
    setParentTaskMap({});
    setTotal(0);
    setActiveTab(tabValue);
    // 切换 tab 时重置搜索/筛选/分页状态，避免跨 tab 状态串扰
    setShopIdSearchDraft(''); setShopIdSearch('');
    setShopNameSearchDraft(''); setShopNameSearch('');
    setAddressSearchDraft(''); setAddressSearch('');
    setTaskNameSearchDraft(''); setTaskNameSearch('');
    setCreatorIdSearchDraft(''); setCreatorIdSearch('');
    setBdIdSearchDraft(''); setBdIdSearch('');
    setProfileFilterDraft({}); setProfileFilter({});
    setPage(1);
    setSkuIdDraft(''); setSkuId('');
    setMatchTypesDraft([]); setMatchTypes([]);
    setFilterExpanded(false);
  };

  const handlePageChange = (p: number, ps: number) => {
    trackTaskAction('list.page');
    setPage(p);
    setPageSize(ps);
    if (activeTab != null) fetchPage(p, ps, activeTab);
  };

  // 点击查询：将草稿值（含商家画像筛选草稿）同步为生效值，统一触发一次真实服务端请求
  const handleSearch = () => {
    trackTaskAction('filter.query');
    if (isShopTab && !isValidNumericIdSearch(shopIdSearchDraft)) {
      message.warning('请输入有效的门店 ID（纯数字）');
      return;
    }
    trackTaskAction('query.submitted');
    setShopIdSearch(shopIdSearchDraft.trim());
    setShopNameSearch(shopNameSearchDraft.trim());
    setAddressSearch(addressSearchDraft.trim());
    setTaskNameSearch(taskNameSearchDraft.trim());
    setCreatorIdSearch(creatorIdSearchDraft.trim());
    setBdIdSearch(bdIdSearchDraft.trim());
    setProfileFilter(profileFilterDraft);
    setSkuId(skuIdDraft.trim());
    setMatchTypes(matchTypesDraft);
  };

  // 重置筛选：同时清空草稿值、生效值与商家画像筛选（草稿+生效两套状态一并清空）
  const handleReset = () => {
    trackTaskAction('filter.reset');
    setShopIdSearchDraft(''); setShopIdSearch('');
    setShopNameSearchDraft(''); setShopNameSearch('');
    setAddressSearchDraft(''); setAddressSearch('');
    setTaskNameSearchDraft(''); setTaskNameSearch('');
    setCreatorIdSearchDraft(''); setCreatorIdSearch('');
    setBdIdSearchDraft(''); setBdIdSearch('');
    setProfileFilterDraft({}); setProfileFilter({});
    setSkuIdDraft(''); setSkuId('');
    setMatchTypesDraft([]); setMatchTypes([]);
  };

  // 商家画像筛选组（营业状态/上单状态/配送方式/门店品类/商家标签/体验分区间）是否存在生效中的筛选值
  const hasActiveProfileFilters =
    Object.values(profileFilter).some(v => (Array.isArray(v) ? v.length > 0 : v != null));

  const hasActiveFilters =
    !!shopIdSearch || !!shopNameSearch || !!addressSearch || !!taskNameSearch ||
    !!creatorIdSearch || !!bdIdSearch || hasActiveProfileFilters || !!skuId || matchTypes.length > 0;

  // 【全面排查修复】商家画像筛选组存在生效中的筛选值时自动展开，避免筛选生效后被默认收起状态遮挡，
  // 用户看不到当前实际生效的筛选条件
  useEffect(() => {
    if (hasActiveProfileFilters) setFilterExpanded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveProfileFilters]);

  const getRowId = (shop: ShopDimensionItemDto): string | number => isShopTab ? shop.shopId : isBrandTab ? shop.objectId ?? '' : shop.outerId ?? shop.objectId ?? '';
  const handleCardClick = (shop: ShopDimensionItemDto) => {
    const id = getRowId(shop);
    if (id === '') return;
    const path = isShopTab ? 'shops' : isBrandTab ? 'brands' : 'industry-shops';
    trackTaskAction('entity.detail.card', activeObjectType === CONTACT_OBJECT_TYPE.WM_SHOP ? shop.shopId : undefined);
    navigate(`/bd-task/${path}/${encodeURIComponent(String(id))}`, {
      state: { shopName: shop.shopName, entityName: isShopTab ? shop.shopName : isBrandTab ? shop.objectName : shop.outerName, taskCount: shop.taskCount, contactObjectType: activeObjectType, entity: shop },
    });
  };

  const skuIdLabel = activeTab === 4 ? '行业 SKU ID' : 'SKU ID';
  const skuIdFilter = (
    <FilterFieldLabel label={skuIdLabel}>
      <Input value={skuIdDraft} onChange={event => setSkuIdDraft(event.target.value)} onPressEnter={handleSearch} placeholder={`输入完整 ${skuIdLabel}`} prefix={<SearchOutlined style={{ color: MT.textMuted, fontSize: 13 }} />} allowClear />
    </FilterFieldLabel>
  );

  // 筛选/搜索 + 列表区：外卖门店/公海门店两个 tab 共用同一套结构，仅文案与部分字段按门店类型切换
  const renderContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 筛选与搜索卡片，1:1 对齐 NoCode toolbar（FilterFieldLabel grid 布局 + 查询/重置按钮） */}
      <div style={{
        background: MT.cardBg,
        borderRadius: MT.cardRadius,
        border: '1px solid transparent',
        boxShadow: MT.cardShadow,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <FilterFieldLabel label={`${entityLabel}名称`}>
            <Input
              value={shopNameSearchDraft}
              onChange={e => setShopNameSearchDraft(e.target.value)}
              onPressEnter={handleSearch}
              placeholder={`输入${entityLabel}名称关键词`}
              prefix={<SearchOutlined style={{ color: MT.textMuted, fontSize: 13 }} />}
              allowClear
            />
          </FilterFieldLabel>
          <FilterFieldLabel label={activeTab === 4 ? '行业门店 outerId' : `${entityLabel}ID`}>
            <Input
              value={shopIdSearchDraft}
              onChange={e => setShopIdSearchDraft(e.target.value)}
              onPressEnter={handleSearch}
              placeholder={`输入完整${entityLabel} ID`}
              prefix={<SearchOutlined style={{ color: MT.textMuted, fontSize: 13 }} />}
              allowClear
            />
          </FilterFieldLabel>
          {activeTab === 1 && skuIdFilter}
          {(isShopTab || activeTab === 4) && <FilterFieldLabel label={activeTab === 4 ? '行业门店地址' : '经营地址'}>
            <Input
              value={addressSearchDraft}
              onChange={e => setAddressSearchDraft(e.target.value)}
              onPressEnter={handleSearch}
              placeholder={activeTab === 4 ? '输入行业门店地址关键词' : '输入经营地址关键词'}
              prefix={<SearchOutlined style={{ color: MT.textMuted, fontSize: 13 }} />}
              allowClear
            />
          </FilterFieldLabel>}
          <FilterFieldLabel label="所属任务批次">
            <Input
              value={taskNameSearchDraft}
              onChange={e => setTaskNameSearchDraft(e.target.value)}
              onPressEnter={handleSearch}
              placeholder="输入所属任务批次关键词"
              prefix={<SearchOutlined style={{ color: MT.textMuted, fontSize: 13 }} />}
              allowClear
            />
          </FilterFieldLabel>
          <FilterFieldLabel label="任务批次创建人">
            <Input
              value={creatorIdSearchDraft}
              onChange={e => setCreatorIdSearchDraft(e.target.value)}
              onPressEnter={handleSearch}
              placeholder="输入完整创建人 mis"
              prefix={<SearchOutlined style={{ color: MT.textMuted, fontSize: 13 }} />}
              allowClear
            />
          </FilterFieldLabel>
          {(isShopTab || isBrandTab) && <FilterFieldLabel label="跟进人">
            <Input
              value={bdIdSearchDraft}
              onChange={e => setBdIdSearchDraft(e.target.value)}
              onPressEnter={handleSearch}
              placeholder="输入完整跟进人 mis"
              prefix={<SearchOutlined style={{ color: MT.textMuted, fontSize: 13 }} />}
              allowClear
            />
          </FilterFieldLabel>}
          {activeTab === 4 && skuIdFilter}
          {activeTab === 4 && <FilterFieldLabel label="行业合作标签">
              <Select
                mode="multiple"
                value={matchTypesDraft}
                onChange={value => { trackTaskAction('filter.match_type'); setMatchTypesDraft(value); }}
                options={filterOptions.matchTypeOptions?.map(item => ({ value: item.code, label: item.label }))}
                loading={filterOptionsLoading}
                allowClear
                placeholder="全部合作标签"
                style={{ width: '100%' }}
              />
            </FilterFieldLabel>}
        </div>
        {/* 【全面排查修复】筛选搜索区默认只展示到「跟进人」，商家画像筛选组（营业状态/上单状态/配送方式/
            门店品类/商家标签/体验分区间等）默认折叠收起，点击下方「展开更多筛选」按需展开，减少默认屏效占用；
            存在生效中的画像筛选值时自动展开（见 hasActiveProfileFilters 副作用）。
            【回归修复3】商家画像筛选改为「草稿值，点击下方查询按钮才生效」，绑定 profileFilterDraft 而非
            profileFilter（生效值），与营业状态/上单状态/配送方式/门店品类等控件在交互上与其余搜索框保持一致。
            【本次调整】不再整组套一个统一的「商家画像」大标题，而是每个字段单独有各自的标题（复用字段
            自身的 placeholder 文案，如"营业状态""上单状态"），与门店ID/门店名称等字段的 FilterFieldLabel
            标题样式保持一致，通过 withLabel 开关传入，仅在本页（卡片式 grid 布局）生效；
            【全面排查修复】改用与上方门店ID/门店名称等字段一致的 grid: repeat(3,1fr) 布局（原 flex-wrap +
            固定 160px 宽度），字段列宽与上方搜索字段完全对齐成列，随视窗宽度自适应撑满，不再出现字段数量
            较少时（如公海门店仅3个字段）右侧留白的问题 */}
        {isShopTab && filterExpanded && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <ShopProfileFilterFields
              contactObjectType={activeObjectType}
              options={filterOptions}
              optionsLoading={filterOptionsLoading}
              value={profileFilterDraft}
              onChange={patch => setProfileFilterDraft(prev => ({ ...prev, ...patch }))}
              withLabel
              flexField
            />
          </div>
        )}

        {/* 【本次调整】"共 X 家商家"与展开更多筛选/重置/查询合并到同一行（左右分布），减少独立占用一整行的空间，
            提升屏效，与其余筛选卡片的紧凑布局风格保持一致 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {/* 【走查修复】icon 与紧邻文字高度对齐：统一 lineHeight:1 + verticalAlign:middle */}
          <div style={TASK_FILTER_RESULT_COUNT_STYLE}>
            <ShopOutlined style={{ fontSize: 13, verticalAlign: 'middle' }} />
            <span style={{ lineHeight: 1 }}>共 {total} {isShopTab ? '家商家' : isBrandTab ? '个品牌' : '家行业门店'}</span>
            {/* 【本次调整】补充问号提示：告知用户当前列表存在最大展示条数限制，超出范围需通过筛选条件缩小
                查询范围，避免用户误以为筛选/搜索无效或数据缺失 */}
            <Tooltip title="为保证查询性能，当前页面最多展示 200 条数据，如实际商家数超出该范围，请补充筛选条件缩小查询范围后再查询">
              <QuestionCircleOutlined style={{ fontSize: 13, cursor: 'help', verticalAlign: 'middle' }} />
            </Tooltip>
          </div>
          {/* 【走查修复】原「展开更多筛选」与「重置筛选/查询」统一用 gap:8 平铺，因「展开更多筛选」是
              type="text" 无底色按钮、「重置筛选」原本同为 type="text"、「查询」是有底色的 MT_BTN.primary，
              三者视觉宽度/间距观感不统一，显得「展开更多筛选」与右侧两个按钮的间距忽宽忽窄。
              现按语义拆成两组，中间加一条竖向分隔线明确区隔（与 TaskFilterBar.tsx/ParentTaskList.tsx
              里排序/重置筛选等分组的处理方式保持一致）：左组「展开/收起筛选」是视图折叠控制，
              右组「重置筛选+查询」是数据查询操作，两组各自内部 gap 保持 8px 不变，仅在两组之间
              用分隔线替代裸 gap，视觉分组更清晰，不再有"间距不一致"的观感 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isShopTab && <><Button
              type="text"
              icon={filterExpanded ? <UpOutlined /> : <DownOutlined />}
              onClick={() => { trackTaskAction(filterExpanded ? 'filter.collapse' : 'filter.expand'); setFilterExpanded(prev => !prev); }}
            >
              {filterExpanded ? '收起筛选' : '展开更多筛选'}
            </Button>
            <div style={{ width: 1, height: 20, background: MT.cardBorder }} /></>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 重置筛选使用 antd 默认按钮；禁用态由 antd 统一处理。 */}
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                disabled={!hasActiveFilters}
              >
                重置
              </Button>
              {/* 当前操作区仅保留一个主按钮，hover/active 反馈交由 antd 主题 token。 */}
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 商家卡片列表：纵向堆叠，无表头 */}
      <Spin spinning={loading}>
        {listError && !isShopTab ? (
          <Alert type="error" showIcon message={listError} action={<Button onClick={() => { trackTaskAction('retry.entity_list'); if (activeTab != null) fetchPage(page, pageSize, activeTab); }}>重试</Button>} />
        ) : sortedData.length === 0 && !loading ? (
          <div style={{ borderRadius: MT.cardRadius, border: `1px dashed ${MT.cardBorder}`, padding: '40px 0' }}>
            <Empty description={isShopTab ? isWdcTab ? '暂无公海门店数据' : '暂无商家数据' : `暂无${entityLabel}数据`} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 【字段调整】任务概览改用 SubTaskOverviewDto（任务项自身视角的精简结构），不再包含
                contactObjectType 等完整任务批次字段，故 onOverviewClick 不再以 task 冒充 parentTask 传入
                state 做首屏预填充；任务详情页 SubTaskList.tsx 加载时会通过 refreshParentTask() 主动请求
                完整任务批次数据兜底，不传 state 仅首屏多一次短暂 loading，不影响最终数据正确性 */}
            {sortedData.map(shop => {
              const EntityCard = TAB_CONFIGS[activeTab ?? 1].card;
              const id = getRowId(shop);
              return <EntityCard
                key={id}
                shop={shop}
                onClick={() => handleCardClick(shop)}
                onOverviewClick={task => { trackTaskAction('batch.detail_from_overview'); navigate(`/bd-task/${task.parentTaskId}`); }}
                parentTaskMap={parentTaskMap}
                taskTypeNameMap={taskTypeNameMap}
              />;
            })}
          </div>
        )}
      </Spin>

      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 4px 0' }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={handlePageChange}
            showQuickJumper
            showSizeChanger
            showTotal={t => `共 ${t} 条`}
            size="small"
          />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ margin: '0 auto', maxWidth: 1800, padding: '15px 20px 20px' }}>
      {tabsLoading ? <Spin style={{ display: 'block', padding: 60 }} /> : tabsError ? (
        <Alert type="error" showIcon message="任务项类型加载失败" description={tabsError.message} action={<Button onClick={() => { trackTaskAction('retry.entity_types'); window.location.reload(); }}>重试</Button>} />
      ) : tabs.length === 0 ? <Empty description="暂无可见任务项类型" /> : (
        <Tabs
          activeKey={activeTab == null ? undefined : String(activeTab)}
          onChange={handleTabChange}
          className="wb-workspace-tabs"
          style={{ background: 'transparent' }}
          tabBarStyle={{ marginBottom: 18, borderBottomColor: MT.cardBorder }}
          items={tabs.map(tab => ({ key: String(tab.tab), label: tab.tab === 4 ? '行业商家' : (tab.tabName || TAB_CONFIGS[tab.tab].label), children: activeTab === tab.tab ? renderContent() : null }))}
        />
      )}

    </div>
  );
};

export default ShopListPage;
