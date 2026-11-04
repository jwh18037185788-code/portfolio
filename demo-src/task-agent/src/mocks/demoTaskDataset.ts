import type { AiExecutionRecordDto, BdTaskDto, BdTaskTypeConfigDto, ParentTaskGoalFeedback, ParentTaskOverviewDto, ProfileFieldDto, ShopDimensionItemDto, SubTaskOverviewDto } from '@/types/bdTask';
import { demoTypeAllowed, demoTabMatches } from './demoTenant';
import { focusDemoRecords } from './workbenchFocusPreview';
import { demoBusinessNames, demoTaskContents } from './demoBusinessCatalog';
import sanxi from '@/assets/merchants/sanxi.jpg';
import daziran from '@/assets/merchants/daziran.png';
import chuweiju from '@/assets/merchants/chuweiju.png';
import xianliaoli from '@/assets/merchants/xianliaoli.png';
import yongzhou from '@/assets/merchants/yongzhou.jpg';
import huoniu from '@/assets/merchants/huoniu.png';
import burger from '@/assets/merchants/burger.png';
import shaxian from '@/assets/merchants/shaxian.png';
import yanshe from '@/assets/merchants/yanshe.png';
import yaomei from '@/assets/merchants/yaomei.png';

export const previewTaskTypes: BdTaskTypeConfigDto[] = demoBusinessNames.map((name, index) => ({
  code: 9101 + index, name, indicators: [{ id: 7001 + index, name: demoTaskContents[index] ?? '任务目标达成情况' }],
}));
const day = (offset: number) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + offset); return date; };
const dateText = (offset: number) => day(offset).toLocaleDateString('sv-SE');
const merchantSeeds = [
  ['叁禧（天天下午茶）', '轻食/沙拉/健康餐', sanxi],
  ['大自然农庄', '湘菜', daziran],
  ['白云边·楚味居农家菜', '农家菜/家常菜', chuweiju],
  ['鱻创意料理研究所', '其他东南亚菜', xianliaoli],
  ['永州血鸭（现炒湘菜·土塘店）', '湘菜', yongzhou],
  ['火牛韩式烤肉', '韩式烤肉', huoniu],
  ['牛比buger', '汉堡', burger],
  ['卤福品·沙县小吃', '沙县小吃', shaxian],
  ['研舍（简餐·咖啡·欧亚店）', '咖啡', yanshe],
  ['幺妹很忙鲜包牛肉粉（常平板石店）', '米粉/米线', yaomei],
] as const;
const branches = ['常平', '康桥', '前滩', '惠南', '望京', '海淀', '南城', '朝阳', '金桥', '滨江', '五角场', '世纪公园', '陆家嘴', '张江', '北苑', '大望路', '亦庄', '东城', '西城', '丰台', '回龙观', '中关村', '三里屯', '静安', '徐汇', '虹桥', '人民广场', '浦东', '南山', '福田'];
const people = ['张明', '李婷', '王磊', '赵敏', '陈晨', '刘洋', '周颖', '吴昊', '徐悦', '孙宁', '马骏', '郑琳'];
// 真实商家头像仅作为视觉素材；以下分店、地址、人员与经营数据为虚构示例。
export const demoMerchants = Array.from({ length: 300 }, (_, index) => {
  const seed = merchantSeeds[index % merchantSeeds.length];
  const branch = branches[Math.floor(index / merchantSeeds.length)];
  const addressArea = branch === '常平' ? '广东省东莞市常平镇' : ['望京', '海淀', '朝阳', '北苑', '大望路', '亦庄', '东城', '西城', '丰台', '回龙观', '中关村', '三里屯'].includes(branch) ? `北京市${branch}街道` : ['南山', '福田'].includes(branch) ? `深圳市${branch}区` : `上海市${branch}街道`;
  const tags = index % 3 === 1 ? ['重点门店', '点评高分'] : index % 3 === 2 ? ['重点门店'] : [];
  const fields: ProfileFieldDto[] = [
    { key: 'businessStatus', label: '营业状态', valueType: 'TAG', value: index % 13 === 1 ? '不营业' : '门店营业' },
    { key: 'onlineStatus', label: '上单状态', valueType: 'TAG', value: index % 17 === 3 ? '未上线' : '上线中' },
    { key: 'categoryName', label: '品类', valueType: 'TAG', value: seed[1] },
    { key: 'deliveryType', label: '配送方式', valueType: 'TAG', value: index % 7 === 6 ? '商家自配' : '专送' },
    ...(tags.length ? [{ key: 'poiTags', label: '商家标签', valueType: 'TAG' as const, tagList: tags }] : []),
    { key: 'address', label: '经营地址', valueType: 'TEXT', value: `${addressArea}${index % 2 ? '创业一路' : '商业街'}${88 + index}号${101 + index % 12}室` },
  ];
  return { shopId: 90001 + index, name: index < 10 ? seed[0] : `${seed[0].split('（')[0]}（${branch}店）`, logo: seed[2], fields, categoryId: 100 + index % 10,
    bdName: people[index % people.length], bdId: `demo.bd${index % people.length + 1}`, experienceScore: Number((3.8 + index % 12 / 10).toFixed(1)) };
});

