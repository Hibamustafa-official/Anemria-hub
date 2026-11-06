/* ==========================================================
   Anemria Hub — index.js
   Contains: Analytics charts, Smart Search (AniList API), Browse All,
   Real Voices, Category click, Subtitle buttons, Polls, Create Poll,
   Ryuk Chatbot, Join / Send Request buttons.
   The theme toggle lives in script.js (not here).
   ========================================================== */

document.addEventListener('DOMContentLoaded', function () {

    var API_URL = 'https://graphql.anilist.co';

    /* ---------- Small helper functions ---------- */
    function $(sel, parent) { return (parent || document).querySelector(sel); }
    function $$(sel, parent) { return Array.prototype.slice.call((parent || document).querySelectorAll(sel)); }

    // Create a new element (textContent is used, so it is safe)
    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function initials(name) {
        return name.split(' ').map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
    }

    function saveLocal(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
    function loadLocal(key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    }

    /* ==========================================================
       ANALYTICS  (feeds Category Popularity + Monthly Viewers)
       ========================================================== */
    var STATS_KEY = 'anemria-analytics';
    var USE_DEMO_SEED = true;   // set to false to start every chart from zero

    var CATEGORIES = [
        { id: 'psych',   name: 'Psychological Thriller', fill: '',      seed: 92 },
        { id: 'fantasy', name: 'Dark Fantasy & Action',  fill: 'blue',  seed: 85 },
        { id: 'slice',   name: 'Slice of Life',          fill: 'green', seed: 70 },
        { id: 'scifi',   name: 'Sci-Fi & Mecha',         fill: 'pink',  seed: 60 }
    ];

    var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var MONTH_SEEDS = [40, 65, 55, 85, 0];   // oldest -> current month

    // AniList genre -> our category id
    var GENRE_TO_CAT = {
        'Psychological': 'psych', 'Thriller': 'psych', 'Horror': 'psych', 'Mystery': 'psych',
        'Fantasy': 'fantasy', 'Action': 'fantasy', 'Supernatural': 'fantasy',
        'Slice of Life': 'slice', 'Drama': 'slice', 'Romance': 'slice', 'Comedy': 'slice',
        'Sci-Fi': 'scifi', 'Mecha': 'scifi'
    };

    function categoryFromGenres(genres) {
        for (var i = 0; i < (genres || []).length; i++) {
            if (GENRE_TO_CAT[genres[i]]) return GENRE_TO_CAT[genres[i]];
        }
        return null;
    }

    function monthKey(date) { return date.getFullYear() + '-' + (date.getMonth() + 1); }

    function formatCount(n) {
        return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n);
    }

    function loadStats() {
        return loadLocal(STATS_KEY) || { categories: {}, months: {} };
    }

    // Call this on every user action. categoryId can be null (only the month counts).
    function track(categoryId) {
        var stats = loadStats();
        if (categoryId) stats.categories[categoryId] = (stats.categories[categoryId] || 0) + 1;
        var key = monthKey(new Date());
        stats.months[key] = (stats.months[key] || 0) + 1;
        saveLocal(STATS_KEY, stats);
        renderCharts();
    }

    function renderCharts() {
        var stats = loadStats();

        /* ----- Category Popularity (bars) ----- */
        var barCard = $('.bar-chart');
        if (barCard) {
            var counts = CATEGORIES.map(function (c) {
                return (stats.categories[c.id] || 0) + (USE_DEMO_SEED ? c.seed : 0);
            });
            var maxCount = Math.max.apply(null, counts.concat([1]));

            $$('.bar-row', barCard).forEach(function (row) { row.remove(); });

            CATEGORIES.forEach(function (cat, i) {
                var percent = Math.round((counts[i] / maxCount) * 100);

                var row = el('div', 'bar-row');
                var label = el('div', 'bar-label');
                label.appendChild(el('span', '', cat.name));
                label.appendChild(el('b', '', percent + '%'));

                var barTrack = el('div', 'bar-track');
                var fill = el('div', 'bar-fill' + (cat.fill ? ' ' + cat.fill : ''));
                fill.style.setProperty('--value', percent);
                barTrack.appendChild(fill);

                row.appendChild(label);
                row.appendChild(barTrack);
                barCard.appendChild(row);
            });
        }

        /* ----- Monthly Viewers (columns) ----- */
        var colChart = $('.column-chart');
        if (colChart) {
            var now = new Date();
            var months = [];
            for (var i = 4; i >= 0; i--) {
                var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                var value = (stats.months[monthKey(d)] || 0) + (USE_DEMO_SEED ? MONTH_SEEDS[4 - i] : 0);
                months.push({ label: MONTH_NAMES[d.getMonth()], value: value });
            }
            var maxMonth = Math.max.apply(null, months.map(function (m) { return m.value; }).concat([1]));

            colChart.innerHTML = '';
            months.forEach(function (m) {
                var col = el('div', 'column');
                col.style.setProperty('--value', Math.max(4, Math.round((m.value / maxMonth) * 100)));
                col.setAttribute('data-label', m.label);
                col.setAttribute('data-value', formatCount(m.value));
                colChart.appendChild(col);
            });
        }
    }

    renderCharts();   // draw the charts when the page opens

    /* ---------- AniList API call ---------- */
    function anilist(query, variables) {
        return fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: query, variables: variables })
        })
        .then(function (res) {
            if (!res.ok) throw new Error('API error ' + res.status);
            return res.json();
        })
        .then(function (json) {
            if (json.errors) throw new Error(json.errors[0].message);
            return json.data;
        });
    }

    /* ==========================================================
       1) VOICE ACTORS  (Real Voices Behind the Anime)
       ========================================================== */
    var voiceGrid = $('#voices .voice-grid');   // scoped to the voices section only
    var voiceIntro = $('#voices .section-intro');
    var defaultVoiceHTML = voiceGrid ? voiceGrid.innerHTML : '';
    var defaultIntroText = voiceIntro ? voiceIntro.textContent : '';

    var VOICE_QUERY =
        'query ($id: Int) {' +
        '  Media(id: $id, type: ANIME) {' +
        '    title { romaji english }' +
        '    characters(perPage: 8, sort: [ROLE, RELEVANCE]) {' +
        '      edges {' +
        '        node { name { full } }' +
        '        voiceActors(language: JAPANESE) { name { full } image { medium } }' +
        '      }' +
        '    }' +
        '  }' +
        '}';

    function makeVoiceCard(actorName, imageUrl, characterName, animeTitle) {
        var card = el('div', 'voice-card');

        var avatar = el('div', 'voice-avatar');
        if (imageUrl) {
            var img = document.createElement('img');
            img.src = imageUrl;
            img.alt = actorName;
            img.loading = 'lazy';
            img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
            // If the image fails to load, show initials instead
            img.onerror = function () { avatar.textContent = initials(actorName); };
            avatar.appendChild(img);
        } else {
            avatar.textContent = initials(actorName);
        }
        card.appendChild(avatar);

        card.appendChild(el('h3', '', actorName));

        var p = document.createElement('p');
        p.appendChild(document.createTextNode('Voice of '));
        p.appendChild(el('strong', '', characterName));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(animeTitle + ' (Japanese)'));
        card.appendChild(p);

        return card;
    }

    function loadVoices(animeId) {
        if (!voiceGrid) return;
        voiceGrid.innerHTML = '';
        voiceGrid.appendChild(el('p', 'section-intro', 'Loading voice actors...'));

        anilist(VOICE_QUERY, { id: animeId })
            .then(function (data) {
                var media = data.Media;
                var title = media.title.english || media.title.romaji;
                var cards = [];

                media.characters.edges.forEach(function (edge) {
                    var actor = edge.voiceActors[0];
                    if (!actor) return;
                    cards.push(makeVoiceCard(actor.name.full, actor.image && actor.image.medium, edge.node.name.full, title));
                });

                voiceGrid.innerHTML = '';
                if (!cards.length) {
                    voiceGrid.appendChild(el('p', 'section-intro', 'No voice actor data found for this anime.'));
                    return;
                }
                cards.slice(0, 8).forEach(function (c) { voiceGrid.appendChild(c); });
                if (voiceIntro) voiceIntro.textContent = 'Voice actors (seiyuu) of "' + title + '"';
            })
            .catch(function () {
                voiceGrid.innerHTML = '';
                voiceGrid.appendChild(el('p', 'section-intro', 'Could not load voice actors. Check your internet and try again.'));
            });
    }

    /* ==========================================================
       2) SEARCH  (AniList API + fuzzy matching)
       ========================================================== */
    var searchInput = $('#searchInput');
    var searchBtn = $('#searchBtn');
    var heroSection = $('#home');

    // Category words -> AniList genre
    var GENRE_MAP = {
        'thriller': 'Thriller',
        'psychological': 'Psychological',
        'fantasy': 'Fantasy',
        'action': 'Action',
        'slice of life': 'Slice of Life',
        'drama': 'Drama',
        'sci-fi': 'Sci-Fi',
        'scifi': 'Sci-Fi',
        'mecha': 'Mecha'
    };

    var SEARCH_QUERY =
        'query ($search: String, $genre: String, $page: Int, $sort: [MediaSort]) {' +
        '  Page(page: $page, perPage: 24) {' +
        '    pageInfo { hasNextPage }' +
        '    media(search: $search, genre: $genre, type: ANIME, sort: $sort, isAdult: false) {' +
        '      id' +
        '      title { romaji english }' +
        '      synonyms' +
        '      coverImage { large }' +
        '      genres' +
        '      averageScore' +
        '      episodes' +
        '    }' +
        '  }' +
        '}';

    function fetchPage(vars) {
        return anilist(SEARCH_QUERY, vars).then(function (data) { return data.Page; });
    }

    // The results section (created by JS, no HTML change needed)
    var resultsSection = null;
    var resultsGrid = null;
    var resultsTitle = null;

    function ensureResultsSection() {
        if (resultsSection) return;
        resultsSection = el('section', 'section-base accent-blue');
        resultsSection.id = 'searchResults';

        var container = el('div', 'container');
        resultsTitle = el('h2', '', 'Search Results');
        container.appendChild(resultsTitle);
        resultsGrid = el('div', 'voice-grid');
        container.appendChild(resultsGrid);
        resultsSection.appendChild(container);

        heroSection.parentNode.insertBefore(resultsSection, heroSection.nextSibling);
    }

    function makeAnimeCard(anime) {
        var title = anime.title.english || anime.title.romaji;
        var card = el('div', 'voice-card');

        var avatar = el('div', 'voice-avatar');
        if (anime.coverImage && anime.coverImage.large) {
            var img = document.createElement('img');
            img.src = anime.coverImage.large;
            img.alt = title;
            img.loading = 'lazy';
            img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
            avatar.appendChild(img);
        } else {
            avatar.textContent = initials(title);
        }
        card.appendChild(avatar);

        card.appendChild(el('h3', '', title));

        var score = anime.averageScore ? anime.averageScore + '/100' : 'N/A';
        var eps = anime.episodes ? anime.episodes + ' episodes' : 'Ongoing / unknown';
        var p = document.createElement('p');
        p.appendChild(document.createTextNode(anime.genres.slice(0, 3).join(' • ')));
        p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode('Score: ' + score + ' • ' + eps));
        card.appendChild(p);

        var btn = el('button', 'btn small', 'See Voice Actors');
        btn.type = 'button';
        btn.style.marginTop = '14px';
        btn.addEventListener('click', function () {
            track(categoryFromGenres(anime.genres));   // count this click in the charts
            loadVoices(anime.id);
            var voices = $('#voices');
            if (voices) voices.scrollIntoView({ behavior: 'smooth' });
        });
        card.appendChild(btn);

        return card;
    }

    /* ---------- Fuzzy search helpers ---------- */

    // Lowercase, remove symbols, collapse extra spaces
    function normalize(s) {
        return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Levenshtein distance (number of edits between two strings)
    function distance(a, b) {
        var row = [], i, j;
        for (j = 0; j <= b.length; j++) row[j] = j;
        for (i = 1; i <= a.length; i++) {
            var prev = row[0];
            row[0] = i;
            for (j = 1; j <= b.length; j++) {
                var temp = row[j];
                row[j] = Math.min(
                    row[j] + 1,
                    row[j - 1] + 1,
                    prev + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
                );
                prev = temp;
            }
        }
        return row[b.length];
    }

    // Lower score = better match
    function matchScore(query, anime) {
        var names = [anime.title.english, anime.title.romaji].concat(anime.synonyms || []);
        var best = Infinity;
        names.forEach(function (name) {
            if (!name) return;
            var n = normalize(name);
            var d1 = distance(query, n);
            var d2 = distance(query, n.slice(0, query.length)); // compare with the start of the title
            best = Math.min(best, d1, d2);
        });
        return best;
    }

    function smartSearch(text) {
        var q = normalize(text);

        // 1) Normal search first (AniList search is already case-insensitive)
        return fetchPage({ search: q, page: 1, sort: ['SEARCH_MATCH'] }).then(function (page) {
            if (page.media.length) return page.media;

            // 2) Nothing found -> try each word and short prefixes (handles typos)
            var tries = q.split(' ').filter(function (w) { return w.length >= 3; });
            [4, 5, 6].forEach(function (n) { if (q.length > n) tries.push(q.slice(0, n)); });

            return Promise.all(tries.map(function (t) {
                return fetchPage({ search: t, page: 1, sort: ['SEARCH_MATCH'] })
                    .then(function (p) { return p.media; })
                    .catch(function () { return []; });
            })).then(function (lists) {
                var seen = {}, merged = [];
                lists.forEach(function (list) {
                    list.forEach(function (a) {
                        if (!seen[a.id]) { seen[a.id] = true; merged.push(a); }
                    });
                });
                merged.sort(function (a, b) { return matchScore(q, a) - matchScore(q, b); });
                return merged.slice(0, 24);
            });
        });
    }

    function runSearch(rawText) {
        var text = (rawText || '').trim();
        if (!text) {
            if (searchInput) searchInput.focus();
            return;
        }

        ensureResultsSection();
        resultsTitle.textContent = 'Results for "' + text + '"';
        resultsGrid.innerHTML = '';
        resultsGrid.appendChild(el('p', 'section-intro', 'Searching...'));
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        // If the text matches a category, search by genre; otherwise by title
        var genre = GENRE_MAP[text.toLowerCase()];
        var request = genre
            ? fetchPage({ genre: genre, page: 1, sort: ['POPULARITY_DESC'] }).then(function (p) { return p.media; })
            : smartSearch(text);

        request
            .then(function (list) {
                resultsGrid.innerHTML = '';
                if (!list.length) {
                    resultsGrid.appendChild(el('p', 'section-intro', 'No anime found. Try a different name.'));
                    return;
                }
                list.forEach(function (a) { resultsGrid.appendChild(makeAnimeCard(a)); });

                // Count this search: by genre if it was a category, otherwise by the top result's genres
                track(genre ? categoryFromGenres([genre]) : categoryFromGenres(list[0].genres));
            })
            .catch(function () {
                resultsGrid.innerHTML = '';
                resultsGrid.appendChild(el('p', 'section-intro', 'Search failed. Check your internet and try again.'));
            });
    }

    if (searchBtn) searchBtn.addEventListener('click', function () { runSearch(searchInput.value); });
    if (searchInput) searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') runSearch(searchInput.value);
    });

    /* ---------- Category cards: click to search that genre ---------- */
    var CATEGORY_GENRES = ['Psychological', 'Fantasy', 'Slice of Life', 'Sci-Fi'];
    $$('.category-grid li').forEach(function (li, i) {
        li.style.cursor = 'pointer';
        li.setAttribute('tabindex', '0');
        li.setAttribute('role', 'button');
        function go() {
            if (searchInput) searchInput.value = CATEGORY_GENRES[i];
            runSearch(CATEGORY_GENRES[i]);
        }
        li.addEventListener('click', go);
        li.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
        });
    });

    /* ==========================================================
       BROWSE ALL ANIME  (pagination + Load More)
       ========================================================== */
    var browseGrid = $('#browseGrid');
    var loadMoreBtn = $('#loadMoreBtn');
    var browsePage = 0;

    function loadBrowse() {
        if (!browseGrid || !loadMoreBtn) return;
        browsePage++;
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading...';

        fetchPage({ page: browsePage, sort: ['POPULARITY_DESC'] })
            .then(function (page) {
                page.media.forEach(function (a) { browseGrid.appendChild(makeAnimeCard(a)); });
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Load More';
                if (!page.pageInfo.hasNextPage) loadMoreBtn.style.display = 'none';
            })
            .catch(function () {
                browsePage--;
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Retry';
            });
    }

    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadBrowse);
    loadBrowse(); // load the first page when the site opens

    /* ==========================================================
       3) SUBTITLE LANGUAGE BUTTONS
       ========================================================== */
    var langButtons = $$('.lang-btn');
    var langNote = $('.subtitle-panel .note');
    var langNotes = {
        en: 'English subtitles selected. Official videos usually have English captions.',
        ur: 'Urdu selected. Urdu captions are only available on some videos, so check the YouTube settings.',
        hi: 'Hindi and other subtitles are available through YouTube\'s built-in caption settings on supported videos.'
    };

    langButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            langButtons.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            if (langNote) langNote.textContent = langNotes[btn.getAttribute('data-lang')] || '';
        });
    });

    /* ==========================================================
       4) POLLS  (vote + results, saved in localStorage)
/* ==========================================================
   4) HOME POLL PREVIEW (random community poll, read-only)
   Voting and creating polls happen on community.html
   ========================================================== */
