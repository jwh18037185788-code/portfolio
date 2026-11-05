const sprintContent = {
  "introTitle": "Sprint 项目",
  "introItems": [
    "智能生产力产品组Top1的需求：给全国CM、BDM、BD*使用",
    "跑通AI提效工作流*：每3周为一迭代周期，产品需向上汇报一次进展"
  ],
  "notes": [
    "*BD：Business Development 的缩写，指业务拓展、商务开发人员，是业务团队中的一线市场推广人员",
    "*AI提效工作流：长期目标实现业务需求自闭环，短期目标在开发过程中不断优化协作方式，沉淀skill，逐渐减少人力与工时"
  ],
  "backgroundTitle": "背景",
  "background": "当前蜜蜂和先富（BD日常使用的APP和PC平台）有很多任务系统，且分散在各业务团队维护的板块里，缺乏统一收口，导致BD管理者无法统览待办，优先级与AI调度也难以统一管理，BD也需要在多平台上接收处理任务。任务Agent是面向前线管理者和一线BD使用的大而全的收口工具，统一收拢总部、团队、系统等多方下发的各类任务。系统采用GUI加CUI的形式，包含任务工作台、任务批次列表、任务项列表三大板块，为管理者提供任务总览、风险预警、查看AI赋能情况等能力，提升管理决策效率；为BD提供批量执行、AI执行、任务管理等能力，提升任务执行效率。",
  "stages": [
    {
      "title": "阶段一",
      "goal": [
        "新增任务工作台板块",
        "优化出可实现、易复用的视觉风格"
      ],
      "month": "8月任务：",
      "tasks": [
        "新增任务工作台",
        "在demo基础上更新设计风格"
      ]
    },
    {
      "title": "阶段二",
      "goal": [
        "沉淀出可跟随代码的设计规则",
        "用新需求验证效果、调整设计规则"
      ],
      "month": "9月任务：",
      "tasks": [
        "任务批次列表与任务项列表体验优化，统一视觉风格+交互优化",
        "UI一致性协作开发规范包",
        "新增批次执行明细卡片",
        "兼容多维度实体",
        "执行抽屉页重构",
        "线上问题走查"
      ]
    },
    {
      "title": "阶段三",
      "goal": [
        "帮助产品实现自闭环",
        "设计职责由做需求转为审核需求"
      ],
      "month": "10月任务：",
      "tasks": [
        "移动端迁移探索（放进蜜蜂app）",
        "增加智能IM执行结果展示",
        "解决走查问题",
        "审核新需求设计效果"
      ]
    },
    {
      "title": "阶段四",
      "goal": [
        "由PC端迁移至移动端",
        "探索PC端GUI+CUI深度融合方向"
      ],
      "month": "后续任务：",
      "tasks": [
        "完成移动端迁移",
        "探索GUI+CUI深度融合方案（比如在对话框里输入要查询的任务，能够自动在GUI页面上把相应任务打开；或者是在页面上圈选或点击某个任务，自动把这些被选中的参数同步给对话框跟AI做交互沟通。）",
        "任务工作台-详细数据tab页重构"
      ]
    }
  ],
  "flows": {
    "传统流程": [
      "产品提需",
      "交互方案",
      "技术评审",
      "功能开发",
      "复原设计稿",
      "测试",
      "部署上线"
    ],
    "coding流程": [
      "demo",
      "三方评审",
      "初版方案",
      "功能开发",
      "体验优化+走查",
      "测试",
      "部署上线"
    ]
  },
  "conditions": [
    "方案发生大改动的两种情况：",
    "后端技术方案实现困难",
    "一线BD进行使用测试后反馈意见"
  ],
  "challengeOne": [
    "如何在既有组件与品牌规范下，让复杂数据清晰、一致？",
    "工作台既要承载业务数据，也要探索产品的视觉方向。设计基于 Ant Design 组件，并与小蜜既有视觉语言保持协调。",
    "探索 01｜借助 AI 发散视觉方案",
    "基于 PRD，用 NoCode、CatDesk、Codex 和 Figma Make 探索首轮方案。",
    "Codex 擅长组织复杂信息，Figma Make 便于调整视觉与设计稿。",
    "探索 02｜重新审视信息优先级",
    "初版 Demo 存在三类问题：数据重复、容器混杂、重点模糊。过多数据与功能，掩盖了管理者真正需要关注的信息。",
    "设计重点由视觉探索转向信息重组。",
    "工作台应像一份每日概览，让管理者快速判断整体状态，找到需要关注的人和事。",
    "探索 03｜让数据表达服务于管理决策",
    "围绕管理决策，深化四类信息：",
    "- 通过配图与差异化色彩强化 AI 总结中的风险状态感知。\n- 将任务批次按业务来源进行分类，用图表呈现任务构成与到期风险。\n- 结合任务完成率与任务项总数，利用四象限图识别需要重点关注的 BD。\n- 图表可视化表达 AI 执行情况、任务来源等模块数据。",
    "设计思考",
    "视觉秩序来自信息层级，也服务于理解与判断。"
  ],
  "challengeTwo": [
    "如何让用户看懂任务，并明确下一步操作？",
    "原卡片混排门店属性、任务状态、核检结果与过程提示，信息完整，层级却不清晰。",
    "设计洞察｜区分稳定信息与动态信息",
    "卡片信息可分为两类：",
    "- 稳定信息：门店名称、基础属性与任务背景。\n- 动态信息：当前状态、核检结果与阶段提示。",
    "阅读目的不同，组织方式也应有所区分。",
    "设计方案｜建立可预期的信息与操作结构",
    "左侧集中稳定信息，交代任务背景；右侧呈现状态与反馈，突出当前进展。",
    "底部操作随状态切换，衔接“了解对象—判断状态—执行操作”的路径。",
    "设计思考",
    "按信息的变化属性分区，让卡片随任务进展提供清楚的操作线索。"
  ],
  "reflection": [
    "功能会变化，解决问题的方法可以积累复用。",
    "我将 AI 协作问题、需求沟通经验、Coding 技巧与 Prompt 整理为复盘文档。",
    "为团队后续的需求探索、原型开发与方案验证提供参考，逐步建立自主的 AI 协作流程。",
    "设计思考",
    "AI 加快探索与实现，设计师仍需理解问题、判断方案、总结方法。",
    "积累界面，也积累每次决策背后的思考。"
  ]
};