const basic = [
  { id: 201996411723, name: '11月追溯新签攻克监控（常平联络点）', type: 9102, count: 10, target: 10 },
  { id: 201996411724, name: '11月商家活动报名跟进（比例目标）', type: 9104, count: 18, target: 15 },
  { id: 201996411725, name: '11月门店菜单信息补齐专项', type: 9103, count: 6, target: 10 },
];
export const parentTasks: ParentTaskOverviewDto[] = basic.map((item, index) => ({
  parentTaskId: item.id, name: item.name, priority: index === 2 ? 2 : 1, taskType: item.type, contactObjectType: -3,
  expireDate: dateText(index === 2 ? 2 : 28), createdTime: day(0).getTime(),
  totalCount: item.count, subjectCount: item.count, completedCount: 0, targetCount: item.target,
  targetType: index === 1 ? 'PERCENT' : 'COUNT', targetPercent: index === 1 ? 80 : undefined,
  achieved: false, targetCompletionRate: 0, derivedStatus: index === 2 ? 3 : 1,
  distribution: {}, canDelete: true, canEdit: true, creatorId: `demo.manager${index + 1}`, creatorName: ['林经理', '陈经理', '刘经理'][index],
  parentTaskDescription: demoTaskContents[item.type - 9101], aiDirectExecute: index === 0,
  agentInfos: index === 0 ? [{ agentId: 'demo-call', agentName: '重点新签AI外呼', contactType: 2 }, { agentId: 'demo-im', agentName: '智能商家沟通', contactType: 10 }] : [],
}));
parentTasks.push(...focusDemoRecords.map(({ item }, index): ParentTaskOverviewDto => ({
  parentTaskId: item.id, name: item.name, taskType: item.taskType!, priority: item.priority,
  contactObjectType: [6, 7].includes(index) ? -1 : [20, 21].includes(index) ? -9 : -3,
  expireDate: new Date(item.expireDate).toLocaleDateString('sv-SE'), createdTime: item.createdTime,
  totalCount: item.subTaskTotalCount, subjectCount: item.subTaskTotalCount, completedCount: item.subTaskAchievedCount,
  targetCount: item.targetCount!, targetType: 'COUNT', achieved: item.goalAchieved,
  targetCompletionRate: item.subTaskAchievedCount / item.targetCount! * 100,
  derivedStatus: item.statusLabel === 1 ? 0 : item.statusLabel === 2 ? 2 : item.statusLabel === 3 ? 3 : 1,
  distribution: {}, canDelete: true, canEdit: true, creatorId: item.creatorId, creatorName: item.creatorName,
  parentTaskDescription: demoTaskContents[item.taskType! - 9101], aiDirectExecute: !!item.agentId,
  agentInfos: item.agentId ? [{ agentId: item.agentId, agentName: item.agentName!, contactType: 10 }] : [],
})));

// 公海页同样覆盖每家商家至少三个不同批次。
parentTasks.push({ ...parentTasks[0], parentTaskId: 201996411726, name: '11月公海线索陌拜跟进（常平联络点）',
  contactObjectType: -1, totalCount: 90, subjectCount: 30, completedCount: 18, targetCount: 50,
  aiDirectExecute: false, agentInfos: [], parentTaskDescription: '跟进公海线索认领与首次拜访，确认经营情况并推动上线' });

