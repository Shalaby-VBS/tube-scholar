(function(){
  // one guide's data, or a list of them on a course page (build_course.py): each guide lives in its own box, ids prefixed by vp
  var LIST=%%DATA%%; if(!Array.isArray(LIST)) LIST=[LIST];
  var RM=matchMedia('(prefers-reduced-motion: reduce)');
  var small=matchMedia('(max-width:980px)');
  var each=function(list,fn){Array.prototype.forEach.call(list,fn)};

  function guide(DATA){
  var VP=DATA.vp||'', box=DATA.box?document.getElementById(DATA.box):document;
  var roots={}; each(box.querySelectorAll('.wrap[data-lang]'),function(w){roots[w.dataset.lang]=w});
  var PFX={}; DATA.langs.forEach(function(l,ix){PFX[l]=VP+(ix?l+'-':'')});

  // shared state, kept only in this browser
  var KEY='ytguide-'+DATA.id, st={done:[],quick:false,lang:DATA.langs[0]};
  try{ var raw=localStorage.getItem(KEY); if(raw){ var o=JSON.parse(raw); st.done=o.done||[]; st.quick=!!o.quick; if(DATA.langs.indexOf(o.lang)>-1) st.lang=o.lang; } }catch(e){}
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(st)); }catch(e){} }

  function initLang(lang){
    var root=roots[lang], P=PFX[lang], D=DATA[lang], L=D.L;
    var $=function(id){return document.getElementById(P+id)};

    // flashcards
    // spaced repetition (Leitner boxes 1-5), kept in this browser and shared by both language editions
    var DAY=864e5, GAP=[0,1,3,7,14,30], SKEY=KEY+'-srs', srs={};
    try{ srs=JSON.parse(localStorage.getItem(SKEY)||'{}')||{}; }catch(e){}
    function saveSrs(){ try{ localStorage.setItem(SKEY,JSON.stringify(srs)); }catch(e){} }
    var ALL=D.cards, TAGS=D.tags, DIFF=D.diff||{}, flt={t:'all',l:'all'}, deck=ALL.slice(), i=0, open=false, busy=false, card=$('card'), known={};
    function render(){
      var c=deck[i]; if(!c) return;
      $('q').innerHTML=c.q; $('a').innerHTML=c.a; $('a').hidden=!open;
      $('side').textContent=open?L.a:L.q; $('ctag').textContent=[TAGS[c.t],DIFF[c.l]].filter(Boolean).join(' · ');
      $('hint').textContent=open?L.hintA:L.hintQ;
      $('count').textContent=(i+1)+' / '+deck.length;
      $('cbar').style.transform='scaleX('+((i+1)/deck.length)+')';
      $('know').disabled=$('again').disabled=!open;
      var now=Date.now(), due=0, learned=0;
      ALL.forEach(function(_,ix){ var r=srs[ix]; if(r&&r.d<=now) due++; if(r&&r.b>=3) learned++; });
      $('known').textContent=L.srs.replace('{due}',due).replace('{learned}',learned).replace('{t}',ALL.length);
    }
    function anim(cls,done){
      if(RM.matches){ if(done) done(); return; }
      card.classList.remove('flip-out','flip-in','slide-next','slide-prev'); void card.offsetWidth; card.classList.add(cls);
      var t, fin=function(){card.removeEventListener('animationend',fin); clearTimeout(t); card.classList.remove(cls); if(done) done();};
      t=setTimeout(fin,600); card.addEventListener('animationend',fin);
    }
    function flip(){ if(busy) return; busy=true; anim('flip-out',function(){ open=!open; render(); anim('flip-in',function(){busy=false}); if(RM.matches) busy=false; }); }
    function go(d){ i=(i+d+deck.length)%deck.length; open=false; render(); anim(d>0?'slide-next':'slide-prev'); }
    // two filters: topic tag and difficulty level; an empty result falls back to the whole deck
    function setFilter(kind,v){
      flt[kind]=v;
      deck=order(ALL.filter(function(c){return (flt.t==='all'||c.t===flt.t)&&(flt.l==='all'||c.l===flt.l)})); if(!deck.length) deck=order(ALL);
      i=0; open=false;
      each(root.querySelectorAll('.chip'),function(b){b.setAttribute('aria-pressed',String(flt[b.dataset.k]===b.dataset.v))}); render();
    }
    function chips(box,kind,allLabel,map){
      [['all',allLabel]].concat(Object.keys(map).map(function(k){return [k,map[k]]})).forEach(function(p){
        var b=document.createElement('button'); b.type='button'; b.className='chip'; b.dataset.k=kind; b.dataset.v=p[0]; b.textContent=p[1];
        b.setAttribute('aria-pressed',String(p[0]==='all')); b.onclick=function(){setFilter(kind,p[0])}; box.appendChild(b);
      });
    }
    chips($('filters'),'t',L.all,TAGS);
    var used={}; ALL.forEach(function(c){ if(c.l) used[c.l]=DIFF[c.l]; });
    if(Object.keys(used).length>1){ var ord={}; ['basic','mid','adv'].forEach(function(k){ if(used[k]) ord[k]=used[k]; }); chips($('lfilters'),'l',L.allLv,ord); }
    else $('lfilters').hidden=true;
    card.onclick=flip;
    function order(list){ // due first, then new, then the rest by due date
      var now=Date.now(), idx=function(c){return ALL.indexOf(c)};
      return list.slice().sort(function(a,b){ var ra=srs[idx(a)], rb=srs[idx(b)];
        var ka=!ra?1:(ra.d<=now?0:2), kb=!rb?1:(rb.d<=now?0:2); return ka-kb || (ra&&rb?ra.d-rb.d:0); });
    }
    deck=order(deck);
    $('know').onclick=function(){ var ix=ALL.indexOf(deck[i]), r=srs[ix]||{b:0}; var b=Math.min(5,r.b+1); srs[ix]={b:b,d:Date.now()+GAP[b]*DAY}; saveSrs(); known[ix]=1; go(1); };
    $('again').onclick=function(){ srs[ALL.indexOf(deck[i])]={b:1,d:Date.now()}; saveSrs(); var c=deck.splice(i,1)[0]; deck.splice(Math.min(deck.length,i+3),0,c); if(i>=deck.length) i=0; open=false; render(); anim('slide-next'); };
    $('next').onclick=function(){go(1)}; $('prev').onclick=function(){go(-1)};
    $('shuf').onclick=function(){ for(var k=deck.length-1;k>0;k--){var j=Math.floor(Math.random()*(k+1));var t=deck[k];deck[k]=deck[j];deck[j]=t} i=0; open=false; render(); anim('slide-next'); };
    document.addEventListener('keydown',function(e){
      if(root.hidden) return;
      var r=$('cards').getBoundingClientRect(); if(r.top>innerHeight||r.bottom<0) return;
      if(e.target.tagName==='BUTTON'&&e.key===' '&&e.target!==card) return;
      var nextKey=L.rtl?'ArrowLeft':'ArrowRight', prevKey=L.rtl?'ArrowRight':'ArrowLeft';
      if(e.key===' '){e.preventDefault(); flip();} else if(e.key===nextKey) go(1); else if(e.key===prevKey) go(-1);
    });
    render();

    if(RM.matches) each(root.querySelectorAll('.loopfig svg'),function(svg){ if(svg.pauseAnimations) svg.pauseAnimations(); });
    // scenario quiz: one pick per question, explanation revealed after the pick
    each(root.querySelectorAll('.quiz-score'),function(box){
      var sec=box.closest('.sec'), qs=sec.querySelectorAll('.mcq'), out=box.querySelector('.qs');
      function score(){ var a=0,c=0; each(qs,function(q){ if(q.dataset.picked){a++; if(q.dataset.picked==='1') c++;} }); out.textContent=c+' / '+qs.length; }
      each(qs,function(q){ each(q.querySelectorAll('.opt'),function(o){ o.addEventListener('click',function(){
        if(q.dataset.picked) return; q.dataset.picked=o.dataset.ok;
        each(q.querySelectorAll('.opt'),function(x){ x.disabled=true; if(x.dataset.ok==='1') x.classList.add('ok'); });
        if(o.dataset.ok!=='1') o.classList.add('bad');
        var ex=q.nextElementSibling; if(ex&&ex.classList.contains('mcq-exp')) ex.hidden=false; score();
      }); }); });
      box.querySelector('.qreset').addEventListener('click',function(){
        each(qs,function(q){ delete q.dataset.picked; each(q.querySelectorAll('.opt'),function(x){x.disabled=false; x.classList.remove('ok','bad')});
          var ex=q.nextElementSibling; if(ex&&ex.classList.contains('mcq-exp')) ex.hidden=true; }); score();
      });
      score();
    });


    // stat count-up toward the values already in the HTML
    if(!RM.matches && !root.hidden){
      each(root.querySelectorAll('.stats b:not(.ar), .facts b'),function(el){
        var txt=el.textContent.trim(), m=txt.match(/^([\d.]+)(K?)$/); if(!m) return;
        var end=parseFloat(m[1]), suf=m[2], dec=(m[1].split('.')[1]||'').length, t0=null;
        el.style.minWidth=el.offsetWidth+'px'; el.style.display='inline-block';
        function step(ts){ if(t0===null) t0=ts; var p=Math.min(1,Math.max(0,(ts-t0-500)/1100)), e=1-Math.pow(1-p,3);
          el.textContent=(end*e).toFixed(dec)+suf; if(p<1) requestAnimationFrame(step); else el.textContent=txt; }
        requestAnimationFrame(step);
      });
    }

    // hero agent network: nodes drift, close nodes link, packets travel along links
    (function(){
      var cv=$('net'); if(!cv||!cv.getContext) return;
      var ctx=cv.getContext('2d'), W=0,H=0, dpr=Math.min(2,window.devicePixelRatio||1), nodes=[], packets=[], col={}, run=false, raf=0, LINK=140;
      function colors(){ var cs=getComputedStyle(document.documentElement); col.line=cs.getPropertyValue('--muted').trim()||'#888'; col.acc=cs.getPropertyValue('--accent').trim()||'#0a7'; }
      function size(){ var r=cv.getBoundingClientRect(); if(!r.width) return; W=r.width; H=r.height; cv.width=W*dpr; cv.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
        var n=Math.round(Math.min(46,Math.max(16,W*H/22000))); nodes=[];
        for(var k=0;k<n;k++) nodes.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:1.3+Math.random()*1.6,hub:Math.random()<.14}); }
      function frame(){
        ctx.clearRect(0,0,W,H);
        for(var a=0;a<nodes.length;a++){ var p=nodes[a];
          if(!RM.matches){ p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>W) p.vx*=-1; if(p.y<0||p.y>H) p.vy*=-1; }
          for(var b=a+1;b<nodes.length;b++){ var q=nodes[b], dx=p.x-q.x, dy=p.y-q.y, d=Math.sqrt(dx*dx+dy*dy);
            if(d<LINK){ ctx.globalAlpha=(1-d/LINK)*.28; ctx.strokeStyle=col.line; ctx.lineWidth=.8; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke();
              if(!RM.matches && packets.length<7 && Math.random()<.0009) packets.push({a:p,b:q,t:0}); } } }
        for(var c=0;c<nodes.length;c++){ var s=nodes[c]; ctx.globalAlpha=s.hub?.85:.45; ctx.fillStyle=s.hub?col.acc:col.line; ctx.beginPath(); ctx.arc(s.x,s.y,s.hub?s.r+1.2:s.r,0,7); ctx.fill(); }
        for(var j=packets.length-1;j>=0;j--){ var pk=packets[j]; pk.t+=.012; if(pk.t>=1){packets.splice(j,1); continue;}
          var x=pk.a.x+(pk.b.x-pk.a.x)*pk.t, y=pk.a.y+(pk.b.y-pk.a.y)*pk.t;
          ctx.globalAlpha=Math.sin(pk.t*Math.PI); ctx.fillStyle=col.acc; ctx.shadowColor=col.acc; ctx.shadowBlur=10; ctx.beginPath(); ctx.arc(x,y,2.6,0,7); ctx.fill(); ctx.shadowBlur=0; }
        ctx.globalAlpha=1;
        if(run && !RM.matches) raf=requestAnimationFrame(frame);
      }
      function start(){ cancelAnimationFrame(raf); if(!nodes.length) size(); if(run) raf=requestAnimationFrame(frame); else frame(); }
      colors(); size(); frame();
      addEventListener('resize',function(){ size(); frame(); });
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){ colors(); frame(); });
      new MutationObserver(function(){ colors(); frame(); }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
      if('IntersectionObserver' in window) new IntersectionObserver(function(es){ run=es[0].isIntersecting && !document.hidden; start(); }).observe(cv);
      document.addEventListener('visibilitychange',function(){ run=!document.hidden && !root.hidden; start(); });
      if(RM.addEventListener) RM.addEventListener('change',start);
    })();

    // rail highlight + close the collapsed rail on phones after a pick
    var links={}; each(root.querySelectorAll('nav.rail a'),function(a){links[a.getAttribute('href').slice(1)]=a});
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(e){
        if(e.isIntersecting){var id=e.target.id; Object.keys(links).forEach(function(k){links[k].classList.toggle('on',k===id)})}
      })},{rootMargin:'0px 0px -70% 0px'});
      Object.keys(links).forEach(function(id){var el=document.getElementById(id); if(el) io.observe(el)});
    }
    // in-page search over headings, text and glossary rows
    var idxS=[], cur=null;
    each(root.querySelectorAll('main h2[id], main h3[id], main p, main li, main td, main .kt li, main .mx li'),function(el){
      if(el.id){ cur={id:el.id,title:el.textContent.replace(/\s+/g,' ').trim()}; idxS.push({id:cur.id,title:cur.title,text:cur.title}); return; }
      if(cur&&!el.closest('.chap')) idxS.push({id:cur.id,title:cur.title,text:el.textContent.replace(/\s+/g,' ').trim()});
    });
    var box=$('q-search'), res=$('srchres');
    function esc(t){return t.replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
    box.addEventListener('input',function(){
      var q=box.value.trim().toLowerCase(); if(q.length<2){res.hidden=true; res.innerHTML=''; return;}
      var seen={}, out=[];
      for(var k=0;k<idxS.length&&out.length<8;k++){ var e=idxS[k], p=e.text.toLowerCase().indexOf(q); if(p<0||seen[e.id]) continue; seen[e.id]=1;
        var a=Math.max(0,p-40), snip=(a?'…':'')+esc(e.text.slice(a,p))+'<mark>'+esc(e.text.slice(p,p+q.length))+'</mark>'+esc(e.text.slice(p+q.length,p+q.length+60))+'…';
        out.push('<a href="#'+e.id+'"><b>'+esc(e.title)+'</b><span>'+snip+'</span></a>'); }
      res.innerHTML=out.length?out.join(''):'<p>'+esc(L.noHits)+'</p>'; res.hidden=false;
    });
    res.addEventListener('click',function(e){ if(e.target.closest('a')){ res.hidden=true; if(small.matches) $('navd').open=false; } });
    if(small.matches) $('navd').open=false;
    each(root.querySelectorAll('nav.rail a'),function(a){a.addEventListener('click',function(){ if(small.matches) $('navd').open=false; })});
  }

  // quick mode + per-section progress, painted into both editions
  function paint(){
    Object.keys(roots).forEach(function(lang){
      var root=roots[lang], P=PFX[lang], L=DATA[lang].L, btns=root.querySelectorAll('.done');
      root.classList.toggle('quick',st.quick);
      each(root.querySelectorAll('.qbtn'),function(b){b.setAttribute('aria-pressed',String(st.quick))});
      each(btns,function(b){
        var on=st.done.indexOf(b.dataset.id)>-1; b.setAttribute('aria-pressed',String(on)); b.lastChild.textContent=on?L.doneOn:L.done;
        var l=root.querySelector('nav.rail a[href="#'+P+b.dataset.id+'"]'); if(l) l.classList.toggle('ok',on);
      });
      var n=st.done.length, tot=btns.length;
      document.getElementById(P+'donec').textContent=n+' / '+tot;
      document.getElementById(P+'doneb').style.transform='scaleX('+(tot?n/tot:0)+')';
    });
  }
  function wire(root){
  each(root.querySelectorAll('.done'),function(b){ b.addEventListener('click',function(){
    var k=st.done.indexOf(b.dataset.id); if(k>-1) st.done.splice(k,1); else st.done.push(b.dataset.id); save(); paint();
  })});
  each(root.querySelectorAll('.qbtn'),function(b){ b.addEventListener('click',function(){
    var anchor=b.closest('.sec')||b, y=anchor.getBoundingClientRect().top;
    st.quick=!st.quick; save(); paint(); scrollBy(0,anchor.getBoundingClientRect().top-y);
  })});

  }
  Object.keys(roots).forEach(function(k){ wire(roots[k]); });
  // a course video keeps each language edition as inert text (<script type="text/html" class="lazy">) until it is shown
  var ready=false;
  function ensure(lang){
    if(roots[lang]||!DATA.box) return;
    var s=box.querySelector('script.lazy[data-lang="'+lang+'"]'); if(!s) return;
    var f=document.createRange().createContextualFragment(s.textContent), w=f.querySelector('.wrap[data-lang]');
    s.parentNode.replaceChild(f,s); if(window.__ti) window.__ti(w);
    roots[lang]=w; wire(w); if(ready){ initLang(lang); paint(); }
  }

  // the last heading above the fold in the shown edition, without its prefix
  function anchor(){
    var cur=roots[st.lang], a=null;
    if(cur && !cur.hidden) each(cur.querySelectorAll('h2[id], section[id]'),function(h){ if(h.getBoundingClientRect().top<160) a=h.id.replace(PFX[st.lang],''); });
    return a;
  }
  function show(lang){ ensure(lang); if(!roots[lang]) lang=DATA.langs[0]; st.lang=lang; save(); Object.keys(roots).forEach(function(k){ roots[k].hidden=(k!==lang); }); }
  return {st:st, PFX:PFX, box:box, anchor:anchor, show:show, init:function(){ ready=true; Object.keys(roots).forEach(initLang); paint(); }};
  }

  // language switch: show one edition of every guide, keep the reader on the same section
  // a course page keeps each video as inert text until the reader gets near it: mounting all 20 videos
  // x 2 editions at once meant ~120k elements and 120 diagrams before the first paint
  var G=[], lang0=LIST[0].langs[0];
  try{ var s0=JSON.parse(localStorage.getItem('ytguide-'+LIST[0].id)||'{}'); if(LIST[0].langs.indexOf(s0.lang)>-1) lang0=s0.lang; }catch(e){}
  function mount(D){
    if(D.g) return D.g;
    var b=D.box&&document.getElementById(D.box), t=b&&b.querySelector('script.lazy'), above=false, y=0;
    if(t){ var r=b.getBoundingClientRect(), ph=b.querySelector('.cph'); above=r.bottom<=0; y=r.bottom; if(ph) ph.parentNode.removeChild(ph); }
    var g=D.g=guide(D); g.order=LIST.indexOf(D); G.push(g); G.sort(function(a,c){return a.order-c.order});
    g.show(lang0); g.init();  // show() mounts only the edition in the current language
    if(t){ if(above) scrollBy(0,b.getBoundingClientRect().bottom-y); drawMermaid(); }  // mounted above the reader: keep the view still
    return g;
  }
  // diagrams inside a mounted template: draw the shown edition's ones if the host has not drawn them
  var MM=null;
  function drawMermaid(){ clearTimeout(drawMermaid.t); drawMermaid.t=setTimeout(function(){
    var todo=Array.prototype.filter.call(document.querySelectorAll('.cvid .wrap:not([hidden]) pre.mermaid'),function(p){return !p.querySelector('svg')&&!p.getAttribute('data-processed')});
    if(!todo.length) return;
    if(window.mermaid&&window.mermaid.run){ try{ window.mermaid.run({nodes:todo}); }catch(e){} return; }
    if(MM) return;
    MM=document.createElement('script'); MM.src='https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
    MM.onload=function(){ window.mermaid.initialize({startOnLoad:false,theme:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'default'}); drawMermaid(); };
    document.head.appendChild(MM);
  },900); }
  function owner(id){ var o=null; LIST.forEach(function(x){ if(x.box&&(id===x.box||id.indexOf(x.vp)===0)) o=x; }); return o; }
  function setLang(lang,keep){
    var hit=null;
    // the guide being read: on a course page the one whose box spans the top of the view, else the last with a heading above the fold
    if(keep) G.forEach(function(g){
      if(g.box.getBoundingClientRect){ var r=g.box.getBoundingClientRect(); if(r.top<160&&r.bottom>160) hit={g:g,id:g.anchor()}; }
      else { var a=g.anchor(); if(a) hit={g:g,id:a}; }
    });
    lang0=lang; G.forEach(function(g){ g.show(lang); });
    each(document.querySelectorAll('[data-course-lang]'),function(el){ el.hidden=el.dataset.courseLang!==lang; });
    if(MM||document.querySelector('.cvid')) drawMermaid();
    var w=document.querySelector('.wrap[data-lang="'+lang+'"], .wrap[data-course-lang="'+lang+'"]');
    document.documentElement.lang=lang; if(w) document.documentElement.dir=w.getAttribute('dir');
    each(document.querySelectorAll('.langsw button'),function(b){b.setAttribute('aria-pressed',String(b.dataset.l===lang))});
    dispatchEvent(new Event('resize'));
    if(hit){ var t=hit.id&&document.getElementById(hit.g.PFX[lang]+hit.id); t=t||(hit.g.box.scrollIntoView?hit.g.box:null); if(t) t.scrollIntoView({block:'start',behavior:'instant'}); }
    else if(keep) scrollTo({top:0,behavior:'instant'});
  }
  each(document.querySelectorAll('.langsw button'),function(b){ b.addEventListener('click',function(){ if(b.dataset.l!==lang0) setLang(b.dataset.l,true); }); });

  setLang(lang0,false);
  var lazy=LIST.filter(function(D){ var b=D.box&&document.getElementById(D.box); return b&&b.querySelector('script.lazy'); });
  LIST.forEach(function(D){ if(lazy.indexOf(D)<0) mount(D); });
  if(lazy.length){
    if('IntersectionObserver' in window){
      var lio=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ lio.unobserve(e.target); mount(owner(e.target.id)); } }); },{rootMargin:'600px 0px'});
      lazy.forEach(function(D){ lio.observe(document.getElementById(D.box)); });
    } else lazy.forEach(mount);
    // a link or address into a video not mounted yet: mount it, then go there
    var jump=function(id){ var D=owner(id); if(!D||D.g) return false; mount(D); var el=document.getElementById(id); if(el) el.scrollIntoView({block:'start'}); return true; };
    document.addEventListener('click',function(e){
      var a=e.target.closest&&e.target.closest('a[href^="#"]'); if(!a) return;
      var id=a.getAttribute('href').slice(1); if(jump(id)){ e.preventDefault(); try{ history.replaceState(null,'','#'+id); }catch(x){} }
    },true);
    addEventListener('load',function(){ if(location.hash.length>1) jump(decodeURIComponent(location.hash.slice(1))); });
  }

  // reading progress + back to top
  var prog=document.getElementById('prog'), top=document.getElementById('totop');
  function onScroll(){
    var h=document.documentElement, max=h.scrollHeight-h.clientHeight;
    prog.style.transform='scaleX('+(max>0?Math.min(1,h.scrollTop/max):0)+')';
    top.classList.toggle('show',h.scrollTop>900);
  }
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  top.onclick=function(){scrollTo({top:0,behavior:RM.matches?'auto':'smooth'})};
})();
