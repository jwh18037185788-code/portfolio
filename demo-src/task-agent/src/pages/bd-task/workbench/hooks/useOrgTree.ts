import { getBdTaskBaselinePreview, isBdTaskBaselinePreview } from '@/mocks/bdTaskBaselinePreview';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTenantStore } from '@/stores/tenantStore';

/**
 * 组织架构树节点（先富通用组件体系 org-box-org-search 返回结构）。
 * level 字段用于适配 旧版 OrganizationSelector 的层级基准计算（组件内部据此推导 minLevel），
 * childrenList 为组件懒加载展开子节点时挂载的字段，本地缓存/推断逻辑不依赖它。
 */
export interface OrgNode {
  /** 组织节点ID */
  id: number;
  /** 节点名称 */
  name: string;
  /** 父节点ID */
  parentId: number;
  /** 组织类型编码（如 3=外卖城市、21=外卖团队等，见 useCityAnchor.ts 白名单） */
  orgType: number;
  /** 是否叶子节点 */
  isLeaf?: boolean;
  /** 组织层级，由接口原样返回，OrganizationSelector 渲染层级展开依赖此字段 */
  level?: number;
  /** OrganizationSelector 内部懒加载展开时挂载子节点列表，本项目业务逻辑不读取该字段 */
  childrenList?: OrgNode[] | null;
}

/** 先富组织架构选择器接口路径：走 /xianfu/api/common 前缀（先富域名下网关天然支持转发，无需额外配置 Oceanus 路径映射，见 km 2773748350） */
const ORG_SEARCH_URL = '/xianfu/api/common/wm/org/shepherd/box/org-box-org-search';
/** 组织架构关键字搜索级联接口（Requirement 1.3），供 OrganizationSelector 的 searchUrl 直接对接 */
export const ORG_TREE_SEARCH_URL = '/xianfu/api/common/wm/org/shepherd/box/org-box-org-tree-search';

/**
 * org-box-org-search / org-box-org-tree-search 请求体最外层的 tenantId 字段，是先富/infra 组织架构体系
 * 专属的租户 ID，外卖固定为 1000008，与业务线 tenantId（useTenantStore.currentTenantId，如 5001=外卖白领）
 * 是两套完全不同语义的字段，不可混用。
 * 🔧 2026-08-19 排障修正：此前误将本字段复用为 currentTenantId（5001），导致接口对该 tenantId 查询范围为空，
 * 请求虽返回 code:0 但 data 恒为 []（无报错，静默返回空）。wmOrgBoxAuth.authCode 的拼接规则不受影响，
 * 仍使用业务线 currentTenantId 拼装（task_agent_{currentTenantId}，如 task_agent_5001）。
 */
const ORG_BOX_TENANT_ID = 1000008;

/**
 * 将 orgId 到根节点的路径（getNodePath 结果）转换为 roo OrganizationSelector 期望的单链嵌套
 * childrenList 结构：[{ ...根节点, childrenList: [{ ...下一级, childrenList: [...目标节点] }] }]。
 * 组件的 findName/getOrgOptionsById 会递归 childrenList 查找目标 id 对应节点名称用于输入框回显。
 * 纯函数，不依赖组件状态，提到模块顶层避免每次渲染重复创建。
 */
function buildPathTree(path: OrgNode[]): OrgNode[] {
  if (path.length === 0) return [];
  // 从叶子（目标节点）往根节点方向逐层包裹 childrenList
  let wrapped: OrgNode = { ...path[path.length - 1], childrenList: null };
  for (let i = path.length - 2; i >= 0; i -= 1) {
    wrapped = { ...path[i], childrenList: [wrapped] };
  }
  return [wrapped];
}

/**
 * 请求指定 parentId 下的子节点列表。
 * 请求体固定拼装：pageUrl + parentId + tenantId（固定 1000008，见 ORG_BOX_TENANT_ID 注释）+
 * wmOrgBoxAuth.authCode（task_agent_{业务线 tenantId}）。
 * parentId=0 查询顶级节点。
 */
async function requestOrgChildren(parentId: number): Promise<OrgNode[]> {
  const preview = getBdTaskBaselinePreview(ORG_SEARCH_URL, { parentId });
  if (preview.handled) return preview.data as OrgNode[];
  throw new Error('示例组织节点不存在');
}

/**
 * 组织树懒加载逻辑封装：按 parentId 内存缓存，避免重复请求同一父节点。
 * 同时导出 fetchOrgNodeById 供 useCityAnchor.ts 城市锚点下钻复用（通过遍历已缓存节点或按需请求兜底查询），
 * 并导出 createPidService 供 OrgTreeSelector/CitySubFilter 适配 旧版 OrganizationSelector 的
 * pidService 数据契约（本次仅变更组件引入方式，请求/缓存/鉴权等业务逻辑与此前完全一致，未做任何调整）。
 */
