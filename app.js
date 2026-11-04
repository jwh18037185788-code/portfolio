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
{id:'food',type:'visual',title:'浣熊经营分',description:'围绕食安管控，梳理经营等级、权益与整改路径，并以 AIGC 延展品牌形象。',tag:'移动端 / 食安管控',asset:'food-score.jpg',cover:'cover1.png?v=8445e3cb66',detail:'food-score-long-web-v2.jpg?v=325e038647',surface:'brown',note:'完整项目长图 · 上下滚动浏览'},
{id:'kangaroo',type:'product',title:'袋鼠参谋',description:'通过意图厘清、场景输入与 GUI 卡片规范，优化 AI 经营咨询的对话体验。',tag:'AI 产品 / 对话体验',asset:'kangaroo-panel.jpg',cover:'cover5.png',detail:'kangaroo-long-web-v2.jpg?v=9164a372fe',surface:'lavender',note:'袋鼠参谋 · AI 对话体验优化 / 完整项目长图 · 上下滚动浏览'},
{id:'compliance',type:'product',title:'时空轨迹共现分析',description:'面向 CLC 业务合规服务台，组织查询条件、共现结果与轨迹明细。',tag:'PC / 风控分析',asset:'cover3.png',cover:'cover3.png',detail:'compliance-long-web-v2.jpg?v=63efcc817a',surface:'sage',note:'美团 · CLC 业务合规服务台 / 完整项目长图 · 上下滚动浏览'},
{id:'camera',type:'product',title:'摄像头绑定及基础操作',description:'从设备绑定到实时查看与录像回放，建设商家端后厨监控操作链路。',tag:'移动端 / 硬件接入',asset:'cover2.png',cover:'cover2.png',detail:'camera-long-web-v2.jpg?v=9647a0e6b3',surface:'brown',note:'美团 · 摄像头 / 完整项目长图 · 上下滚动浏览'},
{id:'traffic',type:'product',title:'交通信号控制平台',description:'围绕地图、路口与信号参数，完成复杂交通控制系统的设计改版。',tag:'PC / 复杂系统',asset:'traffic.jpg',cover:'cover4.png',detail:'traffic-long-web-v2.jpg?v=d52ec57514',surface:'blue',note:'航天大为 × 江南大学 · 2.0 设计改版 / 完整项目长图 · 上下滚动浏览'},
{id:'nearby',type:'visual',title:'附近在吃',description:'升级社区内容与交互链路，强化美食发现的场景感知并衔接转化路径。',tag:'移动端 / 社区体验',asset:'cover6.png',cover:'cover6.png',detail:'nearby-long-web-v2.jpg?v=b1fc52419b',surface:'sage',note:'美团 · 附近在吃 / 完整项目长图 · 上下滚动浏览'},
{id:'anxin',type:'visual',title:'安心严选频道页',description:'重构频道页的信息秩序，通过内容层级与视觉表达传达差异化心智。',tag:'移动端 / 界面探索',asset:'anxin.jpg',cover:'cover7.png',detail:'anxin-long-web-v2.jpg?v=bb73fbf776',surface:'peach',note:'个人探索 · 源自字节跳动抖音校招笔试题 / 完整项目长图 · 上下滚动浏览'},
{id:'wechat',type:'product',title:'微信 AI 日程管理助手',description:'探索从聊天内容中识别并创建日程，以 AI 建议衔接日常行程管理。',tag:'AI 产品 / 日程探索',asset:'cover8.png',cover:'cover8.png',detail:'wechat-long-web-v2.jpg?v=f60fd85e53',surface:'sage',note:'个人探索 · 源自腾讯 WXG 校招笔试题 / 完整项目长图 · 上下滚动浏览'}
];
const galleryCard=(item,index)=>`<article class="gallery-card reveal" data-type="${item.type}"><button class="gallery-image ${item.surface} has-cover" data-image="${base}assets/${item.detail||item.cover||item.asset}" data-title="${item.title}" data-caption="${item.note}" aria-label="放大查看${item.title}">${portfolioCover(`${base}assets/${item.cover||item.asset}`,`${item.title}设计画面`,index)}<span class="gallery-no">${String(index+1).padStart(2,'0')}</span></button><div class="gallery-card-title"><h3>${item.title}</h3><span>${item.tag}</span></div><p>${item.description}</p></article>`;
const orbitGallery=()=>`<div class="orbit-gallery" aria-label="8 个作品的环形画廊"><div class="orbit-stage" role="region" aria-label="旋转作品环，可左右拖动，点击封面查看完整项目" tabindex="0"><div class="orbit-core"><div class="orbit-current"><span class="orbit-current-index" aria-label="第 01 个作品，共 08 个"><span class="orbit-index-flip" aria-hidden="true"><span class="orbit-index-value">01</span></span><span class="orbit-index-total" aria-hidden="true"> / 08</span></span><span class="orbit-current-title orbit-title-flip"><span class="orbit-title-value">${galleryItems[0].title}</span></span></div><div class="orbit-controls"><button type="button" data-orbit-step="-1" aria-label="上一个作品">←</button><button type="button" data-orbit-play aria-label="暂停自动旋转" aria-pressed="false">Ⅱ</button><button type="button" data-orbit-step="1" aria-label="下一个作品">→</button></div></div><div class="orbit-rotor">${galleryItems.map((item,i)=>`<button type="button" class="orbit-tile home-image media-pending" aria-busy="true" data-image="${base}assets/${item.detail||item.cover||item.asset}" data-title="${item.title}" data-caption="${item.note}" aria-label="查看完整项目：${item.title}" style="--orbit-index:${i}">${portfolioImagePlaceholder(`<img src="${base}assets/orbit/${item.cover.split('?')[0].replace('.png','.jpg')}" alt="${item.title}作品封面" loading="lazy" decoding="async" draggable="false">`)}<span class="orbit-tile-label">${item.title}<i aria-hidden="true">↗</i></span></button>`).join('')}</div></div></div>`;

