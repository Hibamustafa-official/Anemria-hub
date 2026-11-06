document.addEventListener('DOMContentLoaded', function () {
  var API = 'https://graphql.anilist.co';
  var list = document.querySelector('.story-list');
  var moreBtn = document.getElementById('storyMore');
  var input = document.getElementById('searchInput');
  var searchBtn = document.getElementById('searchBtn');
  var COLORS = ['story-blue', 'story-pink', 'story-mint'];
  var page = 0, term = '', n = 3;

  var Q = 'query($id:Int,$search:String,$page:Int,$sort:[MediaSort]){Page(page:$page,perPage:9){' +
    'pageInfo{hasNextPage} media(id:$id,search:$search,type:ANIME,sort:$sort,isAdult:false){' +
    'id title{romaji english} genres seasonYear description(asHtml:false)' +
    ' studios(isMain:true){nodes{name}} characters(perPage:4,sort:ROLE){nodes{name{full}}}}}}';

  function api(vars) {
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: Q, variables: vars })
    }).then(function (r) {
      if (!r.ok) throw new Error('API ' + r.status);
      return r.json();
    }).then(function (j) {
      if (j.errors) throw new Error(j.errors[0].message);
      return j.data.Page;
    });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function makeCard(a) {
    var id = 'anime-' + a.id;
    if (document.getElementById(id)) return null;           // duplicate na ho

    var title = a.title.english || a.title.romaji;
    n++;
    var card = el('article', 'story-card api-story ' + COLORS[(n - 1) % 3]);
    card.id = id;
    card.setAttribute('data-title', title.toLowerCase());

    card.appendChild(el('span', 'story-icon'));
    card.appendChild(el('span', 'story-badge', 'Story ' + (n < 10 ? '0' + n : n)));
    card.appendChild(el('h3', '', title));

    var meta = el('ul', 'story-meta');
    if (a.genres && a.genres[0]) meta.appendChild(el('li', '', a.genres.slice(0, 2).join(' • ')));
    var st = a.studios && a.studios.nodes[0];
    if (st) meta.appendChild(el('li', '', 'Studio: ' + st.name));
    if (a.seasonYear) meta.appendChild(el('li', '', 'Year: ' + a.seasonYear));
    card.appendChild(meta);

    var text = (a.description || 'No story available yet.')
      .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
    text.split(/\n+/).filter(Boolean).slice(0, 4).forEach(function (para) {
      card.appendChild(el('p', '', para));
    });

    var chars = (a.characters && a.characters.nodes) || [];
    if (chars.length) {
      var box = el('div', 'story-chars');
      chars.forEach(function (c) { box.appendChild(el('span', '', c.name.full)); });
      card.appendChild(box);
    }
    return card;
  }

  function loadMore() {
    page++;
    moreBtn.disabled = true;
    moreBtn.textContent = 'Loading...';
    return api({ page: page, search: term || null, sort: [term ? 'SEARCH_MATCH' : 'POPULARITY_DESC'] })
      .then(function (p) {
        p.media.forEach(function (a) {
          var c = makeCard(a);
          if (c) list.appendChild(c);
        });
        moreBtn.disabled = false;
        moreBtn.textContent = 'Load More Stories';
        moreBtn.style.display = p.pageInfo.hasNextPage ? '' : 'none';
        if (!p.media.length && term) moreBtn.style.display = 'none';
      })
      .catch(function () {
        page--;
        moreBtn.disabled = false;
        moreBtn.textContent = 'Retry';
      });
  }

  /* ---------- Search ---------- */
  function runSearch() {
    term = input.value.trim();
    page = 0; n = 3;
    Array.prototype.forEach.call(list.querySelectorAll('.api-story'), function (c) { c.remove(); });
    // 3 purani stories: sirf title match wali dikhao
    Array.prototype.forEach.call(list.querySelectorAll('.story-card:not(.api-story)'), function (c) {
      var t = c.querySelector('h3').textContent.toLowerCase();
      c.style.display = (!term || t.indexOf(term.toLowerCase()) !== -1) ? '' : 'none';
    });
    loadMore();
    document.getElementById('stories').scrollIntoView({ behavior: 'smooth' });
  }
  searchBtn.addEventListener('click', runSearch);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') runSearch(); });
  moreBtn.addEventListener('click', loadMore);

  /* ---------- #story=ID par scroll + highlight ---------- */
  function show(node) {
    setTimeout(function () {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      node.classList.add('spot');
      setTimeout(function () { node.classList.remove('spot'); }, 3000);
    }, 150);
  }

  function goHash() {
    var m = location.hash.match(/^#story=(.+)$/);
    if (!m) return;
    var id = decodeURIComponent(m[1]);
    var node = document.getElementById(id);
    if (node) return show(node);

    var num = id.match(/^anime-(\d+)$/);
    if (!num) return;
    api({ id: parseInt(num[1], 10) }).then(function (p) {
      var a = p.media[0];
      if (!a) return;
      var c = makeCard(a);
      if (!c) return;
      list.insertBefore(c, list.firstChild);
      show(c);
    }).catch(function () {});
  }
  window.addEventListener('hashchange', goHash);

  loadMore().then(goHash);
});