export function useOrgTree() {
  // parentId -> children 缓存
  const cacheRef = useRef<Map<number, OrgNode[]>>(new Map());
  // orgId -> node 缓存（用于 fetchOrgNodeById 快速查找）
  const nodeByIdRef = useRef<Map<number, OrgNode>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 响应式订阅 currentTenantId（而非 getState() 快照），确保 searchParams 随租户初始化完成后自动更新
  const currentTenantId = useTenantStore((s) => s.currentTenantId);

  const fetchOrgChildren = useCallback(async (parentId: number): Promise<OrgNode[]> => {
    const cached = cacheRef.current.get(parentId);
    if (cached) return cached;
    setLoading(true);
    setError(null);
    try {
      const children = await requestOrgChildren(parentId);
      cacheRef.current.set(parentId, children);
      children.forEach((node) => nodeByIdRef.current.set(node.id, node));
      return children;
    } catch (e) {
      setError('加载失败，点击重试');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 按 orgId 查询节点信息，优先复用已缓存节点；缓存未命中时不发起兜底全量搜索（当前接口不支持按 id 直查），
   * 返回 undefined 由调用方（useCityAnchor）自行处理为"暂无法确定"。
   */
  const fetchOrgNodeById = useCallback((orgId: number): OrgNode | undefined => {
    return nodeByIdRef.current.get(orgId);
  }, []);

  /**
   * 从内存缓存中回溯 orgId 到根节点的完整路径（[根节点, ..., orgId 本身]），供 CitySubFilter 的
   * pidService 在"回显模式"（即 org-box-org-search 无法支持的按 id 反查路径场景）下构造嵌套
   * childrenList 树喂给 旧版 OrganizationSelector，使其在默认城市值计算完成后能够
   * 正确回显该节点名称（组件内部 findName 会递归 childrenList 寻找目标 id）。
   *
   * 纯内存操作、不发起任何网络请求：orgId 及其所有祖先节点必然已在 useCityAnchor 按层下钻过程中
   * 被 fetchOrgChildren 请求并写入 nodeByIdRef 缓存（下钻路径本身就是从顶层选中节点走到该城市节点），
   * 因此这里通过 parentId 逐级向上查找即可重建路径，不影响任何下钻性能。
   * 若中途遇到未缓存的祖先（理论上不会发生，兜底保护），则路径在该处截断，回显文案可能不完整但不报错。
   */
  const getNodePath = useCallback((orgId: number): OrgNode[] => {
    const path: OrgNode[] = [];
    const visited = new Set<number>();
    let current = nodeByIdRef.current.get(orgId);
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift(current);
      if (!current.parentId) break;
      current = nodeByIdRef.current.get(current.parentId);
    }
    return path;
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    nodeByIdRef.current.clear();
  }, []);

  /**
   * 适配 旧版 OrganizationSelector 的 pidService 数据契约：
   * 组件内部调用形态为 pidService({ ...params, parentId, orgIds, value })，
   * 要求返回 Promise<{ data: { code, data: { isHq: false, list: OrgNode[] } } }>（等价 axios response 形态）。
   * 这里复用上面同一份 fetchOrgChildren（同一份缓存、同一套鉴权拼装），仅做数据结构适配，不改变请求本身。
   *
   * 🆕 回显模式识别（2026-08-20）：组件在外部 value 变化（如异步计算出的默认选中值回填）或初始挂载
   * 需要显示已选中节点名称时，会带上非空的 `orgIds`（逗号/下划线拼接的目标节点 id 串）调用 pidService，
   * 而不是传 `parentId` 展开子节点。真实接口 org-box-org-search 本身不支持"按 id 反查其路径"的查询方式
   * （仅支持 parentId 查子节点），因此这里在识别到 orgIds 时，改为调用 getNodePath 从内存缓存中回溯
   * 该节点到根节点的路径（纯内存操作，不发起网络请求——路径上的节点必然已在此前下钻/展开过程中被
   * fetchOrgChildren 写入缓存），构造成组件期望的嵌套 childrenList 单链树返回，使输入框/标题能正确
   * 回显该节点名称（如城市筛选器默认选中的城市名）。若缓存未命中（如节点从未被下钻展开过），
   * 退化为空列表，组件会展示 id 兜底，不影响功能可用性。
   */
  const pidService = useCallback(
    async (params: { parentId?: number; orgIds?: string; value?: number[] }) => {
      const rawOrgIds = params?.orgIds;
      if (rawOrgIds) {
        // orgIds 由组件拼接为 ids.join('_')：多选场景（如顶部全局筛选器）下可能包含多个目标 id，
        // 需为每个 id 分别构建一条路径树，作为顶层数组的多个元素返回，findName 会逐条遍历查找
        const targetIds = rawOrgIds
          .split('_')
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n));
        const list = targetIds.flatMap((id) => buildPathTree(getNodePath(id)));
        return { data: { code: 0, data: { isHq: false, list } } };
      }
      const parentId = params?.parentId ?? 0;
      try {
        const list = await fetchOrgChildren(parentId);
        return { data: { code: 0, data: { isHq: false, list } } };
      } catch (e) {
        return { data: { code: -1, msg: e instanceof Error ? e.message : '组织架构接口请求失败', data: { isHq: false, list: [] } } };
      }
    },
    [fetchOrgChildren, getNodePath],
  );

  /**
   * 搜索级联接口 org-box-org-tree-search 的请求参数：与 fetchOrgChildren 使用同一套 tenantId（固定
   * ORG_BOX_TENANT_ID=1000008）/authCode（task_agent_{业务线 tenantId}）拼装规则（Requirement 1.2），
   * 供 OrgTreeSelector 的 searchUrl + params 直接对接。
   * OrganizationSelector 仅在 tenantPending 结束后才会挂载（见 OrgTreeSelector.tsx），故此处读取
   * currentTenantId 时必然已就绪，无需额外竞态保护。
   */
  const searchParams = useMemo(
    () => ({
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
      tenantId: ORG_BOX_TENANT_ID,
      wmOrgBoxAuth: { authCode: `task_agent_${currentTenantId}` },
    }),
    [currentTenantId],
  );

  return useMemo(
    () => ({ fetchOrgChildren, fetchOrgNodeById, getNodePath, clearCache, pidService, searchParams, loading, error }),
    [fetchOrgChildren, fetchOrgNodeById, getNodePath, clearCache, pidService, searchParams, loading, error],
  );
}