var COMMUNITY_KEY = 'anemria_community_v1';   // same key as community.js
var ROTATE_MS = 8000;                          // change poll every 8 seconds

// Used only if the user has never opened the Community Hub yet
// (ids match seedPolls() in community.js, so the links still work)
var FALLBACK_POLLS = [
    { id: 's0', type: 'Shonen',  q: 'Best shonen of all time?', opts: ['One Piece', 'Naruto', 'Bleach', 'Dragon Ball'], votes: {} },
    { id: 's1', type: 'Romance', q: 'Best romance anime?', opts: ['Your Name', 'Toradora!', 'Kaguya-sama: Love Is War', 'Horimiya'], votes: {} },
    { id: 's3', type: 'Sci-Fi',  q: 'Best sci-fi anime?', opts: ['Steins;Gate', 'Cowboy Bebop', 'Psycho-Pass', 'Ghost in the Shell'], votes: {} }
];

var homePollId = null;
var homePollTimer = null;

function getCommunityPolls() {
    var db = loadLocal(COMMUNITY_KEY);
    return (db && db.polls && db.polls.length) ? db.polls : FALLBACK_POLLS;
}

function pickRandomPoll(polls) {
    // avoid showing the same poll twice in a row
    var pool = polls.filter(function (p) { return p.id !== homePollId; });
    if (!pool.length) pool = polls;
    return pool[Math.floor(Math.random() * pool.length)];
}
function renderHomePoll() {
    var card = $('#homePoll');
    if (!card) return;

    // pehle fade out, phir content badlo, phir fade in
    card.classList.add('is-fading');
    setTimeout(function () {
        drawHomePoll();
        card.classList.remove('is-fading');
    }, 300);
}

