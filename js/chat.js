/* ==========================================================
   ANEMRIA HUB — chat.js  (Anime Chat page)
   ========================================================== */

/* ===== 1. YOUR OWN CARDS =====
   Copy a block to add a character.
   k = section name, c = [main color, dark color], e = emoji,
   hi = first message, l = offline replies (about/power/advice/sad), fb = fallback replies */
const CHARS=[
 {id:"light",n:"Light Yagami",a:"Death Note",k:"My Characters",c:["#d62839","#2a0a10"],e:"📓",t:"A genius with a notebook and a plan.",
  hi:"Hello, I’m Light Yagami. What’s on your mind today?",
  l:{about:"I’m a top student who wants a world without crime. Some call me a hero, others call me Kira.",power:"Strength isn’t muscle. It’s thinking five moves ahead of everyone else.",advice:"Set a clear goal, plan every step, and never reveal your strategy too early.",sad:"Losing is only a pause in the game. Rest, then think harder."},
  fb:["Interesting. Tell me more.","Hmm. That’s worth examining carefully.","Go on. I’m listening."]},
 {id:"naruto",n:"Naruto Uzumaki",a:"Naruto",k:"My Characters",c:["#ff8a00","#3a1a00"],e:"🍥",t:"Never gives up. Believe it!",
  hi:"Hey! I’m Naruto Uzumaki, future Hokage! What’s up, my friend?",
  l:{about:"I’m Naruto from the Hidden Leaf Village! I used to be alone, but now I have tons of friends.",power:"Shadow clones, Rasengan, and the Nine-Tails inside me!",advice:"Don’t give up, ever! If you fall, get up again. That’s my ninja way!",sad:"I know loneliness. But you’re not alone now. I’m here, okay?"},
  fb:["Haha, that’s cool! Tell me more!","Believe it! What else is going on?"]},
 {id:"luffy",n:"Monkey D. Luffy",a:"One Piece",k:"My Characters",c:["#e63946","#2b0b10"],e:"🏴‍☠️",t:"Future Pirate King. Always hungry.",
  hi:"Shishishi! I’m Luffy, and I’m gonna be King of the Pirates! Wanna join my crew?",
  l:{about:"I’m Luffy! My body is made of rubber, and my crew is the best in the world!",power:"Gear Fifth makes me super strong! Nobody beats me when my friends are in danger.",advice:"Do what you want to do! Freedom is the most important thing on the seas.",sad:"Come on, let’s have a feast! Meat fixes everything!"},
  fb:["Shishishi! I don’t get it, but it sounds fun!","Hey, is there meat in this story?"]},
 {id:"levi",n:"Levi Ackerman",a:"Attack on Titan",k:"My Characters",c:["#4d908e","#0e1a1a"],e:"⚔️",t:"Humanity’s strongest soldier. Hates dirt.",
  hi:"I’m Levi. Make it quick. What do you want?",
  l:{about:"Captain of the Survey Corps. I fight titans and I hate filth. That’s all you need to know.",power:"Skill, speed, and training. No shortcuts.",advice:"Make a choice you won’t regret. Then clean up after yourself.",sad:"Pain is part of this world. Drink some tea, then get back up."},
  fb:["Tch. Say it clearly.","Don’t waste my time."]},
 {id:"gojo",n:"Satoru Gojo",a:"Jujutsu Kaisen",k:"My Characters",c:["#4cc9f0","#0b1d3a"],e:"🕶️",t:"Strongest sorcerer. Knows it, too.",
  hi:"Yo! I’m Satoru Gojo, the strongest. What can I do for you today?",
  l:{about:"A jujutsu teacher, and yes, the strongest. Handsome too, don’t you think?",power:"Limitless and Six Eyes. Domain Expansion: Infinite Void. Basically, I can’t lose.",advice:"Be confident! If you believe you’re the strongest, half the battle is won.",sad:"Cheer up! I’ll bring sweets. We’ll fix this together."},
  fb:["Ooh, that’s fun! Keep going!","Ha! Interesting."]}
];
CHARS.forEach(c=>c.custom=true);