/**
 * 构造一个"以指定 rootOrgIds 为虚拟根节点"的 pidService 包装：供 CitySubFilter 使用，
 * 使其展示的完整组织树范围收敛为顶部全局筛选器已选中的 orgIds 子树（而非全局根节点开始的整棵树），
 * 与 BD 四象限图表本身的统计范围保持一致，避免用户在城市筛选器中看到顶部未选中范围的无关节点。
 *
 * 实现方式：
 * - `parentId` 为 0（组件请求顶层）时，不透传给真实 pidService，而是直接返回 rootOrgIds 对应的节点
 *   本身（从 fetchOrgNodeById 缓存读取；若某个 rootOrgId 尚未被缓存过节点信息——如用户从未展开过、
 *   仅通过顶部搜索级联直接选中——则退化为跳过该节点，不影响其余根节点正常展示）。
 * - `parentId` 非 0（正常逐层展开子节点）时，直接透传给底层 pidService，逻辑与顶部筛选器完全一致
 *   （同一份网络请求与内存缓存）。
 * - 回显模式（`orgIds` 参数非空，用于城市筛选器默认选中值的输入框回显）：调用 getNodePath 取完整路径后，
 *   裁剪掉 rootOrgIds 及其之上的祖先节点（即路径从虚拟根节点算起），避免回显文案包含顶部未展示的祖先层级。
 */
export function createScopedPidService(
  orgTree: Pick<ReturnType<typeof useOrgTree>, 'fetchOrgChildren' | 'fetchOrgNodeById' | 'getNodePath'>,
  rootOrgIds: number[],
) {
  const { fetchOrgChildren, fetchOrgNodeById, getNodePath } = orgTree;
  const rootIdSet = new Set(rootOrgIds);

  return async (params: { parentId?: number; orgIds?: string; value?: number[] }) => {
    const rawOrgIds = params?.orgIds;
    if (rawOrgIds) {
      const targetIds = rawOrgIds
        .split('_')
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n));
      const list = targetIds.flatMap((id) => {
        const fullPath = getNodePath(id);
        // 裁剪掉虚拟根节点之上的祖先：找到 fullPath 中第一个命中 rootIdSet 的下标，从该处开始截取
        const rootIdx = fullPath.findIndex((n) => rootIdSet.has(n.id));
        const scopedPath = rootIdx >= 0 ? fullPath.slice(rootIdx) : fullPath;
        return buildPathTree(scopedPath);
      });
      return { data: { code: 0, data: { isHq: false, list } } };
    }

    const parentId = params?.parentId ?? 0;
    if (parentId === 0) {
      // 顶层：直接返回 rootOrgIds 对应节点本身作为虚拟根，不透传到真实全局根节点查询
      const list = rootOrgIds
        .map((id) => fetchOrgNodeById(id))
        .filter((n): n is OrgNode => Boolean(n));
      return { data: { code: 0, data: { isHq: false, list } } };
    }

    try {
      const list = await fetchOrgChildren(parentId);
      return { data: { code: 0, data: { isHq: false, list } } };
    } catch (e) {
      return { data: { code: -1, msg: e instanceof Error ? e.message : '组织架构接口请求失败', data: { isHq: false, list: [] } } };
    }
  };
}