// 两种租户专属实体复用既有品牌/商品界面，不增加业务服务。
parentTasks.push({ ...parentTasks[0], parentTaskId: 201996411727, name: '非重点品牌神抢手前置美补监控',
  taskType: 9103, contactObjectType: -10, totalCount: 4, subjectCount: 4, completedCount: 1, targetCount: 4,
  aiDirectExecute: false, agentInfos: [], parentTaskDescription: '检查非重点品牌神抢手补贴配置，跟进品牌经营目标达成' });
parentTasks.push({ ...parentTasks[0], parentTaskId: 201996411728, name: '11月拼好饭套餐价格与库存治理',
  taskType: 9105, contactObjectType: -13, totalCount: 36, subjectCount: 12, completedCount: 15, targetCount: 30,
  aiDirectExecute: false, agentInfos: [], parentTaskDescription: '检核拼好饭套餐价格、库存及售卖状态，完善商品经营信息' });

export const tasks: BdTaskDto[] = [];
let merchantCursor = 0;
const productNames = ['招牌鲜切牛肉饭', '香辣鸡腿双拼套餐', '原味手工牛肉粉', '经典冰美式', '招牌手打柠檬茶', '椒香小炒肉便当'];
parentTasks.forEach((parent, parentIndex) => {
  const sku = [-9, -13].includes(parent.contactObjectType!);
  const brand = parent.contactObjectType === -10;
  const expectedCompleted = parentIndex < 3 ? [3, 9, 2][parentIndex] : parent.completedCount;
  for (let index = 0; index < parent.totalCount; index++) {
    const merchantIndex = sku ? Math.floor(index / 3) : parent.contactObjectType === -1 ? index % 30 : (merchantCursor + index) % demoMerchants.length;
    const merchant = demoMerchants[merchantIndex];
    const completed = Math.floor((index + 1) * expectedCompleted / parent.totalCount) > Math.floor(index * expectedCompleted / parent.totalCount);
    const status = parentIndex === 0 ? [4, 0, 6, 5, 2, 0, 3, 1, 0, 0][index] : completed ? [4, 1, 6][index % 3] : [0, 2, 5, 3, 0][index % 5];
    const taskId = parentIndex < 3 ? 90001 + parentIndex * 1000 + index : 100000 + (parentIndex - 3) * 1000 + index;
    const hasResults = parent.contactObjectType === -3 && (status === 6 && index % 4 !== 1 || index % 11 === 0);
    const reason = status === 5 ? 'AI任务执行中，结果尚未生成。' : status === 6 && !hasResults ? '历史任务仅保留执行状态，未保存可展示的渠道明细。' : index % 9 === 4 ? '该任务尚未发起AI沟通，暂无可展示的执行结果。' : undefined;
    const brandName = ['叁禧餐饮', '大自然农庄', '楚味居餐饮', '火牛烤肉'][index % 4];
    tasks.push({ taskId, shopId: brand ? 0 : merchant.shopId, shopName: brand ? brandName : merchant.name, objectId: brand ? String(73001 + index % 4) : sku ? String(120000000 + parentIndex * 1000 + index) : String(merchant.shopId),
      objectName: brand ? brandName : sku ? `${parent.contactObjectType === -13 ? '拼好饭·' : ''}${productNames[index % productNames.length]}${index % 3 === 2 ? '（双人份）' : ''}` : undefined,
      contactObjectType: parent.contactObjectType, parentTaskId: parent.parentTaskId, parentTaskName: parent.name,
      bdId: merchant.bdId, bdName: merchant.bdName, taskTypeDesc: demoBusinessNames[parent.taskType - 9101],
      taskContent: brand ? parent.parentTaskDescription : parent.contactObjectType === -13 ? '检核拼好饭套餐价格、库存及售卖状态，完善商品经营信息' : sku ? '检核商品价格与经营信息，完成神抢手报名及库存更新' : demoTaskContents[parent.taskType - 9101] ?? '跟进商家完成本月经营目标',
      expireDate: parent.expireDate, createdTime: parent.createdTime, status, executorType: [5, 6].includes(status) ? 1 : 0,
      feedbackResult: status === 1 ? 1 : status === 2 ? 2 : 0, feedbackTime: status === 1 || status === 2 ? dateText(0) : '',
      remark: status === 2 ? ['商家当前无活动参与意向，已约定下周再次沟通', '商家库存不足，当前无法完成商品报名', '门店暂未满足报名门槛，待经营指标恢复后跟进'][index % 3] : '',
      targetValue: '1', actualValue: [4, 1, 6].includes(status) ? '1' : '0',
      checkInfo: { bizIndicatorId: 7001 + parent.taskType - 9101, operator: '≥', targetValue: '1' },
      description: parent.taskType === 9102 ? `未攻克原因：${status === 4 ? '已攻克' : index % 2 ? '订单数低于标准（非到店和自下单）' : '单均与订单数未达标'}` : sku ? '当前商品有价格优化空间，请结合近期销量与库存确认报名条件' : '请根据商家近期经营情况跟进，确认策略生效并记录沟通结果',
      canDelete: true, aiDirectExecute: !!parent.aiDirectExecute,
      aiExecutionResultContactTypes: hasResults ? index % 2 ? [10] : [2, 10] : undefined,
      aiExecutionResultUnavailableReason: reason,
      externalTaskId: hasResults ? `DEMO-AI-${taskId}` : undefined,
      logo: merchant.logo, experienceScore: parent.contactObjectType === -1 ? undefined : merchant.experienceScore,
      experienceReachTarget: merchant.experienceScore >= 4.2,
      profileFields: brand ? [{ key: 'brandNature', label: '品牌类型', valueType: 'TAG', value: '非重点品牌' }, { key: 'categoryName', label: '主营品类', valueType: 'TAG', value: '中式快餐' }, { key: 'storeCount', label: '覆盖门店', valueType: 'TEXT', value: `${12 + index % 4 * 6}家` }] : parent.contactObjectType === -1
        ? [{ key: 'categoryName', label: '品类', valueType: 'TAG', value: merchantSeeds[merchantIndex % 10][1] }, { key: 'claimStatus', label: '认领上单状态', valueType: 'TAG', value: index % 2 ? '已认领' : '待认领' }, ...merchant.fields.filter(f => f.key === 'address')]
        : merchant.fields,
    });
  }
  if (!sku) merchantCursor = (merchantCursor + parent.totalCount) % demoMerchants.length;
  const related = tasks.filter(t => t.parentTaskId === parent.parentTaskId);
  parent.subjectCount = new Set(related.map(t => brand ? t.objectId : t.shopId)).size;
  parent.completedCount = related.filter(t => [1, 4, 6].includes(t.status)).length;
  parent.distribution = { AI_DONE: related.filter(t => t.status === 6).length, BD_DONE: related.filter(t => [1, 4].includes(t.status)).length,
    IN_PROGRESS: related.filter(t => t.status === 5).length, NOT_STARTED: related.filter(t => t.status === 0).length };
  parent.targetCompletionRate = parent.completedCount / parent.targetCount * 100;
});