function drawHomePoll() {
    var poll = pickRandomPoll(getCommunityPolls());
    homePollId = poll.id;

    var link = 'community.html#poll=' + encodeURIComponent(poll.id);

    // votes = { username: optionIndex }
    var voters = Object.keys(poll.votes || {});
    var total = voters.length;

    $('#homePollTag').textContent = poll.type;
    $('#homePollQ').textContent = poll.q;

    var box = $('#homePollOpts');
    box.innerHTML = '';
    poll.opts.forEach(function (text, i) {
        var count = voters.filter(function (u) { return poll.votes[u] === i; }).length;
        var percent = total ? Math.round((count / total) * 100) : 0;

        var row = el('a', 'poll-option poll-link');
        row.href = link;                       // click on option -> same poll in Community Hub
        var top = el('div', 'bar-label');
        top.appendChild(el('span', '', text));
        top.appendChild(el('b', '', percent + '%'));
        var barTrack = el('div', 'bar-track');
        var fill = el('div', 'bar-fill');
        fill.style.setProperty('--value', percent);
        barTrack.appendChild(fill);
        row.appendChild(top);
        row.appendChild(barTrack);
        box.appendChild(row);
    });

    $('#homePollMeta').textContent = total + (total === 1 ? ' vote' : ' votes') + ' • Log in to vote in the Community Hub';
    $('#homePollGo').href = link;
}