const sprintAssetNames = {
  demo: '初版 Demo',
  rules: 'UI一致性协作开发规范包',
  review: '线上问题走查',
  mobile: '移动端迁移探索',
};

const sprintImages = {
  "card-after": {
    "file": "card-after.jpg",
    "scroll": false,
    "title": "任务卡片优化后"
  },
  "card-before": {
    "file": "card-before.jpg",
    "scroll": false,
    "title": "任务卡片优化前"
  },
  "catdesk": {
    "file": "catdesk.jpg",
    "scroll": false,
    "title": "第一轮 CatDesk 方案"
  },
  "codex": {
    "file": "codex.jpg",
    "scroll": false,
    "title": "第一轮 Codex 方案"
  },
  "demo": {
    "file": "demo.jpg",
    "scroll": true,
    "title": "初版 Demo"
  },
  "figma": {
    "file": "figma.jpg",
    "scroll": true,
    "title": "第一轮 Figma Make 方案"
  },
  "honey": {
    "file": "honey.png",
    "scroll": false,
    "title": "小蜜 · 首页信息架构优化"
  },
  "kangaroo-1": {
    "file": "kangaroo-1.png",
    "scroll": true,
    "title": "袋鼠参谋 · 场景入口"
  },
  "kangaroo-2": {
    "file": "kangaroo-2.png",
    "scroll": true,
    "title": "袋鼠参谋 · 热门问一键填入"
  },
  "kangaroo-3": {
    "file": "kangaroo-3.png",
    "scroll": true,
    "title": "袋鼠参谋 · 结构化意图"
  },
  "mobile": {
    "file": "mobile.jpg",
    "scroll": false,
    "title": "移动端迁移探索"
  },
  "nocode": {
    "file": "nocode-9e2f5121f1.png",
    "scroll": false,
    "title": "第一轮 NoCode 方案"
  },
  "overview": {
    "file": "overview.jpg",
    "scroll": true,
    "title": "工作台总览与重点模块深化"
  },
  "problem": {
    "file": "problem.jpg",
    "scroll": true,
    "title": "初版 Demo 存在三类问题"
  },
  "reflection": {
    "file": "reflection.jpg",
    "scroll": true,
    "title": "项目复盘文档"
  },
  "review": {
    "file": "review-4df9aea964.jpg",
    "scroll": true,
    "title": "线上问题走查"
  },
  "solution-codex": {
    "file": "solution-codex.jpg",
    "scroll": true,
    "title": "Codex · 信息结构优化"
  },
  "solution-figma": {
    "file": "solution-figma.jpg",
    "scroll": true,
    "title": "Figma · 视觉层级优化"
  }
};
function sprintMedia(key, tag='DESIGN DETAIL') {
  if(key==='rules')return sprintRulesText(tag);
  const image=sprintImages[key];
  if(!image)return sprintPlaceholder(sprintAssetNames.rules,'IMAGE PENDING');
  const src=`${base}assets/sprint/${image.file}`;
  return `<div class="case-media${key==='honey'?' case-media-honey':''}"><div class="case-media-toolbar"><span>${sprintEsc(image.title)}</span><button type="button" data-image="${src}" data-title="${sprintEsc(image.title)}" data-view="${image.scroll?'scroll':'fit'}" aria-label="放大查看：${sprintEsc(image.title)}">放大查看 <span aria-hidden="true">↗</span></button></div><div class="case-media-viewport home-image media-pending" aria-busy="true" data-scroll="${image.scroll}" role="region" aria-label="${sprintEsc(image.title)}图片预览${image.scroll?'，可上下滚动':''}"${image.scroll?' tabindex="0"':''}>${portfolioImagePlaceholder(`<img src="${src}" alt="${sprintEsc(image.title)}" loading="lazy" decoding="async">`)}</div>${image.scroll?'<div class="case-media-scroll-note">上下滚动浏览 <span aria-hidden="true">↓</span></div>':''}</div>`;
}
function sprintRulesText(tag) {
  const documentLink=(file,title,note)=>`<a class="sprint-document-link" href="${base}docs/ui-consistency/${file}.html" data-sprint-document="${file}"><span class="sprint-document-icon" aria-hidden="true">≡</span><span><strong>${title}</strong><small>${note} · 查看全文</small></span><span aria-hidden="true">↗</span></a>`;
  return `<div class="case-media sprint-rules-media"><div class="case-media-toolbar"><span>UI一致性协作开发规范包</span><span>文字版</span></div><div class="sprint-rules-content" role="region" aria-label="UI一致性协作开发规范包文字说明，可上下滚动" tabindex="0"><h3>UI一致性协作开发规范包</h3><section><h4>任何开发任务</h4><p>→ 都要遵守 AGENTS.md（项目级 AI 开发规则）</p>${documentLink('agents','AGENTS.md','项目级 AI 开发规则')}</section><section><h4>新增页面 / 修改 UI</h4><p>→ 再使用 UI Consistency Skill（UI 一致性开发 Skill）</p>${documentLink('ui-consistency','UI_Consistency_Development_Skill.md','UI 一致性开发规范')}</section><section class="sprint-rules-prompt"><h4>调用提示词：</h4><p>请先阅读当前仓库的 <code>AGENTS.md</code> 和 <code>docs/UI_Consistency_Development_Skill.md</code>。</p><p>本次我要在现有任务管理Agent-任务工作台-详细数据中新增「批次执行明细」模块。</p><p>开始编码前，先扫描当前代码库，找出与该模块最接近的 2～5 个现有页面或组件，并告诉我：</p><ul><li>可以直接复用哪些组件；</li><li>可以直接复用哪些样式；</li><li>哪些布局结构可以参考；</li><li>哪些内容确实需要新增。</li></ul><p>UI 实现必须继承当前项目已有视觉体系，不要自行建立新的颜色、字号、间距、圆角、按钮、Tag、卡片或表单规范。</p><p>完成分析后再开始实现以下需求：</p><p>【任务agent_PRD】任务工作台-详细数据-批次执行明细 这是具体功能文档的链接，请查看</p></section></div><div class="case-media-scroll-note">上下滚动阅读 · 点击文档查看全文 <span aria-hidden="true">↓</span></div></div>`;
}
const sprintDocumentCache = new Map();
const sprintDocumentHistory = new WeakMap();
const sprintDocuments = {
  agents: {title:'AGENTS.md',file:'AGENTS.md'},
  'ui-consistency': {title:'UI 一致性开发规范',file:'UI_Consistency_Development_Skill.md'},
};
async function sprintOpenDocument(link) {
  const key=link.dataset.sprintDocument, info=sprintDocuments[key];
  const media=link.closest('.sprint-rules-media');
  if(!info||!media)return;
  const history=sprintDocumentHistory.get(media)||[];
  const previous={html:media.innerHTML,scroll:media.querySelector('.sprint-rules-content').scrollTop,key:media.dataset.document||'',focus:key};
  history.push(previous);
  sprintDocumentHistory.set(media,history);
  media.dataset.document=key;
  media.innerHTML=`<div class="case-media-toolbar sprint-document-toolbar"><button type="button" data-rules-back>← 返回</button><span>${sprintEsc(info.title)}</span><a href="${base}docs/ui-consistency/${info.file}" download>下载 ↓</a></div><div class="sprint-rules-content sprint-inline-document" role="region" aria-label="${sprintEsc(info.title)}全文，可上下滚动" tabindex="0" aria-busy="true"><p role="status">正在载入文档…</p></div><div class="case-media-scroll-note">上下滚动阅读全文 <span aria-hidden="true">↓</span></div>`;
  try {
    if(!sprintDocumentCache.has(key))sprintDocumentCache.set(key,fetch(`${base}docs/ui-consistency/${key}.html`).then(response=>{
      if(!response.ok)throw new Error('Document unavailable');
      return response.text();
    }));
    const html=await sprintDocumentCache.get(key);
    if(!media.isConnected||history.at(-1)!==previous||media.dataset.document!==key)return;
    const main=new DOMParser().parseFromString(html,'text/html').querySelector('main');
    if(!main)throw new Error('Document content unavailable');
    main.querySelectorAll('a').forEach(anchor=>{
      const target=anchor.getAttribute('href').replace('.html','');
      if(sprintDocuments[target]){
        anchor.dataset.sprintDocument=target;
        anchor.href=`${base}docs/ui-consistency/${target}.html`;
      }
    });
    const content=media.querySelector('.sprint-rules-content');
    content.innerHTML=main.innerHTML;
    content.removeAttribute('aria-busy');
    media.querySelector('[data-rules-back]').focus({preventScroll:true});
  } catch(error) {
    sprintDocumentCache.delete(key);
    if(media.isConnected&&history.at(-1)===previous){
      const content=media.querySelector('.sprint-rules-content');
      content.innerHTML='<p role="status">文档暂时无法载入，请返回后重试。</p>';
      content.removeAttribute('aria-busy');
    }
  }
}
function sprintReturnDocument(button) {
  const media=button.closest('.sprint-rules-media');
  const previous=sprintDocumentHistory.get(media)?.pop();
  if(!previous)return;
  media.innerHTML=previous.html;
  media.dataset.document=previous.key;
  media.querySelector('.sprint-rules-content').scrollTop=previous.scroll;
  media.querySelector(`[data-sprint-document="${previous.focus}"]`)?.focus({preventScroll:true});
}
function sprintMediaGallery(id, entries, selected=0, label='方案配图切换') {
  const entry=entries[selected];
  return `<div class="case-gallery"><div class="sprint-gallery-controls" role="group" aria-label="${sprintEsc(label)}">${entries.map((item,i)=>`<button type="button" data-case-media="${item.key}" data-case-panel="${id}" data-case-caption="${sprintEsc(item.caption||'')}" data-case-tag="${sprintEsc(item.label)}" aria-pressed="${i===selected}" aria-controls="${id}">${sprintEsc(item.label)}</button>`).join('')}</div><figure id="${id}" class="case-gallery-panel" aria-live="polite" aria-atomic="true">${sprintMedia(entry.key,entry.label)}${entry.caption?`<figcaption>${sprintEsc(entry.caption)}</figcaption>`:''}</figure></div>`;
}
function sprintKangarooMedia() {
  return `<div class="case-media case-media-phones"><div class="case-media-toolbar"><span>袋鼠参谋 · AI对话体验优化</span><span>点击单张放大</span></div><div class="case-phone-strip">${['场景入口','热门问一键填入','结构化意图'].map((title,i)=>`<button type="button" data-image="${base}assets/sprint/kangaroo-${i+1}.png" data-title="袋鼠参谋 · ${title}" data-view="fit" aria-label="放大查看：袋鼠参谋 · ${title}"><span class="home-image-frame home-image media-pending" aria-busy="true">${portfolioImagePlaceholder(`<img src="${base}assets/sprint/kangaroo-${i+1}.png" alt="袋鼠参谋 · ${title}" loading="lazy" decoding="async">`)}</span><span>0${i+1} / ${title}</span></button>`).join('')}</div></div>`;
}

