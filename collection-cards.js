(()=>{
  const cards=[...document.querySelectorAll('.is-visual-page .gallery-image')];
  if(!cards.length)return;
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  cards.forEach(card=>{
    let box=null,frame=0,point=null;
    const reset=()=>{
      if(frame)cancelAnimationFrame(frame);
      frame=0;box=null;point=null;
      for(const name of ['--card-rx','--card-ry','--card-x','--card-y'])card.style.removeProperty(name);
    };
    card.addEventListener('pointerenter',()=>{box=card.getBoundingClientRect();});
    card.addEventListener('pointermove',event=>{
      if(!fine.matches||reduced.matches)return;
      box||=card.getBoundingClientRect();
      point={x:Math.max(-.5,Math.min(.5,(event.clientX-box.left)/box.width-.5)),y:Math.max(-.5,Math.min(.5,(event.clientY-box.top)/box.height-.5))};
      if(frame)return;
      frame=requestAnimationFrame(()=>{
        frame=0;if(!point)return;
        card.style.setProperty('--card-rx',`${(-point.y*8).toFixed(2)}deg`);
        card.style.setProperty('--card-ry',`${(point.x*10).toFixed(2)}deg`);
        card.style.setProperty('--card-x',`${(point.x*5).toFixed(2)}px`);
        card.style.setProperty('--card-y',`${(point.y*5).toFixed(2)}px`);
      });
    });
    card.addEventListener('pointerleave',reset);
    card.addEventListener('pointercancel',reset);
    reduced.addEventListener('change',reset);
  });
})();