export const insufficientGoalFeedback: ParentTaskGoalFeedback = { phase: 'CURRENT', reason: 'INSUFFICIENT_ITEMS', targetType: 'COUNT', targetCount: 10, totalCount: 6, shortfallCount: 4,
  message: '当前批次目标数量10项，任务项总量仅6项，当前无法达标，请补充任务项或调整目标' };
export const executionResults: AiExecutionRecordDto[] = [
  { id: 41001, executionNo: 1, multipleExecutions: false, externalTaskId: 'DEMO-CALL', result: { contactType: 2, status: 4, executionStatus: 3, summarizing: ['已向商家介绍本期活动报名门槛与补贴方案。', '商家有参与意向，需BD补充收益测算并跟进活动生效。'] } },
  ...['拒绝', '犹豫', '同意'].map((tagName, index): AiExecutionRecordDto => ({ id: 42001 + index, executionNo: index + 1, multipleExecutions: true, externalTaskId: `DEMO-IM-${index}`, result: { contactType: 10, status: 4, executionStatus: 3, conversationStatus: 3, tagName,
    skillResultDesc: index === 2 ? '减配送费-执行成功，减配送费3元' : '减配送费-执行失败', releaseReasonMsg: index === 2 ? '目标达成' : '会话过期' } })),
];