/* ===== 2. SETTINGS ===== */
const TARGET=1500, PER=50, STEP=24, CACHE="anemria_anime_v1";
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pick=a=>a[Math.floor(Math.random()*a.length)];
let ANIME=[], cat="All", cur=null;
const lim={}, store={};
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};

/* ===== 3. LOAD 1500 ANIME (AniList, free, no key) ===== */
const GQL="query($p:Int,$n:Int){Page(page:$p,perPage:$n){media(type:ANIME,sort:POPULARITY_DESC,isAdult:false){id title{romaji english}coverImage{large}genres seasonYear averageScore episodes description(asHtml:false)}}}";
async function loadAnime(){
  try{const c=JSON.parse(ls.get(CACHE)||"null"); if(c&&c.length>=TARGET*0.9){ANIME=c;setStatus();renderChips();renderHome();return;}}catch(e){}
  const pages=TARGET/PER;
  for(let p=1;p<=pages;p++){
    let ok=false;
    for(let t=0;t<3&&!ok;t++){
      try{
        const r=await fetch("https://graphql.anilist.co",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({query:GQL,variables:{p,n:PER}})});
        if(r.status===429){setStatus("AniList limit reached. Waiting a minute…");await sleep(61000);continue;}
        const j=await r.json();
        j.data.Page.media.forEach(m=>ANIME.push({id:"a"+m.id,n:m.title.english||m.title.romaji,img:m.coverImage.large,k:m.genres[0]||"Other",gs:m.genres.slice(0,3).join(", "),y:m.seasonYear||"",s:m.averageScore||0,ep:m.episodes||0,d:(m.description||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,260)}));
        ok=true;
      }catch(e){await sleep(2000);}
    }
    if(!ok){setStatus("Could not load more anime. Check your internet and refresh.");break;}
    setStatus(p<pages?"Loading anime… "+ANIME.length+" / "+TARGET:null);
    if(p===1||p%10===0||p===pages){renderChips();renderHome();}
    await sleep(700);
  }
  if(ANIME.length>=TARGET*0.9) ls.set(CACHE,JSON.stringify(ANIME));
  renderChips();renderHome();
}
function setStatus(msg){
  $("status").textContent=msg||(ANIME.length+" anime + "+CHARS.length+" of your own characters");
  updateHeroStats();
}

/* Updates the hero stats pills (.hero-stats) with real numbers */
function updateHeroStats(){
  const items=document.querySelectorAll(".hero-stats li b");
  if(items[0]&&ANIME.length) items[0].textContent=(Math.floor(ANIME.length/100)*100)+"+";
  if(items[1]) items[1].textContent=CHARS.length;
}