function startHomePoll() {
    var card = $('#homePoll');
    if (!card) return;
    renderHomePoll();
    homePollTimer = setInterval(renderHomePoll, ROTATE_MS);

    // pause while the user hovers, so the poll doesn't change under the cursor
    card.addEventListener('mouseenter', function () { clearInterval(homePollTimer); });
    card.addEventListener('mouseleave', function () {
        clearInterval(homePollTimer);
        homePollTimer = setInterval(renderHomePoll, ROTATE_MS);
    });
}
startHomePoll();
        /* ==========================================================
       5) RANDOM CHARACTER CHAT -> redirects to anime-chat.html
       ========================================================== */
    var chatWindow = $('#chatWindow');
    var chatInput = $('#chatInput');
    var chatSend = $('#chatSend');
    var chatTitle = $('#chatTitle');

    // ids chat.js ke CHARS se match karte hain
    var CHAT_CHARS = [
        { id: 'light',  name: 'Light Yagami',     hi: 'Hello, I’m Light Yagami. What’s on your mind today?' },
        { id: 'naruto', name: 'Naruto Uzumaki',   hi: 'Hey! I’m Naruto Uzumaki, future Hokage! What’s up, my friend?' },
        { id: 'luffy',  name: 'Monkey D. Luffy',  hi: 'Shishishi! I’m Luffy, and I’m gonna be King of the Pirates! Wanna join my crew?' },
        { id: 'levi',   name: 'Levi Ackerman',    hi: 'I’m Levi. Make it quick. What do you want?' },
        { id: 'gojo',   name: 'Satoru Gojo',      hi: 'Yo! I’m Satoru Gojo, the strongest. What can I do for you today?' }
    ];

    var chatChar = CHAT_CHARS[Math.floor(Math.random() * CHAT_CHARS.length)];

    if (chatWindow && chatInput && chatSend) {
        if (chatTitle) chatTitle.textContent = 'Chat with ' + chatChar.name;
        chatWindow.appendChild(el('div', 'msg bot', chatChar.hi));

        function goToChat() {
            var text = chatInput.value.trim();
            if (!text) return;
            window.location.href = 'anime-chat.html?char=' + encodeURIComponent(chatChar.id) +
                                   '&msg=' + encodeURIComponent(text);
        }

        chatSend.addEventListener('click', goToChat);
        chatInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') goToChat();
        });
    }

    /* ==========================================================
       6) JOIN (group chat) & SEND REQUEST buttons
       ========================================================== */
    function toggleButton(btn, offText, onText, onActivate) {
        btn.addEventListener('click', function () {
            var done = btn.classList.toggle('is-done');
            btn.textContent = done ? onText : offText;
            if (done && onActivate) onActivate();   // count only when turned ON
        });
    }

    var CARD_CATS = ['psych', 'fantasy', 'slice'];   // same order as the cards in the HTML

    $$('.group-list .btn').forEach(function (btn, i) {
        toggleButton(btn, 'Join', 'Joined ✓', function () { track(CARD_CATS[i]); });
    });
     /* ---------- Real fans (users who voted in Community polls) ---------- */
    var ME_KEY = 'anemria_me', PENDING_KEY = 'anemria_pending';

    function fillAvatar(node, name, dp) {
        node.textContent = '';
        if (dp) {
            var im = document.createElement('img');
            im.src = dp; im.alt = '';
            im.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
            node.appendChild(im);
        } else {
            node.textContent = (name || '?').charAt(0).toUpperCase();
        }
    }

    function renderFans() {
        var grid = $('#fansGrid');
        if (!grid) return;
        var db = loadLocal(COMMUNITY_KEY) || { users: {}, polls: [], requests: [], friends: [] };
        var me = sessionStorage.getItem(ME_KEY);
        var seen = {}, fans = [];

        (db.polls || []).forEach(function (p) {
            Object.keys(p.votes || {}).forEach(function (u) {
                if (u === me || seen[u] || !db.users[u]) return;
                seen[u] = true;
                fans.push({ key: u, name: db.users[u].name, dp: db.users[u].dp, anime: p.opts[p.votes[u]] });
            });
        });

        grid.innerHTML = '';
        if (!fans.length) {
            grid.appendChild(el('p', 'section-intro', 'No fans yet. Vote in a Community poll to appear here.'));
            return;
        }

        fans.slice(0, 6).forEach(function (f) {
            var card = el('div', 'user-card');
            var av = el('div', 'user-avatar');
            fillAvatar(av, f.name, f.dp);
            card.appendChild(av);
            card.appendChild(el('h3', '', f.name));

            var p = document.createElement('p');
            p.appendChild(el('span', 'status online'));
            p.appendChild(document.createTextNode(' Loves ' + f.anime));
            card.appendChild(p);

            var btn = el('button', 'btn small', 'Send Request');
            btn.type = 'button';

            var pk = [me, f.key].sort().join('|');
            if (me && (db.friends || []).indexOf(pk) !== -1) {
                btn.textContent = 'Friends ✓'; btn.disabled = true;
            } else if (me && (db.requests || []).some(function (r) { return r.from === me && r.to === f.key; })) {
                btn.textContent = 'Request Sent ✓'; btn.disabled = true;
            }

            btn.addEventListener('click', function () {
                var meNow = sessionStorage.getItem(ME_KEY);
                if (!meNow) {   // not logged in -> login first, request is sent after login
                    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ to: f.key, anime: f.anime }));
                    location.href = 'community.html#login';
                    return;
                }
                var d = loadLocal(COMMUNITY_KEY);
                d.requests = d.requests || [];
                d.requests.push({ from: meNow, to: f.key, anime: f.anime });
                saveLocal(COMMUNITY_KEY, d);
                location.href = 'community.html#friends';
            });

            card.appendChild(btn);
            grid.appendChild(card);
        });
    }
    renderFans();

    /* ---------- Profile chip in header ---------- */
    (function () {
        var box = $('#profileBox'), meKey = sessionStorage.getItem(ME_KEY);
        if (!box || !meKey) return;
        var db = loadLocal(COMMUNITY_KEY), u = db && db.users && db.users[meKey];
        if (!u) return;
        fillAvatar($('#hdAv'), u.name, u.dp);
        $('#hdName').textContent = u.name;
        box.hidden = false;
    })();

    /* ==========================================================
       7) Load default voices (Death Note) from the API on page open.
          If the API fails, the original HTML cards stay in place.
       ========================================================== */
    if (voiceGrid) {
        anilist(
            'query { Media(search: "Death Note", type: ANIME) { id } }'
        ).then(function (data) {
            loadVoices(data.Media.id);
        }).catch(function () {
            voiceGrid.innerHTML = defaultVoiceHTML;
            if (voiceIntro) voiceIntro.textContent = defaultIntroText;
        });
    }
    /* ==========================================================
       STORY SPOTLIGHT (random anime -> anime-list.html#story=ID)
       ========================================================== */
    var SPOT_QUERY =
        'query ($page: Int) {' +
        '  Page(page: $page, perPage: 4) {' +
        '    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {' +
        '      id title { romaji english } coverImage { large } genres averageScore' +
        '    }' +
        '  }' +
        '}';

    function loadSpotlight() {
        var grid = $('#spotlightGrid');
        if (!grid) return;
        grid.innerHTML = '';
        grid.appendChild(el('p', 'section-intro', 'Loading...'));

        var randomPage = Math.floor(Math.random() * 100) + 1;   // top ~300 anime
        anilist(SPOT_QUERY, { page: randomPage }).then(function (data) {
            grid.innerHTML = '';
            data.Page.media.forEach(function (a) {
                var title = a.title.english || a.title.romaji;
                var card = el('div', 'voice-card spot-card');

                var av = el('div', 'voice-avatar');
                if (a.coverImage && a.coverImage.large) {
                    var img = document.createElement('img');
                    img.src = a.coverImage.large; img.alt = title; img.loading = 'lazy';
                    av.appendChild(img);
                } else {
                    av.textContent = initials(title);
                }
                card.appendChild(av);
                card.appendChild(el('h3', '', title));
                card.appendChild(el('p', '', a.genres.slice(0, 3).join(' • ') +
                    (a.averageScore ? ' • ' + a.averageScore + '/100' : '')));

                var link = el('a', 'btn small', 'Read Story');
                link.href = 'anime-list.html#story=anime-' + a.id;
                card.appendChild(link);
                var watch = el('a', 'btn small', 'Watch Trailer');
watch.href = 'watch.html#watch=anime-' + a.id;
card.appendChild(watch);

// poster par click bhi seedha watch page par le jaye
av.style.cursor = 'pointer';
av.addEventListener('click', function () {
    location.href = 'watch.html#watch=anime-' + a.id;
});
                grid.appendChild(card);
            });
        }).catch(function () {
            grid.innerHTML = '';
            grid.appendChild(el('p', 'section-intro', 'Could not load stories. Check your internet.'));
        });
    }
    var shuffleBtn = $('#spotlightShuffle');
    if (shuffleBtn) shuffleBtn.addEventListener('click', loadSpotlight);
    loadSpotlight();
});