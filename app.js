const isVisual = /\/visual\/?(?:index\.html)?$/.test(location.pathname);
const base = isVisual ? '../' : './';
const arrow = '<span aria-hidden="true">↗</span>';
const dash = (compact = false) => `<div class="product-window ${compact ? 'compact-window' : ''}" aria-label="任务管理 Agent 工作台结构示意，使用示例数据">
  <aside class="product-sidebar"><b><i class="product-logo">T</i> 天衡任务管理</b><span class="product-active">◫　任务工作台</span><span>☷　任务批次列表</span><span>▤　任务项列表</span><small>界面结构示意</small></aside>
  <div class="product-main"><div class="product-tabs"><b>重点关注</b><span>详细数据</span><i>组织：示例团队 ⌄</i></div><div class="product-filter">创建日期　2026-10-01 → 2026-10-31 <span>组织架构　示例团队 ⌄</span></div><div class="risk-banner"><span class="risk-icon">!</span><div><strong>当前任务盘面为<span>中风险</span>，建议及时关注</strong><p>即将到期的任务需要优先处理，及时了解推进中的阻塞。</p><small>先识别风险，再定位需要跟进的任务与人员。</small></div><span class="mock-action">查看风险 ↗</span></div><div class="mock-panel"><h4>任务推进情况 <span>ⓘ</span></h4><div class="metric-row"><div class="metric-main"><div><small>任务批次总量</small><b>12</b><em>5 个已完成</em></div><span class="donut"><i>4<small>业务类型</small></i></span></div><div><small>任务项总量</small><b>168</b><em>96 个已完成</em></div><div><small>近七日新增批次</small><b>4</b><em>关注优先级与到期时间</em></div><div><small>覆盖对象数</small><b>36</b><em>示例数据</em></div></div></div><div class="dashboard-bottom"><div class="mock-panel"><h4>到期风险 <span>ⓘ</span></h4><div class="risk-stat"><span class="small-donut"></span><div>${[['进行中','5','green'],['即将到期','2','orange'],['已过期','0','red'],['已完成','5','purple']].map(([l,v,c])=>`<p><i class="dot ${c}"></i>${l}<b>${v}</b><span class="bar ${c}" style="--bar:${v==='0'?3:35+Number(v)*8}%"></span></p>`).join('')}</div></div></div><div class="mock-panel quadrant-panel"><h4>需要关注的人员 <span>按负荷与进展定位</span></h4><div class="quadrant"><span class="q-note q1">进展偏慢</span><span class="q-note q2">优先关注</span><span class="q-note q3">状态稳定</span><span class="q-note q4">任务承压</span><i style="--x:22%;--y:72%"></i><i style="--x:46%;--y:53%"></i><i style="--x:73%;--y:29%" class="attention"></i><i style="--x:80%;--y:71%"></i></div></div></div><div class="mock-panel ai-bottom"><h4>AI 执行进展 <span>理解覆盖情况与执行结果</span></h4><p>AI 执行中 <b>3</b>　 AI 已完成 <b>8</b>　 覆盖任务批次 <b>6</b></p></div></div></div>`;

const taskCard = (state = 'pending') => {
const states = {pending:{label:'待处理',detail:'等待业务人员发起执行',action:'去执行',step:0},running:{label:'AI 执行中',detail:'AI 正在处理，当前进展持续可见',action:'查看执行进展',step:1},done:{label:'AI 已完成',detail:'执行结果与检核反馈集中呈现',action:'查看执行结果',step:2}};
const s=states[state];return `<div class="task-demo" data-task-state="${state}"><div class="task-card-top"><div class="shop-avatar">店</div><div><h4>示例门店 · 经营任务</h4><div class="shop-tags">营业中 <span>餐饮</span><span>示例对象</span></div></div><span class="task-status ${state}">${s.label}</span></div><div class="task-card-content"><div class="stable-info"><p><span>任务描述</span>完善门店经营信息</p><p><span>对象信息</span>门店基础资料与经营背景</p><p><span>跟进角色</span>一线业务人员</p><p><span>时间范围</span>按任务批次统一管理</p></div><div class="dynamic-info"><small>执行反馈</small><strong>${s.detail}</strong><p>${state==='pending'?'将任务所需信息与当前执行状态分区呈现。':state==='running'?'保留对象背景，将注意力集中到任务进展。':'区分执行完成与后续检核，让结果有据可查。'}</p></div></div><div class="task-card-bottom"><span>信息与交互结构示意</span><span class="mock-action">${s.action} ↗</span></div></div>`;};