function home(){return `<section class="hero" id="top"><div class="hero-main"><h1 class="hero-brand"><span>Jhuen.</span> <span>Design</span></h1><p class="hero-subtitle">把复杂业务，做成清晰好用的体验</p></div><div class="hero-bottom"><a href="#work" class="text-link">往下看，了解我的设计思考 <span>↓</span></a><p>目前在美团从事B端AI产品体验设计<br>从信息与交互出发也走进代码里<br>让设计在真实产品中发生</p></div></section>

${sprintOverview()}

<div class="sprint-demo-heading" id="live-demo"><p class="sprint-kicker">02 / Live Demo</p><h3>可交互系统体验</h3></div>
<section class="agent-feature reveal" aria-label="任务管理 Agent 交互演示"><div class="feature-stage sage agent-demo"><div class="stage-title"><span>任务管理 Agent</span><a class="agent-demo-open" href="${base}demos/task-agent/index.html?v=f2bb8f5ff2#/bd-task" target="_blank" rel="noopener">展开体验 ${arrow}</a></div><div class="agent-demo-viewport"><iframe src="${base}demos/task-agent/index.html?v=f2bb8f5ff2#/bd-task" title="任务管理 Agent 交互演示" width="1440" height="904" loading="lazy"></iframe></div><a class="agent-demo-mobile" href="${base}demos/task-agent/index.html?v=f2bb8f5ff2#/bd-task" target="_blank" rel="noopener" aria-label="打开任务管理 Agent 交互演示"><span class="home-image-frame home-image agent-preview-frame media-pending" aria-busy="true">${portfolioImagePlaceholder(`<img src="${base}assets/task-agent-preview.png?v=6954e567a4" alt="任务管理 Agent 工作台预览" width="1440" height="960" loading="lazy" decoding="async">`)}</span><span>打开交互演示 ${arrow}</span></a><div class="stage-bottom"><span>在复杂信息里，找到今天的重点。</span><span>交互演示 · 示例数据</span></div></div></section>

${sprintGoals()}

${sprintChallenges()}

${sprintReflection()}

<section class="ai-intro reveal" id="ai">${sectionLabel('02','降低 AI 能力的使用与表达门槛')}<h2>找到能力。<br>说清需求。</h2><p>从能力入口，到场景化输入。<br>用小蜜与袋鼠参谋的两个设计片段，<br>探索人如何更容易地使用 AI。</p></section>

<section class="ai-case reveal"><div class="ai-visual case-source-visual">${sprintMedia('honey','小蜜 / 首页信息架构优化')}</div><div class="ai-copy"><h3>让增长中的能力，<br>有清楚的入口。</h3><p>重组首页入口，让个性化提问、高频技能与场景推荐各司其职。</p><ol class="plain-list"><li>用户意图前置确认，快速进入会话态</li><li>双行技能聚合展示，场景推荐灵活配置</li><li>划分独立空间，承接平行功能</li></ol></div></section>

<section class="ai-case reverse reveal"><div class="ai-visual case-source-visual">${sprintKangarooMedia()}</div><div class="ai-copy"><h3>把复杂条件，<br>变成清楚的输入。</h3><p>用热门问带出问题，再通过结构化选项补全经营咨询条件。</p><ol class="plain-list"><li>热门问一键填入，可继续编辑问题。</li><li>常用条件轻量选择，完整选项分层展开。</li><li>结构化条件回填，问题可编辑补充。</li></ol></div></section>

<section class="visual-preview visual-orbit-preview reveal" id="selected-work">${sectionLabel('选集','一些界面与视觉表达')}<div class="visual-preview-heading"><h2>清楚之外，<br>也有细节。</h2><a href="./visual/" class="text-link">浏览完整作品选集 ${arrow}</a></div>${orbitGallery()}</section>

<section class="about-section reveal" id="about"><div class="about-mark" aria-hidden="true"><span>✳</span></div><div class="about-content">${sectionLabel('关于','蒋雯蕙')}<h2>在复杂问题里，<br>寻找清楚的解法。</h2><p>我毕业于江南大学，从交互研究与复杂系统设计出发，目前在美团参与商家端相关 AI 产品体验设计。</p><p>我关注信息如何被理解、流程如何被推进，以及设计如何在真实协作中落地。保持好奇，认真对待每一次细节。</p><div class="about-facts"><div><span>工作</span><b>美团 · 体验设计</b></div><div><span>教育</span><b>江南大学 · 本科 / 硕士</b></div><div><span>荣誉</span><b>国家奖学金等</b></div><div><span>邮箱</span><b>1466918516@qq.com</b></div></div><div class="resume-actions" aria-label="个人简历"><button class="text-link resume-action" type="button" data-image="${base}assets/resume-jiang-wenhui-hd.png" data-title="蒋雯蕙简历" data-caption="简历原图 · 默认适应窗口，可切换为按宽度浏览" data-view="fit" data-download="蒋雯蕙简历.png" aria-label="查看蒋雯蕙简历">查看简历 ${arrow}</button></div></div></section>`;}