/* ===== 4. HOME: SECTIONS + CARDS ===== */
function groups(){
  const g={"My Characters":CHARS.slice()};
  ANIME.forEach(a=>(g[a.k]=g[a.k]||[]).push(a));
  const names=Object.keys(g).filter(k=>k!=="My Characters").sort((x,y)=>g[y].length-g[x].length);
  return [["My Characters",g["My Characters"]],...names.map(k=>[k,g[k]])];
}
function renderChips(){
  const box=$("chips"); box.innerHTML="";
  ["All",...groups().map(g=>g[0])].forEach(k=>{
    const b=document.createElement("button"); b.className="chip"; b.type="button"; b.textContent=k;
    b.setAttribute("aria-pressed",k===cat); b.onclick=()=>{cat=k;renderChips();renderHome();};
    box.appendChild(b);
  });
}
function makeCard(it){
  const b=document.createElement("button"); b.className="card"; b.type="button";
  if(it.custom){
    b.style.setProperty("--a",it.c[0]); b.style.setProperty("--b",it.c[1]);
    const e=document.createElement("span"); e.className="em"; e.textContent=it.e; b.appendChild(e);
  }else{
    const im=document.createElement("img"); im.loading="lazy"; im.alt=""; im.src=it.img; b.appendChild(im);
  }
  const s=document.createElement("strong"); s.textContent=it.n; b.appendChild(s);
  const sm=document.createElement("small"); sm.textContent=it.custom?it.a:[it.y,it.s?("★ "+(it.s/10).toFixed(1)):""].filter(Boolean).join("  "); b.appendChild(sm);
  if(it.custom){const p=document.createElement("p"); p.textContent=it.t; b.appendChild(p);}
  b.onclick=()=>openChat(it);
  return b;
}
function renderHome(){
  const q=$("q").value.trim().toLowerCase(), box=$("sections"); box.innerHTML="";
  let found=0;
  groups().forEach(([k,all])=>{
    if(cat!=="All"&&cat!==k) return;
    const list=all.filter(x=>(x.n+" "+(x.a||"")+" "+(x.gs||"")+" "+k).toLowerCase().includes(q));
    if(!list.length) return;
    found+=list.length;
    const n=lim[k]||STEP, sec=document.createElement("div"); sec.className="sec";
    const h=document.createElement("h2"); h.textContent=k;
    const c=document.createElement("small"); c.textContent=list.length; h.appendChild(c);
    const g=document.createElement("div"); g.className="grid";
    list.slice(0,n).forEach(it=>g.appendChild(makeCard(it)));
    sec.append(h,g);
    if(list.length>n){
      const m=document.createElement("button"); m.className="more"; m.type="button";
      m.textContent="Show more ("+(list.length-n)+" left)";
      m.onclick=()=>{lim[k]=n+STEP*2;renderHome();};
      sec.appendChild(m);
    }
    box.appendChild(sec);
  });
  $("empty").hidden=found>0||ANIME.length===0;
}