const phone = (kind) => `<div class="phone ${kind}" aria-label="${kind==='honey'?'小蜜助手入口结构示意':'袋鼠参谋场景化咨询面板结构示意'}"><div class="phone-status">9:41 <span>● ▰</span></div><div class="phone-top">☰ <b>${kind==='honey'?'小蜜助手':'袋鼠参谋'}</b><span>⊕</span></div>${kind==='honey'?`<div class="honey-greeting"><span class="honey-face">••</span><h4>上午好<br>有什么可以帮你？</h4></div><div class="phone-skills">${['经营诊断','业务知识','智能查询','工作总结','门店分析','更多能力'].map((x,i)=>`<div><span>${['◈','▣','⌕','▤','◇','＋'][i]}</span>${x}</div>`).join('')}</div><div class="phone-scenarios"><small>从一个具体场景开始</small><p>看看我关注的门店经营情况 ↗</p><p>帮我整理今天的工作重点 ↗</p></div><div class="phone-input">说说你的问题… <span>↑</span></div>`:`<div class="kangaroo-greeting"><span>你好，<br>我们从一个具体问题开始。</span><i>✳</i></div><div class="consult-panel"><strong>商圈分析 <span>×</span></strong><div class="consult-row"><small>分析方向</small><b>项目选择</b><span>趋势洞察</span></div><div class="consult-row"><small>意向区域</small><b>已选区域</b><span>其他 ›</span></div><div class="consult-row"><small>意向品类</small><b>快餐简餐</b><span>其他 ›</span></div><p>可以补充其他咨询信息…</p><span class="consult-send">↑</span></div>`}<div class="phone-home"></div></div>`;

const imageButton = (src,alt,cls='') => `<button class="image-expand ${cls}" data-image="${src}" data-title="${alt}" aria-label="放大查看：${alt}"><img src="${src}" alt="${alt}" loading="lazy"><span class="expand-corner" aria-hidden="true">↗</span></button>`;
const sectionLabel=(num,text)=>`<div class="section-kicker"><span>(${num})</span><span>${text}</span></div>`;

const galleryItems=[
{id:'agent',type:'product',title:'天衡任务管理',description:'让复杂信息有秩序，让任务进展可理解。',tag:'PC / 信息与交互',asset:'agent-workbench.jpg',surface:'sage',note:'按当前结构重绘 · 示例数据'},
{id:'food',type:'visual',title:'浣熊经营分',description:'将等级、权益与整改提示，组织成可感知的规则。',tag:'移动端 / 视觉表达',asset:'food-score.jpg',surface:'brown',note:'项目设计稿 · 既有品牌形象延展'},
{id:'kangaroo',type:'product',title:'袋鼠参谋',description:'常用条件直接选择，复杂选项分层展开。',tag:'AI 产品 / 场景输入',asset:'kangaroo-panel.jpg',surface:'lavender',note:'终稿设计页面'},
{id:'traffic',type:'product',title:'交通信号控制平台',description:'在地图、参数与多路口信息之间建立清楚的关系。',tag:'PC / 复杂系统',asset:'traffic.jpg',surface:'blue',note:'校企合作 · 核心模块设计'},
{id:'levels',type:'visual',title:'等级与状态的表达',description:'同一套品牌语言，承载不同等级与使用状态。',tag:'组件 / 品牌延展',asset:'food-levels.jpg',surface:'brown',note:'基于既有形象的 AI 辅助延展与加工'},
{id:'anxin',type:'visual',title:'安心严选',description:'用内容层级与细节，建立频道的识别与浏览节奏。',tag:'移动端 / 界面探索',asset:'anxin.jpg',surface:'peach',note:'个人改版探索'}
];
const galleryCard=(item,index)=>`<article class="gallery-card reveal" data-type="${item.type}"><button class="gallery-image ${item.surface}" data-image="${base}assets/${item.asset}" data-title="${item.title}" data-caption="${item.note}" aria-label="放大查看${item.title}"><img src="${base}assets/${item.asset}" alt="${item.title}设计画面" loading="lazy"><span class="gallery-no">0${index+1}</span><span class="gallery-open">查看大图 ↗</span></button><div class="gallery-card-title"><h3>${item.title}</h3><span>${item.tag}</span></div><p>${item.description}</p></article>`;

