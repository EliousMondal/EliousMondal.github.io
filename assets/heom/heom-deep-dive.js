/* Page-local navigation and exact one-exponential hierarchy counts. */
(function () {
  'use strict';
  function choose(n,k) {
    let r=1n;
    for (let j=1n;j<=k;j++) r=r*(n-k+j)/j;
    return r;
  }
  function countPatterns(N,L) {
    let canonical=0, unique=0;
    function visit(left,largest,parts) {
      if (!left) {
        canonical++;
        const multiplicities=new Map();
        parts.forEach(q=>multiplicities.set(q,(multiplicities.get(q)||0)+1));
        if (parts.length<N) multiplicities.set(0,N-parts.length);
        const G=multiplicities.size;
        unique+=(G+1)*(G+1)+Array.from(multiplicities.values()).filter(x=>x>=2).length;
        return;
      }
      if (parts.length>=N) return;
      for (let p=Math.min(left,largest);p>=1;p--) {
        parts.push(p); visit(left-p,p,parts); parts.pop();
      }
    }
    for(let tier=0;tier<=L;tier++) visit(tier,tier,[]);
    return {canonical,unique};
  }
  const commas=x=>x.toLocaleString('en-US');
  const compact=x=>{const s=x.toString();return s.length>20?s[0]+'.'+s.slice(1,7)+' × 10^'+(s.length-1)+' (approx.)':commas(x);};
  function setupCounts() {
    const form=document.getElementById('heom-count-form');
    const output=document.getElementById('heom-count-output');
    if(!form||!output) return;
    function calculate(event) {
      if(event) event.preventDefault();
      const rawN=document.getElementById('heom-N').value.trim();
      const N=Number(rawN), L=Number(document.getElementById('heom-L').value);
      if(!/^\d+$/.test(rawN)||!Number.isSafeInteger(N)||N<1||N>1e12||!Number.isInteger(L)||L<0||L>25) {
        output.textContent='Use a whole number of molecules from 1 to 1,000,000,000,000 and a whole hierarchy depth from 0 to 25.';
        return;
      }
      const c=countPatterns(N,L), naive=choose(BigInt(N)+BigInt(L),BigInt(L));
      const entries=(BigInt(N)+1n)**2n;
      const rows=[['Conventional ADOs',compact(naive)],['Canonical ADOs',commas(c.canonical)],['Conventional dense complex entries',compact(naive*entries)],['After label reduction only',compact(BigInt(c.canonical)*entries)],['After both reductions',commas(c.unique)+' complex variables'],['One complex128 reduced vector',(16*c.unique/1e6).toFixed(6)+' MB (decimal)']];
      output.replaceChildren();
      const intro=document.createElement('p'); intro.className='heom-count-summary';
      intro.textContent='N = '+commas(N)+', L = '+L+'; one exponential per molecule.';
      output.appendChild(intro);
      const wrap=document.createElement('div');wrap.className='table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Calculated hierarchy dimensions');
      const table=document.createElement('table');const tb=document.createElement('tbody');
      rows.forEach(([label,value])=>{const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');th.scope='row';th.textContent=label;td.textContent=value;tr.append(th,td);tb.appendChild(tr);});
      table.appendChild(tb);wrap.appendChild(table);output.appendChild(wrap);
      if((naive*entries).toString().length>20){
        const details=document.createElement('details'),summary=document.createElement('summary'),exact=document.createElement('pre');
        details.className='heom-count-exact';summary.textContent='Show exact large-integer counts';
        exact.textContent='Conventional ADOs: '+naive+'\n\nConventional dense entries: '+naive*entries+'\n\nAfter label reduction only: '+BigInt(c.canonical)*entries;
        details.append(summary,exact);output.appendChild(details);
      }
      const note=document.createElement('p');
      note.textContent=(N>=L+2?'The unique-variable dimension has saturated in N at this depth. ':'The sufficient threshold for the saturated unique-variable dimension is N ≥ '+(L+2)+'. ')+
       'Memory is for one state vector only, not the integrator, coefficient graph, or a saved trajectory. Counts use fully symmetric initial data and the single-excitation manifold.';
      output.appendChild(note);
    }
    form.addEventListener('submit',calculate);calculate();
  }
  function setupContents() {
    const details=document.getElementById('heom-toc-details');
    const media=window.matchMedia('(max-width:820px)');
    if(details) {
      details.open=!media.matches;
      media.addEventListener('change',()=>{details.open=!media.matches;});
      details.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{if(media.matches) details.open=false;}));
    }
    const sections=Array.from(document.querySelectorAll('.deep-dive-content > section[id]'));
    const links=new Map(Array.from(document.querySelectorAll('.deep-dive-toc a')).map(a=>[a.hash.slice(1),a]));
    let pending=false;
    function mark() {
      let active=sections[0];
      // for(const section of sections) {if(section.getBoundingClientRect().top<=160) active=section;else break;}
      const paddingTop =
        parseFloat(
          getComputedStyle(document.documentElement).scrollPaddingTop
        ) || 0;

      for (const section of sections) {
        const marginTop =
          parseFloat(getComputedStyle(section).scrollMarginTop) || 0;

        if (
          section.getBoundingClientRect().top <=
          paddingTop + marginTop + 4
        ) {
          active = section;
        } else {
          break;
        }
      }
      links.forEach((a,id)=>{if(active&&id===active.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
      pending=false;
    }
    addEventListener('scroll',()=>{if(!pending){pending=true;requestAnimationFrame(mark);}},{passive:true});mark();
  }
  let printState=[];
  addEventListener('beforeprint',()=>{printState=Array.from(document.querySelectorAll('.heom-solution')).map(d=>[d,d.open]);printState.forEach(([d])=>{d.open=true;});});
  addEventListener('afterprint',()=>{printState.forEach(([d,open])=>{d.open=open;});});
  // document.addEventListener('DOMContentLoaded',()=>{setupCounts();setupContents();});
  function initializeHEOMPage() {
    setupCounts();
    setupContents();

    document.querySelectorAll('[data-print-page]').forEach(function (button) {
      button.addEventListener('click', function () {
        window.print();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initializeHEOMPage,
      { once: true }
    );
  } else {
    initializeHEOMPage();
  }
})();