function visual(){document.title='作品选集 — 蒋雯蕙';return `<section class="visual-page-header" id="top"><h1><span>作品选集</span><span class="gallery-count">${String(galleryItems.length).padStart(2,'0')}</span></h1><div class="visual-page-bottom"><div class="gallery-filters" role="group" aria-label="筛选作品"><button data-filter="all" class="is-active" aria-pressed="true">全部 <small>${String(galleryItems.length).padStart(2,'0')}</small></button><button data-filter="product" aria-pressed="false">交互设计</button><button data-filter="visual" aria-pressed="false">视觉表达</button></div><p>一些界面与视觉表达。点击画面，看看细节。</p></div></section><section class="gallery-grid" aria-label="视觉作品">${galleryItems.map(galleryCard).join('')}</section><div class="gallery-return"><a href="../#work" class="text-link">← 回到设计思考</a><span>更多细节，存在于每一次具体判断里。</span></div>`;}

// Hydrate the static document without replacing its nodes or changing its height.
// After template/image metadata edits, run node scripts/render-static-pages.cjs.
const main=document.querySelector('#main');
if(!main.hasChildNodes())main.innerHTML=isVisual?visual():home();
document.body.classList.toggle('is-visual-page',isVisual);
const demoViewport=document.querySelector('.agent-demo-viewport');
if(demoViewport){
 const sizeDemo=()=>{
  if(demoViewport.clientWidth)demoViewport.style.setProperty('--agent-demo-scale',String(demoViewport.clientWidth/1440));
 };
 new ResizeObserver(sizeDemo).observe(demoViewport);
 sizeDemo();
}

