/* ==========================================================
   ANEMRIA HUB - community.js  (Community Hub page)
   Everything is saved in this browser only (localStorage).
   Later this file will be connected to Firebase.
   Dark / light theme is handled by js/script.js
   ========================================================== */

const $ = id => document.getElementById(id);
const tpl = id => $(id).content.firstElementChild.cloneNode(true);
const HINT = $("dmHint");                       // kept, because the message box is cleared often
const DB_KEY = "anemria_community_v1", ME_KEY = "anemria_me";

/* ===== 1. DATA ===== */
function seedPolls(){
  const P = [
    ["Shonen","Best shonen of all time?",["One Piece","Naruto","Bleach","Dragon Ball"]],
    ["Romance","Best romance anime?",["Your Name","Toradora!","Kaguya-sama: Love Is War","Horimiya"]],
    ["Fantasy","Which fantasy world would you visit?",["Fullmetal Alchemist","Frieren","Mushoku Tensei","Made in Abyss"]],
    ["Sci-Fi","Best sci-fi anime?",["Steins;Gate","Cowboy Bebop","Psycho-Pass","Ghost in the Shell"]],
    ["Comedy","Funniest anime?",["Gintama","KonoSuba","One Punch Man","Nichijou"]],
    ["Horror","Scariest anime?",["Another","Parasyte","Higurashi","Junji Ito Collection"]],
    ["Slice of Life","Most relaxing anime?",["Barakamon","Laid-Back Camp","Mushishi","Non Non Biyori"]],
    ["Sports","Best sports anime?",["Haikyu!!","Blue Lock","Kuroko’s Basketball","Slam Dunk"]]
  ];
  return P.map((p,i)=>({id:"s"+i, type:p[0], q:p[1], opts:p[2], votes:{}, owner:null, byName:"Anemria", at:Date.now()-i*1000}));
}
const uk = n => n.trim().toLowerCase();                   // username key
function loadDB(){
  let d = null;
  try{ d = JSON.parse(localStorage.getItem(DB_KEY)); }catch(e){}
  if(!d || !d.users) d = {users:{}, polls:seedPolls(), requests:[], friends:[], chats:{}};
  /* polls made by the older version: find the owner from the saved name */
  d.polls.forEach(p=>{
    if(!("owner" in p)){
      const k = uk(p.by || "");
      p.owner = d.users[k] ? k : null;
      p.byName = p.byName || p.by || "Anemria";
    }
  });
  return d;
}
let db = loadDB();
const save = () => { try{ localStorage.setItem(DB_KEY, JSON.stringify(db)); }catch(e){} };
save();

/* Logged-in user is kept per tab (sessionStorage), so two tabs can be two different users. */
let me = sessionStorage.getItem(ME_KEY);
if(me && !db.users[me]) me = null;
let typeFilter = "All", mineOnly = false, chatWith = null, signup = false;

const nameOf = k => db.users[k] ? db.users[k].name : k;
const pairKey = (a,b) => [a,b].sort().join("|");
const isFriend = (a,b) => db.friends.includes(pairKey(a,b));
const friendsOf = k => db.friends.filter(p=>p.split("|").includes(k)).map(p=>p.split("|").find(x=>x!==k));
const sentTo = k => db.requests.some(r=>r.from===me && r.to===k);
const gotFrom = k => db.requests.some(r=>r.from===k && r.to===me);