function home(){return `<section class="hero" id="top"><div class="hero-main"><h1 class="hero-brand"><span>Jhuen.</span> <span>Design</span></h1><p class="hero-subtitle">把复杂业务，做成清晰好用的体验</p></div><div class="hero-bottom"><a href="#work" class="text-link">往下看，了解我的设计思考 <span>↓</span></a><p>目前在美团从事B端AI产品体验设计<br>从信息与交互出发也走进代码里<br>让设计在真实产品中发生</p></div></section>

<section id="work" class="work-intro reveal">${sectionLabel('01','从复杂任务，到明确行动')}<div class="section-intro"><h2>先看清，<br>再行动。</h2><div><p>任务管理 Agent 将分散的任务集中，支持人与 AI 协同执行。</p><p>我参与业务梳理与平台架构，负责关键页面的信息、交互与界面优化，并借助 AI coding 推进实现。</p><div class="project-meta"><span>美团 · 任务管理 Agent</span><span>PC 线上版本 / 移动端探索</span></div></div></div></section>

<section class="agent-feature reveal"><div class="feature-stage sage"><div class="stage-title"><span>任务管理 Agent</span><span>信息架构 / 交互 / 界面落地</span></div><div class="hero-dashboard">${dash()}</div><div class="stage-bottom"><span>在复杂信息里，找到今天的重点。</span><span>界面结构示意 · 示例数据</span></div></div></section>

<section class="case-section reveal" id="judgement"><div class="case-heading"><span class="case-index">01—A</span><h3>管理者今天<br>该关注什么？</h3><p>从数据罗列，走向有顺序的判断。先感知任务盘面，再定位风险与需要跟进的人。</p></div><div class="case-body"><div class="decision-flow"><div><span>01</span><b>感知整体状态</b><p>风险等级与原因</p></div><i>→</i><div><span>02</span><b>定位关注对象</b><p>任务、到期与人员</p></div><i>→</i><div><span>03</span><b>进入具体处理</b><p>查看明细与后续行动</p></div></div><div class="before-after"><div class="compare-heading"><span>方案对照</span><div class="segmented" role="group" aria-label="选择工作台方案"><button data-compare="current" class="is-active" aria-pressed="true">当前界面</button><button data-compare="original" aria-pressed="false">产品原型</button></div></div><div id="comparison-current">${imageButton('./assets/agent-workbench.jpg','任务管理 Agent 工作台结构重绘：风险、推进与人员信息')}<p class="figure-caption">按当前结构重绘 · 示例数据</p></div><div id="comparison-original" hidden>${imageButton('./assets/agent-original.jpg','产品原型参考：工作台信息组织')}<p class="figure-caption">可变产品原型参考 · 数据与当前版本无直接可比性</p></div></div><div class="three-notes"><div><h4>重排优先级</h4><p>整体状态先于详细统计，帮助用户找到阅读起点。</p></div><div><h4>让关系可见</h4><p>用图表表达构成、风险与负荷，支持进一步判断。</p></div><div><h4>连接后续动作</h4><p>从关注的信息进入具体任务，让概览有下一步。</p></div></div></div></section>

<section class="case-section reveal" id="task-states"><div class="case-heading"><span class="case-index">01—B</span><h3>任务到了哪一步，<br>接下来做什么？</h3><p>将相对稳定的对象信息，与随执行变化的状态、反馈分区。让当前操作跟随任务进展。</p></div><div class="case-body"><div class="task-state-stage"><div class="task-state-tabs" role="group" aria-label="查看不同任务状态"><button data-state="pending" class="is-active" aria-pressed="true">待处理</button><button data-state="running" aria-pressed="false">AI 执行中</button><button data-state="done" aria-pressed="false">AI 已完成</button></div><div id="task-render">${taskCard()}</div><div class="info-labels"><span><i></i>对象信息：持续提供背景</span><span><i></i>执行信息：随进展变化</span></div></div><div class="two-notes"><div><h4>把信息放回它的位置</h4><p>基础信息保持稳定，执行结果与检核反馈集中表达，减少寻找与辨别。</p></div><div><h4>让当前状态对应当前操作</h4><p>围绕下一步处理组织操作，而非让所有动作拥有同样的优先级。</p></div></div><p class="figure-caption">交互结构演示 · 三个状态用于说明信息分区，不代表完整业务状态机</p></div></section>

<section class="coding-section reveal"><div class="coding-heading">${sectionLabel('方法','设计如何持续生效')}<h2>设计，<br>也发生在代码里。</h2><p>参与实际界面实现与检查，将反复出现的要求沉淀成规则，让下一次迭代有据可依。</p></div><div class="coding-art"><div class="code-sheet"><div class="code-sheet-top"><span>DESIGN → CODE</span><span>↗</span></div><div class="token-line"><span>color</span><i style="background:#c4d655"></i><i style="background:#e7e8df"></i><i style="background:#1d201b"></i></div><div class="token-line"><span>spacing</span><div class="spacing-demo"><i></i><i></i><i></i><i></i></div></div><div class="code-rule"><small>界面问题</small><b>明确规则</b><small>修改与检查</small><b>下一次复用 ↗</b></div><span class="sheet-caption">颜色、间距与规则组织示意</span></div></div><div class="coding-bottom"><span>设计 token</span><span>组件与页面规则</span><span>AI 协作规范</span></div><details class="mobile-details"><summary>移动端迁移探索 <span>换一种场景，重新组织信息 ＋</span></summary><div class="mobile-detail-content"><div><h3>延续判断逻辑，<br>调整阅读与操作方式。</h3><p>筛选、风险提示与人员分类，在更小的空间里重新组织。当前为迁移探索，使用演示数据。</p></div>${imageButton('./assets/agent-mobile.jpg','任务管理 Agent 移动端迁移探索，演示数据')}</div></details></section>

<section class="ai-intro reveal" id="ai">${sectionLabel('02','降低 AI 能力的使用与表达门槛')}<h2>找到能力。<br>说清需求。</h2><p>从能力入口，到场景化输入。<br>用小蜜与袋鼠参谋的两个设计片段，<br>探索人如何更容易地使用 AI。</p></section>

<section class="ai-case reveal"><div class="ai-visual honey-stage"><div class="float-label label-top">个性化意图 ↘</div>${phone('honey')}<div class="float-label label-bottom">稳定高频意图 ↗<br>场景化意图 ↗</div><span class="visual-footnote">入口结构示意</span></div><div class="ai-copy"><div class="mini-meta"><span>小蜜助手</span><span>信息架构 / 设计方案</span></div><h3>让增长中的能力，<br>有清楚的入口。</h3><p>技能与 Agent 增加，原首页的模块职责逐渐混杂。我结合使用行为，重新划分输入栏、技能栏和场景推荐的职责。</p><div class="intent-list"><div><span>输入栏</span><b>表达个性化意图</b></div><div><span>技能栏</span><b>调用稳定高频能力</b></div><div><span>场景推荐</span><b>承接当下具体需求</b></div></div><details><summary>查看设计依据 <span>＋</span></summary><p>输入框承担主要意图表达；工具栏的使用与其页面露出不匹配；“高频问”混合多种职责。因此重新分工，并为独立 Agent 保留承接空间。</p><p class="figure-caption">依据项目行为分析与方案讨论稿；未将设计前数据表述为改版成效。</p></details></div></section>

<section class="ai-case reverse reveal"><div class="ai-visual kangaroo-stage">${phone('kangaroo')}<div class="float-label label-top">常用条件，直接点选。</div><div class="float-label label-bottom">复杂选项，分层展开。</div><span class="visual-footnote">咨询面板结构示意</span></div><div class="ai-copy"><div class="mini-meta"><span>袋鼠参谋</span><span>场景输入 / 终稿设计</span></div><h3>把复杂条件，<br>变成清楚的输入。</h3><p>分析方向、意向区域、品类与补充信息，被组织进同一咨询面板。用户可以先选常用条件，再补充自己的问题。</p><ol class="plain-list"><li>热门条件便捷选择，完整选项另有入口。</li><li>品类与区域分层，控制一次呈现的信息量。</li><li>已选项持续回显，支持修改与删除。</li></ol><button class="text-link" data-image="./assets/kangaroo-panel.jpg" data-title="袋鼠参谋：咨询面板终稿设计">查看原始设计片段 ${arrow}</button></div></section>

<section class="visual-preview reveal">${sectionLabel('选集','一些界面与视觉表达')}<div class="visual-preview-heading"><h2>清楚之外，<br>也有细节。</h2><a href="./visual/" class="text-link">浏览完整视觉选集 ${arrow}</a></div><div class="preview-grid">${[galleryItems[1],galleryItems[0],galleryItems[5]].map((item,i)=>galleryCard(item,i)).join('')}</div></section>

<section class="about-section reveal" id="about"><div class="about-mark" aria-hidden="true">✳</div><div class="about-content">${sectionLabel('关于','蒋雯蕙')}<h2>在复杂问题里，<br>寻找清楚的解法。</h2><p>我毕业于江南大学，从交互研究与复杂系统设计出发，目前在美团参与商家端与 AI 产品体验设计。</p><p>我关注信息如何被理解、流程如何被推进，以及设计如何在真实协作中落地。保持好奇，认真对待每一次细节。</p><div class="about-facts"><div><span>工作</span><b>美团 · 体验设计</b></div><div><span>教育</span><b>江南大学 · 本科 / 硕士</b></div><div><span>荣誉</span><b>国家奖学金等</b></div></div></div></section>`;}

