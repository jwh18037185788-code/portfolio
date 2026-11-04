import { useCallback, useRef, useState } from 'react';
import type { OrgNode } from './useOrgTree';

/**
 * 「城市层级」orgType 清单：命中该清单即视为下钻已到达城市层，不再继续往上层查找候选，
 * 但会继续异步下钻其子节点（城市下一级，见 CITY_ORG_TYPE_WHITELIST 判定）供用户在
 * CitySubFilter 中展开二级选择。
 *
 * 🔍 交叉验证说明（2026-08-20）：学城《03_组织结构常量》文档为组织架构配置化改造前的静态枚举
 * （文档开头已警示"配置化上线后数据不再更新"），且经检索到的《会议纪要_20260819_外卖B端组织
 * 结构筛选器默认选中逻辑》（km 2781637817）曾记录真实接口返回的外卖城市 orgType 为 32121，
 * 与本清单的 3/21 存在出入；经与用户确认，用户已实际验证过当前业务场景下真实接口返回值确为
 * 3/21（会议纪要记录的 32121 可能为不同场景），故仍按 3/21 实现，此处如实记录交叉验证过程与
 * 结论，避免后续误认为该矛盾未被排查。
 *
 * 各业务线口径（用户确认为实际观察到的真实数据）：
 * - 外卖白领：3=外卖城市、21=外卖团队（新老结构并存，两者均视为城市层）
 * - 大连锁：10794
 * - 小连锁：31（对照旧枚举 WmOrgConstant.OrgType 为 CKA区域，配置化改造后实际承担小连锁城市层语义）
 * - 合作商/下沉：10=合作商城市（旧枚举口径）、10306=下沉城市层（配置化新增编码）
 */
export const CITY_LEVEL_ORG_TYPES = [3, 21, 10794, 31, 10, 10306];

/**
 * 允许直接用于 BD 数据查询的目标节点类型清单（命中即可直接使用，不需下钻）。
 * 涵盖「城市层级」（CITY_LEVEL_ORG_TYPES）与「城市下一级」两类节点，用于下钻过程中判定
 * 是否已找到可用候选、以及兜底叶子节点场景的类型放行：
 * 3=外卖城市、21=外卖团队、2=外卖联络点、1=外卖蜂窝、14=大连锁小组、15=大连锁组员、
 * 10794=大连锁城市层、18=小连锁部、19=小连锁组、31=CKA区域/小连锁城市层、10=合作商城市、
 * 32=合作商小组、33=合作商人员、10306=下沉城市层；
 * 10307/10308 经用户确认为「下沉/合作商城市」（10306）的城市下一级节点类型
 * （相当于外卖白领体系中的"联络点"层级），不纳入 CITY_LEVEL_ORG_TYPES 判定，仅作为其子节点候选。
 */
export const CITY_ORG_TYPE_WHITELIST = [
  3, 21, 2, 1, 14, 15, 10794, 18, 19, 31, 10, 32, 33, 10306, 10307, 10308,
];

/**
 * 供 CitySubFilter 的 filterDisableFn 使用：判断某节点是否允许被选中（城市层级 or 城市下一级）。
 * 未命中的祖先节点（如全国/大区/区域等更高层级）仍可正常展开查看，但勾选框会被禁用。
 */
export function isSelectableCityNode(orgType: number): boolean {
  return CITY_ORG_TYPE_WHITELIST.includes(orgType);
}

export type CityAnchorResult = { orgId: number } | { error: string };

const FALLBACK_ERROR = '暂无法确定默认城市范围，请手动选择';

/** 下钻兜底深度保护：避免组织树数据异常（如出现环）导致无限循环 */
const MAX_DEPTH = 12;

interface CachedAnchor {
  orgId: number;
}