if(!document.querySelector('.footer-email')){
 const footerContact=document.createElement('span');footerContact.className='footer-email';footerContact.textContent='联系方式 - 18037185788';document.querySelector('.site-footer .footer-name').after(footerContact);
}
if(isVisual){document.querySelectorAll('a[href="./"]').forEach(a=>a.href='../');document.querySelectorAll('nav a').forEach(a=>{const key=a.dataset.nav;a.href=key==='visual'?'./':`../#${key==='work'?'work':'about'}`;});document.querySelector('[data-nav="visual"]').setAttribute('aria-current','page');}
const dialog=document.querySelector('#image-dialog'); let lastFocus;
const dialogTitle=dialog.querySelector('#dialog-title');
dialogTitle.tabIndex=-1;
const dialogHeading=document.createElement('div');
dialogHeading.className='dialog-heading';
dialogTitle.before(dialogHeading);
const resumeDownload=document.createElement('a');
resumeDownload.className='dialog-download';
resumeDownload.hidden=true;
resumeDownload.setAttribute('aria-label','下载蒋雯蕙简历（PNG）');
resumeDownload.title='下载简历';
resumeDownload.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>';
dialogHeading.append(dialogTitle,resumeDownload);
const dialogBody=dialog.querySelector('.dialog-body');
dialogBody.tabIndex=0;
dialogBody.setAttribute('role','region');
dialogBody.setAttribute('aria-label','作品大图，可上下滚动浏览');
const viewToggle=document.createElement('button');
viewToggle.type='button';
viewToggle.className='dialog-view-toggle';
dialog.querySelector('.dialog-close').before(viewToggle);
function labelImageView(view){
 viewToggle.textContent=view==='scroll'?'适应窗口':'按宽度浏览';
 viewToggle.setAttribute('aria-label',view==='scroll'?'切换至适应窗口':'切换至按宽度上下滚动浏览');
 delete viewToggle.dataset.textActionReady;
 window.portfolioTextActions?.decorate(viewToggle);
}
let imageZoom=1;
let imageCaption='';
let isGalleryArtwork=false;
let imageDrag=null;
let imageViewChosen=false;
function renderImageZoom(){
 const img=dialogBody.querySelector('img');
 if(dialog.dataset.view!=='fit'||!img?.naturalWidth)return;
 const width=dialogBody.clientWidth;
 const height=dialogBody.clientHeight;
 const fit=Math.min(1,width/img.naturalWidth,height/img.naturalHeight);
 const imageWidth=img.naturalWidth*fit*imageZoom;
 const imageHeight=img.naturalHeight*fit*imageZoom;
 const stage=img.parentElement;
 stage.style.width=`${Math.max(width,imageWidth)}px`;
 stage.style.height=`${Math.max(height,imageHeight)}px`;
 img.style.width=`${imageWidth}px`;
 img.style.height=`${imageHeight}px`;
 img.style.left=`${Math.max(0,(width-imageWidth)/2)}px`;
 img.style.top=`${Math.max(0,(height-imageHeight)/2)}px`;
 dialog.dataset.zoomed=String(imageZoom>1);
}
function setImageView(view){
 imageZoom=1;
 imageDrag=null;
 dialog.dataset.view=view;
 delete dialog.dataset.dragging;
 delete dialog.dataset.zoomed;
 dialogBody.querySelector('img')?.removeAttribute('style');
 dialogBody.querySelector('.dialog-image-stage')?.removeAttribute('style');
 labelImageView(view);
 dialogBody.setAttribute('aria-label',view==='fit'?'作品大图，滚轮缩放，放大后可拖动查看':'作品大图，可上下滚动浏览');
 document.querySelector('#dialog-caption').textContent=[imageCaption,view==='fit'?'滚轮缩放，放大后可拖动查看':isGalleryArtwork?'上下滚动浏览':''].filter(Boolean).join(' · ');
 renderImageZoom();
 dialogBody.scrollTop=0;
 dialogBody.scrollLeft=0;
}
viewToggle.addEventListener('click',()=>{imageViewChosen=true;setImageView(dialog.dataset.view==='scroll'?'fit':'scroll');});
dialogBody.addEventListener('wheel',e=>{
 if(dialog.dataset.view!=='fit'||!dialog.open)return;
 const img=dialogBody.querySelector('img');
 if(!img?.naturalWidth)return;
 e.preventDefault();
 imageViewChosen=true;
 const rect=img.getBoundingClientRect();
 const x=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
 const y=Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));
 const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?dialogBody.clientHeight:1);
 imageZoom=Math.max(.25,Math.min(64,imageZoom*Math.exp(-Math.max(-240,Math.min(240,delta))*.0025)));
 renderImageZoom();
 const next=img.getBoundingClientRect();
 dialogBody.scrollLeft+=next.left+x*next.width-e.clientX;
 dialogBody.scrollTop+=next.top+y*next.height-e.clientY;
},{passive:false});
dialogBody.addEventListener('pointerdown',e=>{
 if(dialog.dataset.view!=='fit'||imageZoom<=1||e.button!==0||!e.target.closest('.dialog-image-stage'))return;
 e.preventDefault();
 imageDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:dialogBody.scrollLeft,top:dialogBody.scrollTop};
 dialogBody.setPointerCapture(e.pointerId);
 dialog.dataset.dragging='true';
});
dialogBody.addEventListener('pointermove',e=>{
 if(!imageDrag||imageDrag.id!==e.pointerId)return;
 dialogBody.scrollLeft=imageDrag.left+imageDrag.x-e.clientX;
 dialogBody.scrollTop=imageDrag.top+imageDrag.y-e.clientY;
});
function endImageDrag(){imageDrag=null;delete dialog.dataset.dragging;}
dialogBody.addEventListener('pointerup',endImageDrag);
dialogBody.addEventListener('pointercancel',endImageDrag);
dialogBody.addEventListener('lostpointercapture',endImageDrag);
new ResizeObserver(()=>{if(dialog.open)renderImageZoom();}).observe(dialogBody);
let artworkTask=null;
let artworkVersion=0;
function cancelArtwork(){
 artworkVersion++;
 artworkTask?.controller.abort();
 artworkTask?.dispose?.();
 artworkTask=null;
 dialogBody.replaceChildren();
}
async function openArtwork(source){
 cancelArtwork();
 const version=artworkVersion;
 const controller=new AbortController();
 artworkTask={controller};
 lastFocus=source;
 isGalleryArtwork=Boolean(source.closest('.gallery-card'));
 imageCaption=isGalleryArtwork?'完整项目长图':source.dataset.caption||'';
 imageViewChosen=false;
 imageDrag=null;
 imageZoom=1;
 delete dialog.dataset.zoomed;
 delete dialog.dataset.dragging;
 dialog.dataset.view=source.dataset.view||'scroll';
 dialog.dataset.imageState='loading';
 dialogTitle.textContent=source.dataset.title||'作品';
 document.querySelector('#dialog-caption').textContent=[imageCaption,isGalleryArtwork?'上下滚动浏览':''].filter(Boolean).join(' · ');
 viewToggle.disabled=true;
 labelImageView(dialog.dataset.view);
 resumeDownload.hidden=true;
 if(source.dataset.download){
  resumeDownload.href=source.dataset.image;
  resumeDownload.download=source.dataset.download;
 }else{
  resumeDownload.removeAttribute('href');resumeDownload.removeAttribute('download');
 }
 const status=document.createElement('div');status.className='image-load-state';
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const spinner=document.createElement('span');spinner.className='image-load-spinner';spinner.setAttribute('aria-hidden','true');
 // Swirling from Loading UI, adapted to plain SVG/CSS (see vendor license).
 // Match rendered strokes: 33.333333 × 64/800 ≈ 2 × 32/24 CSS pixels.
 spinner.innerHTML='<svg class="image-load-swirl" viewBox="0 0 800 800"><circle class="image-load-swirl-circle" cx="400" cy="400" r="200" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="33.333333"/></svg><svg class="image-load-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6" pathLength="1"/></svg>';
 let downloadedAt=0;
 const message=document.createElement('p');message.className='image-load-message';message.textContent='正在加载高清原图…';
 status.append(spinner,message);dialogBody.replaceChildren(status);
 dialogBody.setAttribute('aria-busy','true');
 dialogBody.setAttribute('aria-label','正在加载作品高清原图');
 if(!dialog.open){dialog.showModal();dialogTitle.focus({preventScroll:true});}
 document.body.classList.add('dialog-open');
 dialogBody.scrollTop=0;dialogBody.scrollLeft=0;
 try{
  const loaded=await loadPortfolioOriginal(source.dataset.image,{
   signal:controller.signal,
   onPhase:phase=>{
    if(version!==artworkVersion)return;
    status.dataset.phase=phase;
    if(phase==='decoding')downloadedAt=performance.now();
    message.textContent=phase==='decoding'?'原图已下载，正在准备显示…':'正在加载高清原图…';
   }
  });
  if(version!==artworkVersion||!dialog.open){loaded.dispose();return;}
  artworkTask.dispose=loaded.dispose;
  // Complete the requested checkmark transition even when decoding is immediate.
  if(downloadedAt&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   await new Promise(resolve=>setTimeout(resolve,Math.max(0,680-(performance.now()-downloadedAt))));
  }
  if(version!==artworkVersion||controller.signal.aborted||!dialog.open){loaded.dispose();return;}
  const img=loaded.image;img.alt=source.dataset.title||'作品大图';
  const stage=document.createElement('div');stage.className='dialog-image-stage';stage.append(img);
  dialogBody.replaceChildren(stage);
  dialog.dataset.imageState='ready';dialogBody.setAttribute('aria-busy','false');
  viewToggle.disabled=false;resumeDownload.hidden=!source.dataset.download;
  setImageView(source.dataset.view||(img.naturalHeight>img.naturalWidth*1.2?'scroll':'fit'));
 }catch(error){
  if(version!==artworkVersion||controller.signal.aborted)return;
  console.warn('Unable to prepare original artwork',error);
  dialog.dataset.imageState='error';dialogBody.setAttribute('aria-busy','false');
  spinner.remove();message.textContent='原图加载失败，请重试';
  const retry=document.createElement('button');retry.type='button';retry.className='image-load-retry';
  retry.textContent='重新加载';retry.setAttribute('aria-label','重新加载高清原图');
  retry.addEventListener('click',()=>openArtwork(source));status.append(retry);
 }
}
document.addEventListener('click',e=>{
 const image=e.target.closest('[data-image]');
 if(image){openArtwork(image);return;}
 const state=e.target.closest('[data-state]');if(state){document.querySelector('#task-render').innerHTML=taskCard(state.dataset.state);document.querySelectorAll('[data-state]').forEach(b=>{const on=b===state;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});}
 const compare=e.target.closest('[data-compare]');if(compare){document.querySelector('#comparison-current').hidden=compare.dataset.compare!=='current';document.querySelector('#comparison-original').hidden=compare.dataset.compare!=='original';document.querySelectorAll('[data-compare]').forEach(b=>{const on=b===compare;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});}
 const filter=e.target.closest('[data-filter]');if(filter){document.querySelectorAll('[data-filter]').forEach(b=>{const on=b===filter;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});document.querySelectorAll('.gallery-grid .gallery-card').forEach(c=>{c.hidden=filter.dataset.filter!=='all'&&c.dataset.type!==filter.dataset.filter;});}
});
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{cancelArtwork();delete dialog.dataset.imageState;dialogBody.setAttribute('aria-busy','false');document.body.classList.remove('dialog-open');lastFocus?.focus({preventScroll:true});});
const prefersReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver'in window&&!prefersReduced){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'));
const progressLine=document.querySelector('.progress-line');
const progressHeader=document.querySelector('.site-header');
let progressFrame=0;
function progress(){progressFrame=0;const max=document.documentElement.scrollHeight-innerHeight;progressLine.style.transform=`scaleX(${max>0?scrollY/max:0})`;progressHeader.classList.toggle('scrolled',scrollY>30);}
addEventListener('scroll',()=>{if(!progressFrame)progressFrame=requestAnimationFrame(progress);},{passive:true});progress();