function visual(){document.title='视觉选集 — 蒋雯蕙';return `<section class="visual-page-header" id="top"><div class="hero-meta"><span>精选界面 / VISUAL INDEX</span><span>产品中的秩序、状态与细节</span></div><h1>视觉选集<span class="gallery-count">(06)</span></h1><div class="visual-page-bottom"><p>一些界面与视觉表达。<br>点击画面，看看细节。</p><div class="gallery-filters" role="group" aria-label="筛选作品"><button data-filter="all" class="is-active" aria-pressed="true">全部 <small>06</small></button><button data-filter="product" aria-pressed="false">产品界面</button><button data-filter="visual" aria-pressed="false">视觉表达</button></div></div></section><section class="gallery-grid" aria-label="视觉作品">${galleryItems.map(galleryCard).join('')}</section><div class="gallery-return"><a href="../#work" class="text-link">← 回到设计思考</a><span>更多细节，存在于每一次具体判断里。</span></div>`;}

document.querySelector('#main').innerHTML=isVisual?visual():home();
const contact=document.createElement('div');contact.className='contact-links';contact.innerHTML='<a href="mailto:1466918516@qq.com" class="text-link">1466918516@qq.com ↗</a><button class="copy-email" type="button" aria-label="复制联系邮箱">复制邮箱</button><span class="copy-status" role="status" aria-live="polite"></span>';document.querySelector('.about-content')?.append(contact);
const footerContact=document.createElement('a');footerContact.className='footer-email';footerContact.href='mailto:1466918516@qq.com';footerContact.textContent='1466918516@qq.com ↗';document.querySelector('.site-footer>p').after(footerContact);
document.querySelector('.copy-email')?.addEventListener('click',async()=>{const status=document.querySelector('.copy-status');try{await navigator.clipboard.writeText('1466918516@qq.com');status.textContent='已复制';}catch{status.textContent='请长按或选中邮箱地址复制';}});
if(isVisual){document.querySelectorAll('a[href="./"]').forEach(a=>a.href='../');document.querySelectorAll('nav a').forEach(a=>{const key=a.dataset.nav;a.href=key==='visual'?'./':`../#${key==='work'?'work':'about'}`;});document.querySelector('[data-nav="visual"]').setAttribute('aria-current','page');}
// Duplicate only the visual glyphs; each link keeps one readable accessible name.
document.querySelectorAll('.site-header nav a, .hero-bottom .text-link').forEach(link => {
  const label = Array.from(link.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent).join('').trim();
  if (!label) return;
  const decorations = Array.from(link.children);
  const text = document.createElement('span');
  text.className = 'roll-text';
  text.setAttribute('aria-hidden', 'true');
  Array.from(label).forEach((letter, index) => {
    const character = document.createElement('span');
    character.className = 'roll-char';
    character.style.setProperty('--letter-index', index);
    const track = document.createElement('span');
    track.className = 'roll-track';
    for (let copy = 0; copy < 2; copy += 1) {
      const glyph = document.createElement('span');
      glyph.className = 'roll-glyph';
      glyph.textContent = letter === ' ' ? '\u00a0' : letter;
      track.append(glyph);
    }
    character.append(track);
    text.append(character);
  });
  link.classList.add('rolling-link');
  link.setAttribute('aria-label', label);
  link.replaceChildren(text, ...decorations);
});