async function hash(text){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

/* ===== 2. PICTURES (DP) ===== */
/* Crops the picture to a square and shrinks it, so it takes very little storage. */
function fileToDp(file){
  return new Promise(resolve=>{
    if(!file || !file.type.startsWith("image/") || file.size>8*1024*1024) return resolve(null);
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = ()=>{
      const S = 128, c = document.createElement("canvas"); c.width = c.height = S;
      const side = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width-side)/2, (img.height-side)/2, side, side, 0, 0, S, S);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", .82));
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
function fillAv(el, name, dp){
  el.textContent = "";
  if(dp){ const im = document.createElement("img"); im.alt = ""; im.src = dp; el.appendChild(im); }
  else el.textContent = (name || "?")[0].toUpperCase();
}
const userAv = (el, k) => fillAv(el, nameOf(k), db.users[k] && db.users[k].dp);

/* ===== 3. TABS ===== */
const TABS = ["polls","friends","messages"];
function showTab(name){
  TABS.forEach(t=>{
    $("tab-"+t).setAttribute("aria-selected", t===name);
    $("panel-"+t).hidden = t!==name;
  });
}
TABS.forEach(t=>{ $("tab-"+t).onclick = ()=>showTab(t); });

/* ===== 4. LOGIN / SIGN UP ===== */
function setMode(s){
  signup = s;
  $("goLogin").setAttribute("aria-pressed", !s);
  $("goSignup").setAttribute("aria-pressed", s);
  $("emailRow").hidden = !s;
  $("dpRow").hidden = !s;
  $("authEmail").required = s;
  $("authSubmit").textContent = s ? "Create account" : "Log in";
  $("authPass").autocomplete = s ? "new-password" : "current-password";
  $("authNote").textContent = "";
}
function openAuth(s){ $("authForm").reset(); setMode(!!s); $("authDlg").showModal(); }
function needLogin(){ if(me) return false; openAuth(false); return true; }

$("goLogin").onclick = ()=>setMode(false);
$("goSignup").onclick = ()=>setMode(true);
$("authCancel").onclick = ()=>$("authDlg").close();
$("authBtn").onclick = ()=>{
  if(me){
    me = null; chatWith = null; mineOnly = false;
    sessionStorage.removeItem(ME_KEY); renderAll();
  }else openAuth(false);
};
$("authForm").onsubmit = async e=>{
  e.preventDefault();
  const note = $("authNote"), raw = $("authUser").value.trim(), k = uk(raw), pass = $("authPass").value;
  if(!/^[a-zA-Z0-9_]{3,20}$/.test(raw)){ note.textContent = "Username: 3 to 20 letters, numbers or underscore."; return; }
  const h = await hash(k+":"+pass);
  if(signup){
    if(k==="anemria" || db.users[k]){ note.textContent = "This username is already taken."; return; }
    const dp = await fileToDp($("authDp").files[0]);
    db.users[k] = {name:raw, email:$("authEmail").value.trim(), hash:h, dp};
    save();
  }else{
    if(!db.users[k] || db.users[k].hash!==h){ note.textContent = "Wrong username or password."; return; }
  }
  me = k; sessionStorage.setItem(ME_KEY, k);
  $("authDlg").close(); renderAll(); applyPending();
};

/* ===== 5. POLLS ===== */
const ownerName = p => (p.owner && db.users[p.owner]) ? db.users[p.owner].name : (p.byName || "Anemria");

function renderPolls(){
  const list = $("pollList"); list.innerHTML = "";
  const q = $("pollSearch").value.trim().toLowerCase();
  const polls = db.polls.filter(p=>
    (typeFilter==="All" || p.type===typeFilter) &&
    (!mineOnly || (me && p.owner===me)) &&
    (!q || ownerName(p).toLowerCase().includes(q))
  );
  polls.forEach(p=>{
    const el = tpl("tplPoll");
    el.dataset.id = p.id;   // so the home page can link to this exact poll
    el.querySelector(".tag").textContent = p.type;
    el.querySelector(".q").textContent = p.q;
    el.querySelector(".by").textContent = ownerName(p)+" · "+new Date(p.at).toLocaleDateString();
    if(p.owner && db.users[p.owner]) userAv(el.querySelector(".owner .av"), p.owner);
    else fillAv(el.querySelector(".owner .av"), ownerName(p), null);

    const del = el.querySelector(".del");
    if(me && p.owner===me){
      del.hidden = false;
      del.onclick = ()=>{
        if(!confirm("Delete this poll?")) return;
        db.polls = db.polls.filter(x=>x.id!==p.id); save(); renderPolls();
      };
    }

    const counts = p.opts.map((_,i)=>Object.values(p.votes).filter(v=>v===i).length);
    const total = counts.reduce((a,b)=>a+b,0);
    p.opts.forEach((o,i)=>{
      const li = tpl("tplPollOption"), b = li.querySelector(".opt");
      const pct = total ? Math.round(counts[i]/total*100) : 0;
      b.style.setProperty("--pct", pct+"%");
      li.querySelector(".label").textContent = o;
      li.querySelector(".pct").textContent = pct+"%";
      if(me && p.votes[me]===i) b.classList.add("mine");
      b.onclick = ()=>vote(p.id, i);
      el.querySelector(".opts").appendChild(li);
    });
    el.querySelector(".total").textContent = total+(total===1?" vote":" votes");
    list.appendChild(el);
  });
  $("pollEmpty").hidden = polls.length>0;
}
function vote(id, i){
  if(needLogin()) return;
  const p = db.polls.find(x=>x.id===id); if(!p) return;
  if(p.votes[me]===i) delete p.votes[me];          // tap your vote again to take it back
  else p.votes[me] = i;
  save(); renderPolls();
}
function setChips(){
  document.querySelectorAll("#pollTypes .chip").forEach(c=>c.setAttribute("aria-pressed", c.dataset.type===typeFilter));
}
$("pollTypes").onclick = e=>{
  const b = e.target.closest(".chip"); if(!b) return;
  typeFilter = b.dataset.type; setChips(); renderPolls();
};
$("myPolls").onclick = ()=>{
  if(needLogin()) return;
  mineOnly = !mineOnly; renderPolls();
};
let pollTimer; $("pollSearch").oninput = ()=>{ clearTimeout(pollTimer); pollTimer = setTimeout(renderPolls, 150); };
$("addOption").onclick = ()=>{
  const box = $("pollOptions"), n = box.querySelectorAll("input").length;
  if(n>=5) return;
  const i = document.createElement("input");
  i.type = "text"; i.maxLength = 50; i.placeholder = "Option "+(n+1);
  box.appendChild(i); i.focus();
};
$("pollForm").onsubmit = e=>{
  e.preventDefault();
  if(needLogin()) return;
  const opts = [...$("pollOptions").querySelectorAll("input")].map(i=>i.value.trim()).filter(Boolean);
  if(opts.length<2 || new Set(opts.map(o=>o.toLowerCase())).size!==opts.length){
    alert("Add at least 2 different options."); return;
  }
  db.polls.unshift({id:"p"+Date.now(), type:$("pollType").value, q:$("pollQ").value.trim(), opts, votes:{}, owner:me, byName:nameOf(me), at:Date.now()});
  save();
  $("pollForm").reset();
  $("pollOptions").querySelectorAll("input").forEach((inp,i)=>{ if(i>1) inp.remove(); });
  $("newPollBox").open = false;
  typeFilter = "All"; mineOnly = false; $("pollSearch").value = ""; setChips(); renderPolls();
};

/* ===== 6. FRIENDS ===== */
function sendReq(k, anime){
  if(!me || !db.users[k] || k===me || isFriend(me,k) || sentTo(k) || gotFrom(k)) return;
  db.requests.push({from:me, to:k, anime:anime||""}); save(); renderAll();
}
function applyPending(){
  const raw = sessionStorage.getItem("anemria_pending");
  if(!raw || !me) return;
  sessionStorage.removeItem("anemria_pending");
  try{ const p = JSON.parse(raw); sendReq(p.to, p.anime); showTab("friends"); }catch(e){}
}
function cancelReq(k){
  db.requests = db.requests.filter(r=>!(r.from===me && r.to===k)); save(); renderAll();
}
function acceptReq(k){
  db.requests = db.requests.filter(r=>!((r.from===k&&r.to===me)||(r.from===me&&r.to===k)));
  if(!isFriend(me,k)) db.friends.push(pairKey(me,k));
  save(); renderAll();
}
function rejectReq(k){
  db.requests = db.requests.filter(r=>!(r.from===k && r.to===me)); save(); renderAll();
}

function personCard(k){
  const el = tpl("tplPerson"), b = el.querySelector(".act");
  userAv(el.querySelector(".av"), k);
  el.querySelector(".nm").textContent = nameOf(k);
  if(isFriend(me,k)){ b.textContent = "Friends"; b.classList.add("is-friend"); b.disabled = true; }
  else if(sentTo(k)){
    b.textContent = "Pending"; b.classList.add("pending"); b.title = "Click to cancel";
    b.onclick = ()=>{ if(confirm("Cancel your request to "+nameOf(k)+"?")) cancelReq(k); };
  }else if(gotFrom(k)){ b.textContent = "Accept request"; b.onclick = ()=>acceptReq(k); }
  else{ b.textContent = "Send request"; b.onclick = ()=>sendReq(k); }
  return el;
}
function renderFriends(){
  /* my profile */
  $("meCard").hidden = !me;
  if(me){
    userAv($("myAv"), me);
    $("myName").textContent = nameOf(me);
    $("dpRemove").hidden = !db.users[me].dp;
  }

  /* requests for me */
   const incomingReqs = me ? db.requests.filter(r=>r.to===me) : [];
  const incoming = incomingReqs.map(r=>r.from);
  const ul = $("incomingList"); ul.innerHTML = "";
  incomingReqs.forEach(r=>{
    const k = r.from;
    const el = tpl("tplIncoming");
    userAv(el.querySelector(".av"), k);
    el.querySelector(".nm").textContent = nameOf(k);
    el.querySelector(".why").textContent = r.anime ? "Wants to talk about " + r.anime : "Sent you a request";
    el.querySelector(".accept").onclick = ()=>acceptReq(k);
    el.querySelector(".reject").onclick = ()=>rejectReq(k);
    ul.appendChild(el);
  });
  $("inCount").textContent = incoming.length;
  $("inEmpty").hidden = incoming.length>0;
  $("reqBadge").textContent = incoming.length;
  $("reqBadge").hidden = incoming.length===0;
  /* my friends */
  const fl = $("friendsList"); fl.innerHTML = "";
  const myFriends = me ? friendsOf(me) : [];
  myFriends.forEach(k=>{
    const el = tpl("tplFriend");
    userAv(el.querySelector(".av"), k);
    el.querySelector(".nm").textContent = nameOf(k);
    el.querySelector(".chat").onclick = ()=>{ showTab("messages"); openChat(k); };
    fl.appendChild(el);
  });
  $("frCount").textContent = myFriends.length;
  $("frEmpty").hidden = myFriends.length>0;
  /* everyone else */
  const grid = $("peopleGrid"); grid.innerHTML = "";
  const others = me ? Object.keys(db.users).filter(k=>k!==me) : [];
  const q = $("peopleSearch").value.trim().toLowerCase();
  const shown = others.filter(k=>nameOf(k).toLowerCase().includes(q))
                      .sort((a,b)=>nameOf(a).localeCompare(nameOf(b)));
  shown.forEach(k=>grid.appendChild(personCard(k)));
  $("peopleCount").textContent = others.length;
  $("peopleEmpty").hidden = shown.length>0;
  $("peopleEmpty").textContent = !me ? "Log in to see the people here."
    : others.length ? "No one found with this username."
    : "No other accounts yet. Ask a friend to sign up.";
}
$("peopleSearch").oninput = renderFriends;
$("dpBtn").onclick = ()=>$("dpInput").click();
$("dpInput").onchange = async ()=>{
  const dp = await fileToDp($("dpInput").files[0]);
  $("dpInput").value = "";
  if(!me || !dp) return;
  db.users[me].dp = dp; save(); renderAll();
};
$("dpRemove").onclick = ()=>{
  if(!me) return;
  delete db.users[me].dp; save(); renderAll();
};

/* ===== 7. MESSAGES ===== */
function renderStrip(){
  const ul = $("friendStrip"); ul.innerHTML = "";
  const friends = me ? friendsOf(me) : [];
  friends.forEach(k=>{
    const el = tpl("tplStory"), b = el.querySelector(".story");
    userAv(el.querySelector(".av"), k);
    el.querySelector(".nm").textContent = nameOf(k);
    if(k===chatWith) b.classList.add("active");
    b.onclick = ()=>openChat(k);
    ul.appendChild(el);
  });
  $("stripEmpty").hidden = friends.length>0;
  $("stripEmpty").textContent = me ? "Accept a friend request to start messaging." : "Log in to message your friends.";
}
function openChat(k){ chatWith = k; renderStrip(); renderDM(); $("dmText").focus(); }
function stamp(t){
  const d = new Date(t), time = d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  return d.toDateString()===new Date().toDateString() ? time : d.toLocaleDateString([], {day:"numeric", month:"short"})+", "+time;
}
function renderDM(){
  const box = $("dmMsgs"); box.innerHTML = "";
  const ok = me && chatWith && isFriend(me, chatWith);
  if(!ok){
    chatWith = null;
    $("dmTop").hidden = true; $("dmForm").hidden = true;
    HINT.hidden = false; box.appendChild(HINT);
    return;
  }
  HINT.hidden = true;
  $("dmTop").hidden = false; $("dmForm").hidden = false;
  userAv($("dmAv"), chatWith);
  $("dmName").textContent = nameOf(chatWith);
  const msgs = db.chats[pairKey(me, chatWith)] || [];
  if(!msgs.length){
    const p = document.createElement("p"); p.className = "empty"; p.textContent = "No messages yet. Say hi!";
    box.appendChild(p);
  }
  msgs.forEach(m=>{
    const el = tpl("tplMsg");
    if(m.f===me) el.classList.add("me");
    el.querySelector(".who").textContent = m.f===me ? "Me" : nameOf(m.f);
    el.querySelector(".txt").textContent = m.t;
    el.querySelector(".time").textContent = stamp(m.at);
    box.appendChild(el);
  });
  box.scrollTop = box.scrollHeight;
}
$("dmForm").onsubmit = e=>{
  e.preventDefault();
  const t = $("dmText").value.trim();
  if(!t || !me || !chatWith || !isFriend(me, chatWith)) return;
  const k = pairKey(me, chatWith), arr = db.chats[k] = db.chats[k] || [];
  arr.push({f:me, t, at:Date.now()});
  if(arr.length>200) arr.splice(0, arr.length-200);       // keeps storage small
  save(); $("dmText").value = ""; renderDM();
};
$("dmBack").onclick = ()=>{ chatWith = null; renderStrip(); renderDM(); };

/* ===== 8. SEARCH BUTTONS (click or Enter) ===== */
$("pollSearch").onkeydown = e => { if(e.key==="Enter") renderPolls(); };
$("peopleSearch").onkeydown = e => { if(e.key==="Enter") renderFriends(); };

/* ===== 9. DRAW EVERYTHING ===== */
function renderAuth(){
  $("authBtn").textContent = me ? "Log out" : "Log in";
    $("profileBox").hidden = !me;
  if(me){ userAv($("hdAv"), me); $("hdName").textContent = nameOf(me); }
  $("userBar").hidden = !me;
  if(me) $("userName").textContent = nameOf(me);
  $("myPolls").setAttribute("aria-pressed", mineOnly);
}
function renderAll(){ renderAuth(); renderPolls(); renderFriends(); renderStrip(); renderDM(); }

/* A change made in another tab (another user) shows up here live. */
window.addEventListener("storage", e=>{
  if(e.key!==DB_KEY) return;
  db = loadDB();
  if(me && !db.users[me]) me = null;
  renderAll();
});

setChips();
renderAll();
/* ===== 10. OPENED FROM HOME PAGE (#create or #poll=ID) ===== */
function handleHash(){
  const h = location.hash.slice(1);
  if(!h) return;
  if(h === "login"){ if(!me) openAuth(false); return; }
  if(h === "friends"){ showTab("friends"); return; }
  showTab("polls");

  if(h === "create"){
    const box = $("newPollBox");
    box.open = true;
    box.scrollIntoView({behavior:"smooth", block:"center"});
    $("pollQ").focus({preventScroll:true});
  }else if(h.startsWith("poll=")){
    const id = decodeURIComponent(h.slice(5));
    const card = document.querySelector('.poll[data-id="'+id+'"]');
    if(card){
      card.scrollIntoView({behavior:"smooth", block:"center"});
      card.classList.add("highlight");
      setTimeout(()=>card.classList.remove("highlight"), 2500);
    }
  }
}
$("profileBox").onclick = ()=>showTab("friends");
handleHash();
window.addEventListener("hashchange", handleHash);