/* ===== 5. CHAT (simple replies, no key needed) ===== */
const TOPICS=[["about",/who are|your name|about you|introduce/],["power",/strong|power|fight|battle|skill/],["advice",/advice|help|motivat|tip|goal|dream/],["sad",/sad|lonely|cry|tired|stress|alone/]];
const ANIME_TOPICS=[
  ["watch",/watch|worth|recommend|should i/],
  ["similar",/similar|like this|suggest|another/],
  ["char",/character|best|favorite|favourite/],
  ["story",/story|about|plot|synopsis|what is/]
];
function offline(it,s){
  s=s.toLowerCase();
  if(it.custom){for(const [k,re] of TOPICS) if(re.test(s)&&it.l[k]) return it.l[k]; return pick(it.fb);}
  const score=it.s?(" It has a rating of "+(it.s/10).toFixed(1)+"/10 on AniList."):"";
  const hit=ANIME_TOPICS.find(([k,re])=>re.test(s));
  const kind=hit?hit[0]:"story";
  if(kind==="watch") return "If you like "+(it.gs||"this genre")+", "+it.n+" is worth a try."+score;
  if(kind==="similar") return "Try browsing the "+(it.k||"same")+" category above. You will find many anime close to "+it.n+".";
  if(kind==="char") return "Every character in "+it.n+" has a story. Watch it and tell me who is your favorite!";
  return it.d?(it.n+": "+it.d):("I know "+it.n+" is a "+it.gs+" anime. Ask me about its story or characters!");
}
function addMsg(text,me){
  const m=document.createElement("div"); m.className="m"+(me?" me":"");
  if(!me){const a=document.createElement("div"); a.className="av";
    if(cur.custom){a.textContent=cur.e;a.style.background="linear-gradient(135deg,"+cur.c[0]+","+cur.c[1]+")";}
    else{const im=document.createElement("img");im.alt="";im.src=cur.img;a.appendChild(im);}
    m.appendChild(a);}
  const b=document.createElement("div"); b.className="bub";
  if(!me){const n=document.createElement("span"); n.textContent=cur.n; b.appendChild(n);}
  b.appendChild(document.createTextNode(text)); m.appendChild(b);
  $("msgs").appendChild(m); $("msgs").scrollTop=$("msgs").scrollHeight;
}
function openChat(it){
  cur=it; $("note").textContent="";
  const root=document.documentElement.style;
  root.setProperty("--a",it.custom?it.c[0]:"#7c5cff"); root.setProperty("--b",it.custom?it.c[1]:"#c9b8ff");
  const av=$("hAv"); av.innerHTML="";
  if(it.custom) av.textContent=it.e; else {const im=document.createElement("img");im.alt="";im.src=it.img;av.appendChild(im);}
  $("hName").textContent=it.n; $("hSub").textContent=it.custom?it.a:it.gs;
  const q=$("quick"); q.innerHTML="";
  (it.custom?["Who are you?","Give me some advice","How strong are you?","I feel sad today"]
            :["What is the story about?","Should I watch it?","Suggest something similar","Who is the best character?"]).forEach(s=>{
    const b=document.createElement("button"); b.type="button"; b.textContent=s; b.onclick=()=>send(s); q.appendChild(b);});
  $("msgs").innerHTML=""; $("chat").classList.add("open");
  document.body.style.overflow="hidden";            // lock page scroll while chat is open
  if(!store[it.id]){
    store[it.id]=[]; const hi=it.custom?it.hi:"Hi! I’m your guide for "+it.n+". Ask me anything about it.";
    store[it.id].push({t:hi}); addMsg(hi,false);
  }else store[it.id].forEach(m=>addMsg(m.t,!!m.me));
  $("txt").focus();
}
function closeChat(){
  $("chat").classList.remove("open"); cur=null;
  document.body.style.overflow="";
  document.documentElement.style.removeProperty("--a");
  document.documentElement.style.removeProperty("--b");
}
async function send(text){
  text=text.trim(); if(!text||!cur) return;
  const it=cur; $("txt").value="";
  addMsg(text,true); store[it.id].push({me:true,t:text});
  const dots=document.createElement("div"); dots.className="m";
  dots.innerHTML="<div class='bub'><span class='dots'><i></i><i></i><i></i></span></div>";
  $("msgs").appendChild(dots); $("msgs").scrollTop=$("msgs").scrollHeight;
  await sleep(600);                                  // small "typing" effect
  dots.remove();
  const reply=offline(it,text);
  store[it.id].push({t:reply});                      // reply is always saved, even if the user went back
  if(cur!==it) return;
  addMsg(reply,false);
}

/* ===== 6. EVENTS ===== */
$("form").onsubmit=e=>{e.preventDefault(); send($("txt").value);};
$("back").onclick=closeChat;

/* Escape closes the chat */
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&$("chat").classList.contains("open")) closeChat();
});

/* Search: live filter while typing, button/Enter scrolls to the results */
let tm; $("q").oninput=()=>{clearTimeout(tm); tm=setTimeout(renderHome,150);};
function doSearch(){
  renderHome();
  const t=$("browse")||$("sections");
  if(t) t.scrollIntoView({behavior:"smooth",block:"start"});
}
$("qBtn").onclick=doSearch;
$("q").onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); doSearch(); } };

/* Surprise me: opens a chat with a random character */
const surpriseBtn=$("surprise");
if(surpriseBtn) surpriseBtn.onclick=()=>openChat(pick(CHARS));

/* FAQ: only one question open at a time */
document.querySelectorAll(".faq-list details").forEach(d=>{
  d.addEventListener("toggle",()=>{
    if(d.open) document.querySelectorAll(".faq-list details").forEach(o=>{ if(o!==d) o.open=false; });
  });
});

/* ===== 7. START ===== */
renderChips(); renderHome(); setStatus("Loading anime…"); loadAnime();