const dialog=document.querySelector('#image-dialog'); let lastFocus;
document.addEventListener('click',e=>{
 const image=e.target.closest('[data-image]');
 if(image){lastFocus=image;document.querySelector('#dialog-title').textContent=image.dataset.title||'作品';document.querySelector('#dialog-caption').textContent=image.dataset.caption||'';const img=document.createElement('img');img.src=image.dataset.image;img.alt=image.dataset.title||'作品大图';document.querySelector('.dialog-body').replaceChildren(img);dialog.showModal();document.body.classList.add('dialog-open');return;}
 const state=e.target.closest('[data-state]');if(state){document.querySelector('#task-render').innerHTML=taskCard(state.dataset.state);document.querySelectorAll('[data-state]').forEach(b=>{const on=b===state;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});}
 const compare=e.target.closest('[data-compare]');if(compare){document.querySelector('#comparison-current').hidden=compare.dataset.compare!=='current';document.querySelector('#comparison-original').hidden=compare.dataset.compare!=='original';document.querySelectorAll('[data-compare]').forEach(b=>{const on=b===compare;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});}
 const filter=e.target.closest('[data-filter]');if(filter){document.querySelectorAll('[data-filter]').forEach(b=>{const on=b===filter;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});document.querySelectorAll('.gallery-grid .gallery-card').forEach(c=>{c.hidden=filter.dataset.filter!=='all'&&c.dataset.type!==filter.dataset.filter;});}
});
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');lastFocus?.focus({preventScroll:true});});
const prefersReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver'in window&&!prefersReduced){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'));
function progress(){const max=document.documentElement.scrollHeight-innerHeight;document.querySelector('.progress-line').style.transform=`scaleX(${max>0?scrollY/max:0})`;document.querySelector('.site-header').classList.toggle('scrolled',scrollY>30);}
addEventListener('scroll',progress,{passive:true});progress();