/**
 * 二级外卖城市筛选器默认选中的下钻推断逻辑（Requirement 5.6 / 设计文档 4.4.2 节）。
 * 会话级一致性缓存：以顶部 orgIds 排序后 join(',') 为 key，同一组合仅在首次计算时下钻/随机，
 * 之后重复触发直接复用缓存值，仅当顶部 orgIds 实际变化时才重新计算。
 *
 * 下钻过程中汇总得到的候选集合仅用于内部挑选默认 cityOrgId，不再对外暴露为 options：
 * CitySubFilter 现已改为展示完整真实组织树（见 CitySubFilter.tsx / useOrgTree.createScopedPidService），
 * 不再需要一份预先算好的打平候选列表。
 *
 * 🚀 性能修复（2026-08-20）：此前实现用 `while(queue.length>0) { await fetchOrgChildren(...) }`
 * 逐个节点串行下钻——若顶部选中的是全国/大区等高层级节点，第一层下钻可能有多个平级子节点（如多个大区），
 * 串行等待导致耗时随"层数 × 每层节点数"线性累加，是"选中顶层节点后底部卡片需等待好几秒"的根因。
 * 现改为**按层并发 BFS**：每一层所有待下钻节点一次性 `Promise.all` 并发请求，取到结果后再合并判断
 * 下一层要继续下钻哪些分支，下钻总耗时只与树的深度（层数）相关，与每层节点数量无关，
 * 相比原实现有数量级提升（尤其顶层节点子节点较多时）。
 *
 * 🆕 两级选择支持：命中「城市层级」（CITY_LEVEL_ORG_TYPES）后不再直接停止下钻，而是继续异步查询
 * 该城市层节点的子节点（城市下一级，如外卖联络点/大连锁小组/小连锁部/合作商小组等）一并纳入候选集合，
 * 用于挑选更精确的默认值（优先从「城市层级」节点中选取，而非误选到城市下一级节点）。
 *
 * 🔧 修复：`fetchOrgChildren`/`fetchOrgNodeById` 由调用方（FocusTab.tsx）传入同一个 `useOrgTree()` 实例，
 * 不再在本 hook 内部单独调用 `useOrgTree()`。此前每次调用会各自创建独立的组织树缓存，导致本函数与
 * `OrgTreeSelector.tsx` 的节点缓存完全不共享，`fetchOrgNodeById` 首次查找必然落空，需从根节点重新下钻，
 * 白白多发起若干次网络请求，与设计文档 4.4.2 节"复用 OrgTreeSelector 的节点缓存/查询能力"的意图不符。
 * 该共享缓存同时也是按层并发下钻的重要加速来源：若某些节点此前已被顶部筛选器/CitySubFilter 展开过，
 * `fetchOrgChildren` 会直接命中内存缓存、不重复发起网络请求。
 */