const countsOf = (rows: BdTaskDto[]) => rows.reduce<Record<number, number>>((counts, task) => { counts[task.status] = (counts[task.status] ?? 0) + 1; return counts; }, {});
/** Aggregate SKU display rows before pagination; operations retain their real task IDs. */
export function groupDemoTasks(rows: BdTaskDto[]): BdTaskDto[] {
  const groups = new Map<string, BdTaskDto>();
  const result: BdTaskDto[] = [];
  for (const task of rows) {
    if (![-9, -13].includes(task.contactObjectType!)) { result.push(task); continue; }
    const key = `${task.parentTaskId}:${task.shopId}`;
    let group = groups.get(key);
    if (!group) { group = { ...task, taskId: -task.taskId, canDelete: false, skuTaskAggregation: { taskCount: 0, statusCounts: {}, subTasks: [] } }; groups.set(key, group); result.push(group); }
    group.skuTaskAggregation!.subTasks.push(task);
    group.skuTaskAggregation!.taskCount++;
    group.skuTaskAggregation!.statusCounts = countsOf(group.skuTaskAggregation!.subTasks);
  }
  return result;
}
function overviewOf(task: BdTaskDto): SubTaskOverviewDto {
  const parent = parentTasks.find(p => p.parentTaskId === task.parentTaskId)!;
  const overview: SubTaskOverviewDto = { subTaskId: task.taskId, name: task.taskContent, description: task.taskContent, status: task.status,
    contactObjectType: task.contactObjectType, objectId: task.objectId!, shopId: task.shopId, parentTaskId: task.parentTaskId, parentTaskName: parent.name,
    expireDate: task.expireDate, priority: parent.priority, aiDirectExecute: task.aiDirectExecute, creatorId: parent.creatorId, creatorName: parent.creatorName, createdTime: parent.createdTime };
  if (task.skuTaskAggregation) Object.assign(overview, { name: parent.name, taskCount: task.skuTaskAggregation.taskCount, statusCounts: task.skuTaskAggregation.statusCounts,
    subTasks: task.skuTaskAggregation.subTasks.map(t => ({ subTaskId: t.taskId, name: t.objectName!, objectName: t.objectName, status: t.status, parentTaskId: t.parentTaskId, expireDate: t.expireDate, contactObjectType: t.contactObjectType })) });
  return overview;
}
export function shopRows(params: Record<string, unknown> = {}): ShopDimensionItemDto[] {
  const scoped = tasks.filter(task => demoTypeAllowed(task.contactObjectType, params.tenantId) && demoTabMatches(task.contactObjectType, params.tab ?? 1));
  if (Number(params.tab) === 3) {
    return [...new Set(scoped.map(task => task.objectId!))].map(objectId => {
      const related = scoped.filter(task => task.objectId === objectId);
      return { objectId, objectName: related[0].objectName, shopId: 0, shopName: related[0].objectName!, logo: related[0].logo,
        taskCount: related.length, achievedTaskCount: related.filter(t => [1, 4, 6].includes(t.status)).length,
        executorMis: related[0].bdId, executorName: related[0].bdName, profileFields: related[0].profileFields,
        subTaskOverviews: related.map(overviewOf) };
    });
  }
  const publicSea = Number(params.tab) === 2;
  return demoMerchants.flatMap(merchant => {
    const related = scoped.filter(task => task.shopId === merchant.shopId);
    if (!related.length) return [];
    const overviews = groupDemoTasks(related).map(overviewOf);
    const goods = (task: SubTaskOverviewDto) => [-9, -13].includes(task.contactObjectType!);
    return [{ shopId: merchant.shopId, shopName: merchant.name, objectId: String(merchant.shopId), logo: merchant.logo,
      taskCount: related.length, achievedTaskCount: related.filter(t => [1, 4, 6].includes(t.status)).length,
      executorMis: merchant.bdId, executorName: merchant.bdName, experienceScore: merchant.experienceScore, experienceReachTarget: merchant.experienceScore >= 4.2,
      profileFields: publicSea ? related[0].profileFields : merchant.fields,
      subTaskOverviews: [...overviews.filter(t => !goods(t)).slice(0, 2), ...overviews.filter(goods), ...overviews.filter(t => !goods(t)).slice(2)] }];
  });
}
