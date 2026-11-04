(()=>{
  const selector='.site-header nav a,.text-link,.agent-demo-open,.case-media-toolbar button,.case-media-toolbar a,.to-top,.dialog-close,.dialog-view-toggle,.image-load-retry,.sprint-document-link,.agent-demo-mobile>span:not(.home-image-frame),summary';
  const symbolPattern=/^[↗↖↘↙↑↓←→×＋+]+$/;
  const suffixPattern=/\s*([↗↖↘↙↑↓←→×＋+]+)\s*$/;
  const prefixPattern=/^\s*([↗↖↘↙↑↓←→×＋+]+)\s*/;
  function rollingWords(label){
    const words=document.createElement('span');
    words.className='action-words';words.setAttribute('aria-hidden','true');
    [...label].forEach((character,index)=>{
      const clip=document.createElement('span');clip.className='action-character';
      clip.style.setProperty('--action-letter',index);
      const track=document.createElement('span');track.className='action-track';
      for(let i=0;i<2;i++){
        const glyph=document.createElement('span');glyph.className='action-glyph';
        glyph.textContent=character===' '?'\u00a0':character;track.append(glyph);
      }
      clip.append(track);words.append(clip);
    });
    return words;
  }
  function decorate(element){
    if(element.dataset.textActionReady)return;
    element.dataset.textActionReady='true';
    const host=element.matches('a,button,summary')?element:element.closest('a,button');
    if(!host)return;
    if(element.matches('.sprint-document-link')){
      const name=element.querySelector('strong'),icon=element.lastElementChild;
      if(!name||!icon)return;
      const label=name.textContent;
      if(!host.hasAttribute('aria-label'))host.setAttribute('aria-label',element.textContent.replace(/\s+/g,' ').trim());
      name.replaceChildren(rollingWords(label));icon.classList.add('action-symbol');
      element.classList.add('document-text-action');
      return;
    }
    let label=[...element.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent).join('').trim();
    const decorations=[...element.children];
    const leading=[];
    const prefix=label.match(prefixPattern);
    if(prefix){
      label=label.replace(prefixPattern,'').trim();
      const icon=document.createElement('span');icon.textContent=prefix[1];leading.push(icon);
    }
    const suffix=label.match(suffixPattern);
    if(suffix){
      label=label.replace(suffixPattern,'').trim();
      const icon=document.createElement('span');icon.textContent=suffix[1];icon.setAttribute('aria-hidden','true');
      decorations.push(icon);
    }
    if(!label)return;
    const icons=[...leading,...decorations].filter(node=>node.hasAttribute('data-action-icon')||symbolPattern.test(node.textContent.trim()));
    // Some summary labels have no direct text or icon; leave those structures intact.
    if(element.tagName==='SUMMARY'&&!icons.length)return;
    if(!host.hasAttribute('aria-label'))host.setAttribute('aria-label',label);
    icons.forEach(icon=>{
      icon.classList.add('action-symbol');icon.setAttribute('aria-hidden','true');
      const glyph=icon.textContent.trim();
      if(glyph==='↓'||glyph==='↑')icon.classList.add('action-symbol-vertical');
      if(glyph==='←')icon.classList.add('action-symbol-back');
    });
    element.classList.add('text-action');
    if(host!==element)host.classList.add('text-action-host');
    element.replaceChildren(...leading,rollingWords(label),...decorations);
  }
  function enhance(root){
    if(root.nodeType!==Node.ELEMENT_NODE)return;
    if(root.matches(selector))decorate(root);
    root.querySelectorAll(selector).forEach(decorate);
  }
  window.portfolioTextActions = {decorate};
  enhance(document.body);
  // Evidence/document panels are replaced in place, so decorate their new actions too.
  const observer=new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node.nodeType===Node.ELEMENT_NODE&&!node.closest('.action-words'))enhance(node);
    }));
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();