export function useCityAnchor(
  fetchOrgChildren: (parentId: number) => Promise<OrgNode[]>,
  fetchOrgNodeById: (orgId: number) => OrgNode | undefined,
) {
  const cacheRef = useRef<Map<string, CachedAnchor>>(new Map());
  const [cityOrgId, setCityOrgIdState] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * 对已命中「城市层级」的节点，继续异步查询其下一级子节点（如联络点/大连锁小组/小连锁部/合作商小组），
   * 一并写入 candidatesMap（城市层节点本身 + 其城市下一级子节点）。
   * 若查询失败或子节点为空，城市层节点本身依然保留作为候选（不影响原有单层选择场景）。
   */
  const expandCityChildren = useCallback(
    async (cityNode: OrgNode, candidatesMap: Map<number, OrgNode>): Promise<void> => {
      candidatesMap.set(cityNode.id, cityNode);
      try {
        const children = await fetchOrgChildren(cityNode.id);
        children.forEach((child) => candidatesMap.set(child.id, child));
      } catch {
        // 城市下一级查询失败：保留城市层节点本身作为候选，不影响主流程
      }
    },
    [fetchOrgChildren],
  );

  /**
   * 对单个顶层勾选节点 anchorId 求出它所贡献的候选城市集合，写入 candidatesMap（按 id 去重合并）。
   *
   * 按层并发 BFS：`frontier` 保存当前层待下钻的节点，每层用 `Promise.all` 并发请求这一层全部节点的子节点，
   * 结果汇总后统一判断：命中「城市层级」的子节点 → 展开其下一级后作为候选，不再继续下钻该分支；
   * 命中「城市下一级」（总白名单但非城市层级）的子节点 → 直接作为候选，不再继续下钻；
   * 均未命中的子节点 → 汇入下一层 `frontier` 继续下钻；
   * 子节点为空（叶子）且自身未命中任何白名单 → 兜底把该叶子节点自身视为候选。
   *
   * 分支规则（与此前实现保持一致，仅将执行方式由串行改为按层并发）：
   * - 若 anchorId 对应节点本身已命中「城市层级」（如用户直接勾选的就是某个城市节点），
   *   以该节点为根继续展开其城市下一级子节点，一并作为候选，不反查同级兄弟节点。
   * - 若 anchorId 对应节点命中「城市下一级」类型，直接作为候选，不再下钻。
   * - 否则按层并发下钻，直到某层子节点命中白名单或到达 MAX_DEPTH 深度保护上限。
   */
  const resolveOneBranch = useCallback(
    async (anchorId: number, candidatesMap: Map<number, OrgNode>): Promise<void> => {
      const node: OrgNode | undefined = fetchOrgNodeById(anchorId);
      if (node && CITY_LEVEL_ORG_TYPES.includes(node.orgType)) {
        await expandCityChildren(node, candidatesMap);
        return;
      }
      if (node && CITY_ORG_TYPE_WHITELIST.includes(node.orgType)) {
        candidatesMap.set(node.id, node);
        return;
      }

      let frontier: (OrgNode | { id: number; orgType: number })[] = [node ?? { id: anchorId, orgType: -1 }];
      const visited = new Set<number>([anchorId]);

      for (let depth = 0; depth < MAX_DEPTH && frontier.length > 0; depth += 1) {
        // 同层所有节点并发请求子节点，下钻耗时只取决于层数，不取决于本层节点数量
        const settled = await Promise.allSettled(frontier.map((n) => fetchOrgChildren(n.id)));

        const nextFrontier: OrgNode[] = [];
        const cityLevelHits: OrgNode[] = [];
        const nextLevelHits: OrgNode[] = [];

        settled.forEach((result, idx) => {
          const current = frontier[idx];
          if (result.status === 'rejected') return; // 单分支查询失败：不阻塞其余分支，该分支不贡献候选
          const children = result.value;
          if (children.length === 0) {
            // 叶子节点兜底：无法进一步下钻，也无法确认类型，直接把当前节点当作候选城市
            if ('name' in current) candidatesMap.set(current.id, current as OrgNode);
            return;
          }
          children.forEach((child) => {
            if (visited.has(child.id)) return;
            visited.add(child.id);
            if (CITY_LEVEL_ORG_TYPES.includes(child.orgType)) {
              cityLevelHits.push(child);
            } else if (CITY_ORG_TYPE_WHITELIST.includes(child.orgType)) {
              nextLevelHits.push(child);
            } else {
              nextFrontier.push(child);
            }
          });
        });

        if (cityLevelHits.length > 0 || nextLevelHits.length > 0) {
          nextLevelHits.forEach((m) => candidatesMap.set(m.id, m));
          if (cityLevelHits.length > 0) {
            await Promise.all(cityLevelHits.map((m) => expandCityChildren(m, candidatesMap)));
          }
          return; // 已找到目标层级，该分支下钻结束，不再继续往下一层探
        }

        frontier = nextFrontier;
      }
    },
    [fetchOrgChildren, fetchOrgNodeById, expandCityChildren],
  );

  const resolveCityAnchor = useCallback(
    async (topOrgIds: number[]): Promise<CityAnchorResult> => {
      if (topOrgIds.length === 0) return { error: FALLBACK_ERROR };
      const cacheKey = [...topOrgIds].sort((a, b) => a - b).join(',');
      const cached = cacheRef.current.get(cacheKey);
      if (cached !== undefined) return { orgId: cached.orgId };

      // 多个顶层勾选节点分别求出各自贡献的候选，按 id 合并去重（场景：同时勾选多个城市/多个大区）
      const candidatesMap = new Map<number, OrgNode>();
      await Promise.all(topOrgIds.map((id) => resolveOneBranch(id, candidatesMap)));

      if (candidatesMap.size === 0) return { error: FALLBACK_ERROR };

      const options = [...candidatesMap.values()];
      // 默认选中值优先从「城市层级」节点中随机选取，避免默认直接选中城市下一级节点导致展示范围过窄
      const cityLevelOptions = options.filter((o) => CITY_LEVEL_ORG_TYPES.includes(o.orgType));
      const pickPool = cityLevelOptions.length > 0 ? cityLevelOptions : options;
      const picked = pickPool[Math.floor(Math.random() * pickPool.length)];
      const result = { orgId: picked.id };
      cacheRef.current.set(cacheKey, result);
      return result;
    },
    [resolveOneBranch],
  );

  /** 触发解析并更新内部状态，供 BdQuadrantCard 调用 */
  const resolve = useCallback(
    async (topOrgIds: number[]) => {
      setLoading(true);
      setError(null);
      try {
        const result = await resolveCityAnchor(topOrgIds);
        if ('error' in result) {
          setError(result.error);
          setCityOrgIdState(null);
        } else {
          setCityOrgIdState(result.orgId);
        }
      } finally {
        setLoading(false);
      }
    },
    [resolveCityAnchor],
  );

  /** 用户手动切换：仅更新选中值，不影响缓存 */
  const setCityOrgId = useCallback((orgId: number) => {
    setCityOrgIdState(orgId);
  }, []);

  return { cityOrgId, setCityOrgId, error, loading, resolve };
}