const sprintTools = ['NoCode', 'CatDesk', 'Codex', 'Figma Make'];
const sprintToolObservations = [
  '产品侧产出了初始版本，作为业务需求和信息布局的初始对照。',
  '与 NoCode 初版在信息组织与页面布局上差别不大，对后续方向探索的增量有限。',
  '在本次项目的信息分类、逻辑梳理、层级组织及整体秩序方面更清晰。',
  '视觉呈现与信息密度更合理，且可转为可直接修改的设计稿。',
];
const sprintEsc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sprintParagraph = text => `<p>${sprintEsc(text)}</p>`;
const sprintBulletList = text => `<ul>${text.split('\n').map(line => `<li>${sprintEsc(line.replace(/^- /,''))}</li>`).join('')}</ul>`;
const sprintAssetButton = (key, label) => `<button type="button" class="sprint-asset-link" data-sprint-asset="${key}" aria-controls="sprint-evidence-preview" aria-pressed="${key==='demo'}">${sprintEsc(label)}</button>`;
function sprintInline(text) {
  let html=sprintEsc(text);
  for(const [label,key] of [['UI一致性协作开发规范包','rules'],['线上问题走查','review'],['移动端迁移探索','mobile'],['demo','demo']]) html=html.replace(label,sprintAssetButton(key,label));
  return html;
}
const sprintPlaceholder = (title, tag='IMAGE') => `<div class="sprint-placeholder" role="img" aria-label="${sprintEsc(title)}"><span class="sprint-placeholder-tag">${tag}</span><strong>${sprintEsc(title)}</strong><span class="sprint-placeholder-note">图片待补充</span></div>`;
const sprintChapterHead = (number, english, title) => `<header class="sprint-chapter-head"><p class="sprint-kicker">${number} / ${english}</p><h2>${title}</h2></header>`;
function sprintOverview() {
  return `<section id="work" class="sprint-overview sprint-section reveal">${sectionLabel('01','Sprint｜任务管理 Agent')}<header class="sprint-lead"><h2>先看清，<br>再行动。</h2><span>01 / Project Overview</span></header><div class="sprint-overview-grid"><div class="sprint-introduction"><h3>${sprintContent.introTitle}</h3><ul class="sprint-intro-points">${sprintContent.introItems.map(item=>`<li>${sprintEsc(item)}</li>`).join('')}</ul><div class="sprint-terms">${sprintContent.notes.map(sprintParagraph).join('')}</div></div><div class="sprint-background"><h3>${sprintContent.backgroundTitle}</h3><p>${sprintEsc(sprintContent.background)}</p></div></div></section>`;
}
function sprintFlow(name) {
  const traditional=name==='传统流程';
  const owners=traditional ? [['product'],['design'],['development'],['development','design'],['development'],['development'],['development']] : [['product','design'],['product'],['design'],['development','product'],['design'],['design'],['development','product','design']];
  const ownerLabels={product:'产品',development:'研发',design:'设计'};
  return `<section class="sprint-flow-lane"><h4>${name}</h4><ol class="sprint-flow-nodes">${sprintContent.flows[name].map((label,i)=>{
    let extra='';
    if(traditional&&i===3)extra='<p class="sprint-flow-secondary sprint-owner-design">视觉方案</p>';
    if(traditional&&i===5)extra='<p class="sprint-flow-secondary"><span class="sprint-owner-design">走查</span>+<span class="sprint-owner-development">复原设计稿</span></p>';
    if(!traditional&&i===3)extra=`<div class="sprint-flow-conditions"><p>${sprintContent.conditions[0]}</p><ol>${sprintContent.conditions.slice(1).map(c=>`<li>${sprintEsc(c)}</li>`).join('')}</ol></div>`;
    return `<li><div class="sprint-owner-bars" role="img" aria-label="${owners[i].map(k=>ownerLabels[k]).join('、')}主导">${owners[i].map(k=>`<i class="sprint-band-${k}"></i>`).join('')}</div><h5 class="sprint-owner-${owners[i][0]}">${label==='demo'?sprintAssetButton('demo','demo'):sprintEsc(label)}</h5>${extra}</li>`;
  }).join('')}</ol></section>`;
}
function sprintGoals() {
  return `<section class="sprint-section sprint-goals reveal" id="sprint-goals">${sprintChapterHead('03','Goals &amp; Process','目标与流程')}<div class="sprint-goals-layout"><div class="sprint-goals-body"><h3 class="sprint-subheading">目标</h3><div class="sprint-phase-grid">${sprintContent.stages.map((stage,index)=>`<article class="sprint-phase"><span class="sprint-phase-number" aria-hidden="true">0${index+1}</span><h4>${stage.title}</h4><div class="sprint-phase-goal">${stage.goal.map(sprintParagraph).join('')}</div><h5>${stage.month}</h5><ol>${stage.tasks.map(task=>`<li>${sprintInline(task)}</li>`).join('')}</ol></article>`).join('')}</div><div class="sprint-process"><h3 class="sprint-subheading">流程</h3><div class="sprint-process-legend"><h4>阶段主导方</h4><span class="sprint-owner-design"><i></i>设计</span><span class="sprint-owner-product"><i></i>产品</span><span class="sprint-owner-development"><i></i>研发</span></div><div class="sprint-flow-scroll" tabindex="0" role="region" aria-label="传统流程与coding流程对照，可横向滚动">${sprintFlow('传统流程')}${sprintFlow('coding流程')}</div></div></div><aside class="sprint-evidence"><figure id="sprint-evidence-preview" aria-live="polite" aria-atomic="true">${sprintMedia('demo','01 / 04')}</figure></aside></div></section>`;
}
function sprintToolGallery() {
  return sprintMediaGallery('sprint-tool-preview',sprintTools.map((label,i)=>({key:['nocode','catdesk','codex','figma'][i],label})),0,'第一轮 AI 方案对比');
}
function sprintChallenges() {
  const a=sprintContent.challengeOne,b=sprintContent.challengeTwo;
  return `<section class="sprint-section sprint-challenges reveal" id="judgement">${sprintChapterHead('04','Key Design Challenges','从复杂业务中寻找<br>清晰的设计解法')}<article class="sprint-challenge"><header class="sprint-challenge-head"><span>Challenge 01</span><h3>建立复杂任务工作台的视觉秩序</h3><p class="sprint-question">${sprintEsc(a[0])}</p>${sprintParagraph(a[1])}</header><div class="sprint-story-row sprint-exploration"><h4>${sprintEsc(a[2])}</h4><div class="sprint-story-copy">${sprintParagraph(a[3])}<blockquote class="sprint-thought"><span>设计思考</span><p>${sprintEsc(a[4])}</p></blockquote></div>${sprintToolGallery()}</div><div class="sprint-story-row sprint-exploration"><h4>${sprintEsc(a[5])}</h4><div class="sprint-story-copy">${sprintParagraph(a[6])}${sprintParagraph(a[7])}<blockquote class="sprint-thought"><span>设计思考</span><p>${sprintEsc(a[8])}</p></blockquote></div><div>${sprintMediaGallery('sprint-problem-preview',[{key:'problem',label:'问题定位',caption:'初版 Demo 存在三类问题'},{key:'solution-codex',label:'Codex 优化'},{key:'solution-figma',label:'Figma 优化'}],0,'初版 Demo 问题与优化方案')}</div></div><div class="sprint-story-row sprint-exploration"><h4>${sprintEsc(a[9])}</h4><div class="sprint-story-copy">${sprintParagraph(a[10])}${sprintBulletList(a[11])}<blockquote class="sprint-thought"><span>${a[12]}</span><p>${sprintEsc(a[13])}</p></blockquote></div><figure>${sprintMedia('overview','WORKBENCH / DETAILS')}</figure></div></article><article class="sprint-challenge" id="task-states"><header class="sprint-challenge-head"><span>Challenge 02</span><h3>让任务信息随执行情境清晰呈现</h3><p class="sprint-question">${sprintEsc(b[0])}</p>${sprintParagraph(b[1])}</header><div class="sprint-story-row sprint-card-solution"><div class="sprint-story-copy"><div class="sprint-card-insight"><h4>${sprintEsc(b[2])}</h4><div class="sprint-insight-lines">${sprintParagraph(b[3])}${sprintBulletList(b[4])}${sprintParagraph(b[5])}</div></div><div class="sprint-card-approach"><h4>${sprintEsc(b[6])}</h4>${sprintParagraph(b[7])}${sprintParagraph(b[8])}<blockquote class="sprint-thought"><span>${b[9]}</span><p>${sprintEsc(b[10])}</p></blockquote></div></div>${sprintMediaGallery('sprint-card-preview',[{key:'card-before',label:'优化前'},{key:'card-after',label:'优化后'}],0,'任务卡片优化前后对比')}</div></article></section>`;
}
function sprintReflection() {
  const r=sprintContent.reflection;
  return `<section class="sprint-section sprint-reflection reveal" id="sprint-reflection">${sprintChapterHead('05','Reflection &amp; Knowledge Sharing','从一次项目实践，<br>到可复用的 AI 协作方法')}<div class="sprint-reflection-layout"><div class="sprint-reflection-copy">${r.slice(0,3).map(sprintParagraph).join('')}<blockquote class="sprint-thought"><span>${r[3]}</span>${r.slice(4).map(sprintParagraph).join('')}</blockquote></div><figure>${sprintMedia('reflection','REFLECTION / DOCUMENT')}</figure></div></section>`;
}
document.addEventListener('click',event=>{
  const documentLink=event.target.closest('[data-sprint-document]');
  if(documentLink){event.preventDefault();sprintOpenDocument(documentLink);return;}
  const documentBack=event.target.closest('[data-rules-back]');
  if(documentBack){sprintReturnDocument(documentBack);return;}
  const link=event.target.closest('[data-sprint-asset]');
  if(link){
    const key=link.dataset.sprintAsset;
    const index=Object.keys(sprintAssetNames).indexOf(key)+1;
    const panel=document.querySelector('#sprint-evidence-preview');
    document.querySelectorAll('[data-sprint-asset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sprintAsset===key)));
    panel.innerHTML=`${sprintMedia(key,`0${index} / 04`)}`;
    if(matchMedia('(max-width:1000px)').matches)panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
    return;
  }
  const control=event.target.closest('[data-case-media]');
  if(control){
    const id=control.dataset.casePanel;
    const panel=document.getElementById(id);
    document.querySelectorAll(`[data-case-panel="${id}"]`).forEach(button=>button.setAttribute('aria-pressed',String(button===control)));
    panel.innerHTML=`${sprintMedia(control.dataset.caseMedia,control.dataset.caseTag)}${control.dataset.caseCaption?`<figcaption>${sprintEsc(control.dataset.caseCaption)}</figcaption>`:''}`;
  }
});
