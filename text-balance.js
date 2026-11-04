(()=>{
  const selector='.sprint-section p,.sprint-story-copy li,.sprint-phase li,.ai-copy>p,.about-content>p,.gallery-card>p,.visual-page-bottom>p,.gallery-return>span';
  function balance(element){
    if(element.dataset.tailBalanced||element.closest('.sprint-rules-content'))return;
    element.dataset.tailBalanced='true';
    const last=[...element.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim()).at(-1);
    if(!last)return;
    const text=last.textContent,matches=[...text.matchAll(/\p{Script=Han}/gu)];
    if(matches.length<10)return;
    const start=matches.at(-5).index,tail=text.slice(start);
    if(tail.length>24)return;
    const span=document.createElement('span');span.className='text-tail';span.textContent=tail;
    last.textContent=text.slice(0,start);last.after(span);
  }
  function enhance(root){
    if(root.nodeType!==Node.ELEMENT_NODE||root.closest('.text-tail'))return;
    if(root.matches(selector))balance(root);
    root.querySelectorAll(selector).forEach(balance);
  }
  enhance(document.body);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(enhance))).observe(document.body,{childList:true,subtree:true});
})();
