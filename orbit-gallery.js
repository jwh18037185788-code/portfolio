(()=>{
  const gallery=document.querySelector('.orbit-gallery');
  if(!gallery)return;
  const stage=gallery.querySelector('.orbit-stage');
  const rotor=gallery.querySelector('.orbit-rotor');
  const tiles=[...gallery.querySelectorAll('.orbit-tile')];
  const play=gallery.querySelector('[data-orbit-play]');
  const number=gallery.querySelector('.orbit-current-index');
  const title=gallery.querySelector('.orbit-current-title');
  const indexFlip=number.querySelector('.orbit-index-flip');
  const indexValue=number.querySelector('.orbit-index-value');
  const titleValue=title.querySelector('.orbit-title-value');
  const viewer=document.querySelector('#image-dialog');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const step=Math.PI*2/tiles.length;
  let phase=0,target=null,playing=!reduced.matches,visible=false,hovered=false,focused=false;
  let width=0,height=0,cardWidth=0,raf=0,lastTime=0,holdUntil=0,impulse=0;
  let resumeTimer=0;
  let tiltX=-3,tiltY=0,aimX=-3,aimY=0,drag=null,suppressUntil=0,opening=null,resumeAfterDrag=false;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function syncPlay(){
    play.textContent=playing?'Ⅱ':'▷';
    play.setAttribute('aria-label',playing?'暂停自动旋转':'播放自动旋转');
    play.setAttribute('aria-pressed',String(!playing));
  }
  let currentFront=-1;
  const flipStates=new WeakMap();
  function flipText(host,valueNode,next){
    const state=flipStates.get(host)||{version:0,animations:[]};
    flipStates.set(host,state);
    const version=++state.version;
    state.animations.forEach(animation=>animation.cancel());
    state.animations=[];
    host.querySelectorAll('.orbit-flip-layer').forEach(layer=>layer.remove());
    const previous=valueNode.textContent;
    valueNode.textContent=next;
    if(previous===next||reduced.matches)return;
    function layer(value,className){
      const element=document.createElement('span');
      element.className=`orbit-flip-layer ${className}`;element.textContent=value;
      host.append(element);return element;
    }
    layer(previous,'orbit-flip-bottom');
    const outgoing=layer(previous,'orbit-flip-top');
    const incoming=layer(next,'orbit-flip-bottom');
    state.animations=[
      outgoing.animate([{transform:'rotateX(0deg)'},{transform:'rotateX(-90deg)'}],{duration:260,easing:'ease-in',fill:'forwards'}),
      incoming.animate([{transform:'rotateX(90deg)'},{transform:'rotateX(0deg)'}],{duration:260,delay:250,easing:'ease-out',fill:'both'})
    ];
    Promise.all(state.animations.map(animation=>animation.finished)).then(()=>{
      if(version!==state.version)return;
      host.querySelectorAll('.orbit-flip-layer').forEach(element=>element.remove());
      state.animations=[];
    }).catch(()=>{});
  }
  function updateCurrent(front){
    if(front===currentFront)return;
    currentFront=front;
    const value=String(front+1).padStart(2,'0');
    number.setAttribute('aria-label',`第 ${value} 个作品，共 ${String(tiles.length).padStart(2,'0')} 个`);
    flipText(indexFlip,indexValue,value);
    flipText(title,titleValue,tiles[front].dataset.title);
  }
  function draw(){
    const radius=Math.max(65,(width-cardWidth*1.25)/2-20);
    const depth=Math.min(200,width*.18);
    let front=0,frontDepth=-Infinity;
    tiles.forEach((tile,i)=>{
      const angle=phase-i*step,sine=Math.sin(angle),cosine=Math.cos(angle);
      const x=sine*radius,y=cosine*height*.245,z=cosine*depth;
      tile.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateY(${(-sine*16).toFixed(2)}deg) rotateZ(${(-sine*3).toFixed(2)}deg)`;
      // Rear covers recede into the page; the front remains fully visible.
      tile.style.opacity=String(.22+Math.pow((cosine+1)/2,1.4)*.78);
      if(cosine>frontDepth){front=i;frontDepth=cosine;}
    });
    rotor.style.transform=`rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
    updateCurrent(front);
  }
  function canRotate(){return playing&&!hovered&&!focused&&!drag&&!viewer.open;}
  function sleep(){
    cancelAnimationFrame(raf);raf=0;lastTime=0;
    clearTimeout(resumeTimer);resumeTimer=0;
  }
  function wake(){
    clearTimeout(resumeTimer);resumeTimer=0;
    if(!raf&&visible&&!document.hidden){lastTime=0;raf=requestAnimationFrame(frame);}
  }
  function frame(time){
    raf=0;
    if(!visible||document.hidden)return;
    const dt=lastTime?Math.min(.05,(time-lastTime)/1000):.016;
    lastTime=time;
    const easing=1-Math.exp(-dt*9);
    tiltX+=(aimX-tiltX)*easing;tiltY+=(aimY-tiltY)*easing;
    const running=canRotate()&&time>holdUntil;
    if(target!==null){
      phase+=(target-phase)*(reduced.matches?1:easing);
      if(Math.abs(target-phase)<.0005){phase=target;target=null;}
    }else if(!drag){
      // At the front/bottom of the ellipse, rightward travel is counterclockwise.
      if(running)phase+=dt*.105;
      phase+=impulse*dt;
      impulse*=Math.exp(-dt*5);
    }
    draw();
    if(running||target!==null||Math.abs(impulse)>.001||Math.abs(aimX-tiltX)+Math.abs(aimY-tiltY)>.002){
      raf=requestAnimationFrame(frame);
    }else if(canRotate()&&holdUntil>time){
      // Preserve the original hold duration without redrawing a stationary gallery.
      resumeTimer=setTimeout(()=>{resumeTimer=0;wake();},Math.max(0,holdUntil-performance.now())+1);
    }
  }
  function resize(){
    width=stage.clientWidth;height=stage.clientHeight;
    cardWidth=clamp(width*.235,148,288);
    stage.style.setProperty('--orbit-card-width',`${cardWidth}px`);
    draw();wake();
  }
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible)wake();else sleep();
  },{rootMargin:'120px 0px',threshold:0}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)sleep();else wake();});
  play.addEventListener('click',()=>{playing=!playing;syncPlay();wake();});
  function turn(direction){const anchor=target===null?Math.round(phase/step)*step:target;target=anchor+direction*step;holdUntil=performance.now()+2500;impulse=0;wake();}
  gallery.querySelectorAll('[data-orbit-step]').forEach(button=>button.addEventListener('click',()=>turn(Number(button.dataset.orbitStep))));
  stage.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();turn(event.key==='ArrowLeft'?-1:1);}
  });
  tiles.forEach(tile=>{
    tile.addEventListener('pointerenter',()=>{if(!resumeAfterDrag)hovered=true;wake();});
    tile.addEventListener('pointerleave',()=>{hovered=false;wake();});
  });
  stage.addEventListener('focusin',event=>{focused=event.target.matches(':focus-visible');wake();});
  stage.addEventListener('focusout',event=>{focused=stage.contains(event.relatedTarget)&&event.relatedTarget.matches(':focus-visible');wake();});
  stage.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.target.closest('.orbit-controls'))return;
    focused=false;resumeAfterDrag=false;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,phase,moved:false};target=null;impulse=0;
  });
  stage.addEventListener('pointermove',event=>{
    if(!drag&&resumeAfterDrag){resumeAfterDrag=false;hovered=!!event.target.closest('.orbit-tile');}
    const box=stage.getBoundingClientRect();
    if(!reduced.matches){aimY=clamp((event.clientX-box.left)/width-.5,-.5,.5)*10;aimX=-3-clamp((event.clientY-box.top)/height-.5,-.5,.5)*7;}
    if(drag&&drag.id===event.pointerId){
      const dx=event.clientX-drag.x;
      if(!drag.moved&&Math.abs(dx)>6){drag.moved=true;stage.setPointerCapture(event.pointerId);stage.classList.add('is-dragging');}
      if(drag.moved){phase=drag.phase+dx/width*Math.PI*1.6;hovered=false;}
    }
    wake();
  });
  function endDrag(event){
    if(!drag||drag.id!==event.pointerId)return;
    if(drag.moved){
      suppressUntil=performance.now()+350;holdUntil=performance.now()+1200;
      hovered=false;focused=false;resumeAfterDrag=true;
    }
    drag=null;stage.classList.remove('is-dragging');wake();
  }
  stage.addEventListener('pointerup',endDrag);
  stage.addEventListener('pointercancel',endDrag);
  stage.addEventListener('lostpointercapture',endDrag);
  stage.addEventListener('pointerleave',()=>{aimX=-3;aimY=0;hovered=false;wake();});
  stage.addEventListener('wheel',event=>{
    if(reduced.matches)return;
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?height:1);
    impulse+=clamp(delta,-240,240)*.006;holdUntil=performance.now()+800;wake();
  },{passive:true});
  stage.addEventListener('click',event=>{
    if(performance.now()<suppressUntil){event.preventDefault();event.stopPropagation();return;}
    const tile=event.target.closest('.orbit-tile');
    if(tile)opening={tile,rect:tile.getBoundingClientRect()};
  },true);
  // The existing image viewer handles the project; only its cover transition is added here.
  document.addEventListener('click',event=>{
    const tile=event.target.closest('.orbit-tile');
    if(!tile||!opening||opening.tile!==tile||!viewer.open||reduced.matches)return;
    const body=viewer.querySelector('.dialog-body'),box=body.getBoundingClientRect();
    const start=opening.rect;opening=null;
    const ghost=tile.querySelector('img').cloneNode();
    const finalWidth=Math.min(box.width,box.height*16/9);
    const finalHeight=finalWidth*9/16;
    ghost.className='orbit-transition-cover';ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{left:`${box.left+(box.width-finalWidth)/2}px`,top:`${box.top+(box.height-finalHeight)/2}px`,width:`${finalWidth}px`,height:`${finalHeight}px`});
    viewer.append(ghost);body.style.opacity='0';
    const animation=ghost.animate([
      {transform:`translate(${start.left-(box.left+(box.width-finalWidth)/2)}px,${start.top-(box.top+(box.height-finalHeight)/2)}px) scale(${start.width/finalWidth},${start.height/finalHeight})`,transformOrigin:'0 0',opacity:1},
      {transform:'translate(0,0) scale(1)',transformOrigin:'0 0',opacity:1}
    ],{duration:480,easing:'cubic-bezier(.22,.75,.2,1)',fill:'both'});
    animation.finished.then(()=>{
      if(!viewer.open)return;
      body.style.opacity='';body.animate([{opacity:0},{opacity:1}],{duration:220});
      return ghost.animate([{opacity:1},{opacity:0}],{duration:180,fill:'forwards'}).finished;
    }).catch(()=>{}).finally(()=>{ghost.remove();body.style.opacity='';});
  });
  viewer.addEventListener('close',()=>{
    viewer.querySelectorAll('.orbit-transition-cover').forEach(el=>{el.getAnimations().forEach(animation=>animation.cancel());el.remove();});
    viewer.querySelector('.dialog-body').style.opacity='';holdUntil=performance.now()+1600;wake();
  });
  reduced.addEventListener('change',()=>{playing=!reduced.matches;aimX=-3;aimY=0;flipText(indexFlip,indexValue,indexValue.textContent);flipText(title,titleValue,titleValue.textContent);syncPlay();wake();});
  syncPlay();resize();
})();
