/* Anemria Hub — watch.js (Watch & Stream page) + AniList API */

const API_URL = "https://graphql.anilist.co";

/* ===== LOCAL DATA (tumhare Hindi mp4 trailers) =====
   Format: [title, image, video, tagline] */
const localList = [
["Black Clover","images/Black Clover.webp","videos/Black Clover Trailer.mp4","Magic · Adventure"],
["Bleach","images/Bleach.webp","videos/BLEACH _ Trailer in Hindi.mp4","Soul Reapers · Action"],
["Blue Lock","images/Blue Lock.webp","videos/BLUE LOCK Season 1 Recap _ HINDI DUB.mp4","Football · Rivalry"],
["Chainsaw Man","images/Chainsaw man.webp","videos/CHAINSAW MAN_ THE MOVIE - THE REZE ARC - NEW HINDI TRAILER _ Exclusively In Cinemas 26 September.mp4","Dark Fantasy · Action"],
["Demon Slayer","images/Demon Slayer.webp","videos/Demon Slayer_ Kimetsu no Yaiba Infinity Castle _ OFFICIAL HINDI TRAILER.mp4","Demons · Swordplay"],
["Dr. Stone","images/Dr Stone.webp","videos/DR. STONE (Trailer) Hindi Dub.mp4","Science · Adventure"],
["Dragon Ball","images/Dragon Ball.webp","videos/Dragon Ball Super_ SUPER HERO _ OFFICIAL HINDI TRAILER _ August 26 _ Hindi, English and Japanese.mp4","Martial Arts · Legend"],
["Hunter x Hunter","images/Hunter Hunter.webp","videos/Hunter X Hunter _Trailer_ Hindi Dub.mp4","Adventure · Mind Games"],
["Jujutsu Kaisen","images/Jujusto Kaisen.webp","videos/Jujutsu Kaisen Hindi Trailer _ Season 1 _ Part 1 _ JJK S1 _ [Fan Dub] Clanimex Productions.mp4","Curses · Action"],
["Mob Psycho 100","images/Mob psycho.webp","videos/Mob Psycho 100 _ Season 1 _ Hindi Trailer _ HD.mp4","Psychic · Comedy"],
["My Hero Academia","images/My Hero Acadmia.webp","videos/My Hero Academia - Season One - Hindi Dubbed Trailer.mp4","Superheroes · Shonen"],
["Naruto","images/Naruto.webp","videos/Naruto Shippuden __ Trailer Hindi Dubbed - OFFICIAL FULL HD.mp4","Ninja · Shonen"],
["One Piece","images/One Piece.webp","videos/ONE PIECE _ NETFLIX HINDI DUBBED TRAILER _ ANIME VERSION in हिंदी.mp4","Pirates · Adventure"],
["One Punch Man","images/One Punch Man.webp","videos/One Punch Man _ Official Hindi Trailer _ Starts 1st Jan 2023 _ Bloody tv+.mp4","Action · Comedy"],
["Seven Deadly Sins","images/Seven Deadly Sins.webp","videos/Seven Deadly Sins Hindi Dub Release Date _ Seven Deadly Sins _ Hindi Dub _ Muse IN _ Anime Times.mp4","Fantasy · Knights"],
["Solo Leveling","images/Solo Leveling.webp","videos/Solo Leveling -ReAwakening-  OFFICIAL HINDI DUB TRAILER  In Cinemas 4th Dec  Crunchyroll India - Crunchyroll India (360p, h264).mp4","Dungeons · Power-up"],
["Spy x Family","images/Spy Family.webp","videos/Spy x Family Trailer _ S1 & S2 - Hindi Dub _ JioHotstar.mp4","Comedy · Family"],
["Suzume","images/Suzume.webp","videos/SUZUME - OFFICIAL HINDI TRAILER _ COMING TO PVR ON 21ST APRIL.mp4","Fantasy · Movie"],
["Sword Art Online","images/Sword Art Online.webp","videos/Sword Art Online_ Progressive The Movie - Official Trailer _ Hindi Dubbed _ LuffyDubz.mp4","Virtual World · Action"],
["The Promised Neverland","images/The Promised Neverland.webp","videos/the promised neverland hindi dubbed trailer.mp4","Thriller · Mystery"],
["Tokyo Ghoul","images/Tokyo Goul.webp","videos/Tokyo Ghoul - Season 1 Official Trailer Hindi _ Tokyo Ghoul - Season 1 Official Trailer Hindi _.mp4","Dark · Supernatural"],
["Tokyo Revengers","images/Tokyo Revengers.webp","videos/Tokyo Revengers _ OFFICIAL TRAILER _ Hindi Dub _ Anime Nagri.mp4","Time Travel · Gangs"],
["Vinland Saga","images/Viland Saga.webp","videos/VINLAND SAGA (Trailer) Hindi Dub.mp4","Vikings · Epic"],
["Weathering with You","images/Weathering with you.webp","videos/Weathering with you Trailer (Hindi Dubbed).mp4","Romance · Movie"],
["Your Name","images/Your Name.webp","videos/Your Name _ Official Hindi Trailer _ Bloody tv+.mp4","Romance · Movie"]
].map(([title, image, video, tag]) => ({
    key: title, title, image, video, trailerId: null, tag, badge: "HINDI"
}));

/* API se aaye hue anime (Load More + #watch=ID) */
let extra = [];
/* API search ke results */
let apiResults = [];

/* ===== Helpers ===== */
const $ = id => document.getElementById(id);
const grid = $("animeGrid");
const input = $("animeSearch");
const player = $("animePlayer");
const stage = $("playerSection");
const lcd = $("lcd");
const screen = document.querySelector(".lcd-screen");
const clearBtn = $("clearBtn");
const loadWrap = $("loadWrap");
const loadMoreBtn = $("loadMoreBtn");

let current = "";
let searching = false;

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
}

/* status line: optional links ke saath */
function setStatus(msg, links) {
    const s = $("videoStatus");
    s.textContent = msg;
    (links || []).forEach(([label, url]) => {
        s.append(" ");
        const a = el("a", "", label);
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.style.textDecoration = "underline";
        s.append(a);
    });
}

function pickRandom(list, count) {
    return [...list].sort(() => Math.random() - 0.5).slice(0, count);
}

/* ==========================================================
   AniList API
   ========================================================== */
const WATCH_QUERY = `
query ($id: Int, $search: String, $page: Int, $sort: [MediaSort]) {
  Page(page: $page, perPage: 24) {
    pageInfo { hasNextPage }
    media(id: $id, search: $search, type: ANIME, sort: $sort, isAdult: false) {
      id
      title { romaji english }
      coverImage { large extraLarge }
      genres
      trailer { id site }
    }
  }
}`;

function api(vars) {
    return fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ query: WATCH_QUERY, variables: vars })
    })
    .then(r => {
        if (!r.ok) throw new Error("API " + r.status);
        return r.json();
    })
    .then(j => {
        if (j.errors) throw new Error(j.errors[0].message);
        return j.data.Page;
    });
}

/* API ka anime -> hamare card ka format */
function fromApi(a) {
    const title = a.title.english || a.title.romaji;
    const hasYt = a.trailer && a.trailer.site === "youtube" && a.trailer.id;
    return {
        key: "anime-" + a.id,
        title,
        image: (a.coverImage && (a.coverImage.extraLarge || a.coverImage.large)) || "",
        video: null,
        trailerId: hasYt ? a.trailer.id : null,
        tag: (a.genres || []).slice(0, 2).join(" · "),
        badge: hasYt ? "TRAILER" : "NO TRAILER"
    };
}

function sameTitle(a, b, loose) {
    const x = a.title.toLowerCase(), y = b.title.toLowerCase();
    return x === y || (loose && (y.startsWith(x) || x.startsWith(y)));
}

/* ===== Poster cards ===== */
function renderAnime(list) {
    grid.replaceChildren();

    list.forEach((anime, i) => {
        const card = el("article", "poster");
        card.style.setProperty("--i", i);
        card.dataset.key = anime.key;
        if (anime.key === current) card.classList.add("is-active");

        const btn = el("button", "poster-btn");
        btn.type = "button";
        btn.setAttribute("aria-label", "Play " + anime.title);

        const img = document.createElement("img");
        img.src = anime.image;
        img.alt = anime.title + " poster";
        img.loading = "lazy";
        img.onerror = () => {
            img.onerror = null;
            img.removeAttribute("src");
            btn.prepend(el("span", "thumb-missing", "Poster unavailable"));
        };

        btn.append(img, el("span", "play-ico", "▶"));

        const info = el("div", "poster-info");
        info.append(
            el("h3", "", anime.title),
            el("p", "", anime.tag || ""),
            el("span", "cta go", "▶ Watch now"),
            el("span", "cta live", "● Now playing")
        );

        card.append(
            btn,
            el("span", "badge n", String(i + 1).padStart(2, "0")),
            el("span", "badge h", anime.badge || "HINDI"),
            info
        );
        grid.append(card);

        card.addEventListener("click", () => playAnime(anime));
    });

    if (!list.length) {
        grid.append(el("p", "empty", searching
            ? "🔎 Searching…"
            : "😢 No anime found. Try another title!"));
    }
}

/* Jo bhi search box mein ho, uske hisaab se grid banao */
function render() {
    const q = input.value.trim().toLowerCase();
    let list;

    if (!q) {
        list = localList.concat(extra);
        loadWrap.hidden = !moreNext;
    } else {
        const local = localList.filter(a =>
            a.title.toLowerCase().includes(q) || (a.tag || "").toLowerCase().includes(q));
        const online = apiResults.filter(a => !local.some(l => sameTitle(l, a)));
        list = local.concat(online);
        loadWrap.hidden = true;
    }
    renderAnime(list);
}

/* ===== Player ===== */
function removeYoutube() {
    const f = screen.querySelector("iframe.yt-frame");
    if (f) f.remove();
}

function playAnime(anime) {
    current = anime.key;
    player.pause();
    removeYoutube();
    setStatus("");

    $("videoTitle").textContent = anime.title;

    document.querySelectorAll(".poster").forEach(p =>
        p.classList.toggle("is-active", p.dataset.key === current));

    if (anime.video) {
        /* 1) local Hindi mp4 */
        player.hidden = false;
        player.removeAttribute("poster");
        player.src = anime.video;
        player.load();
        $("nowLabel").textContent = "NOW PLAYING 🎬";
        setStatus("Loading…");
        stage.classList.add("is-playing");
        lcd.scrollIntoView({ behavior: "smooth", block: "center" });
        player.play()
            .then(() => setStatus(""))
            .catch(() => setStatus("Press ▶ on the screen to start"));

    } else if (anime.trailerId) {
        /* 2) API wala anime: official YouTube trailer */
        player.hidden = true;
        const f = document.createElement("iframe");
        f.className = "yt-frame";
        f.src = "https://www.youtube.com/embed/" + anime.trailerId + "?autoplay=1&rel=0";
        f.title = anime.title + " trailer";
        f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        f.allowFullscreen = true;
        screen.append(f);
        $("nowLabel").textContent = "OFFICIAL TRAILER 🎬";
        stage.classList.add("is-playing");
        lcd.scrollIntoView({ behavior: "smooth", block: "center" });

    } else {
        /* 3) trailer hai hi nahi */
        stage.classList.remove("is-playing", "is-live");
        $("nowLabel").textContent = "NO TRAILER FOUND 😢";
        const q = encodeURIComponent(anime.title);
        setStatus("Trailer not available here. Watch on an official platform:", [
            ["YouTube", "https://www.youtube.com/results?search_query=" + q + "+official+trailer"],
            ["Crunchyroll", "https://www.crunchyroll.com/search?q=" + q]
        ]);
        lcd.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

/* ===== Search (local turant + API thori der baad) ===== */
let debounceId = null;
let searchToken = 0;

function runApiSearch() {
    const q = input.value.trim();
    clearTimeout(debounceId);

    if (q.length < 2) {
        searching = false;
        apiResults = [];
        render();
        return;
    }

    const token = ++searchToken;
    searching = true;
    render();

    api({ search: q, page: 1, sort: ["SEARCH_MATCH"] })
        .then(p => {
            if (token !== searchToken) return;      // purana jawab ignore
            apiResults = p.media.map(fromApi);
            searching = false;
            render();
        })
        .catch(() => {
            if (token !== searchToken) return;
            searching = false;
            render();
        });
}

function syncClear() {
    clearBtn.hidden = input.value === "";
}

$("searchBtn").addEventListener("click", runApiSearch);

input.addEventListener("input", () => {
    syncClear();
    apiResults = [];
    searchToken++;
    searching = false;
    render();                                       // local results turant
    clearTimeout(debounceId);
    debounceId = setTimeout(runApiSearch, 500);     // API 0.5 sec ruk kar
});
input.addEventListener("keydown", e => { if (e.key === "Enter") runApiSearch(); });

clearBtn.addEventListener("click", () => {
    input.value = "";
    apiResults = [];
    searchToken++;
    searching = false;
    syncClear();
    render();
    input.focus();
});

$("surpriseBtn").addEventListener("click", () => {
    const pool = localList.concat(extra);
    playAnime(pool[Math.floor(Math.random() * pool.length)]);
});

/* ===== Load More (popular anime, sirf jin ka trailer ho) ===== */
let morePage = 0;
let moreNext = true;

function loadMore() {
    morePage++;
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Loading…";

    api({ page: morePage, sort: ["POPULARITY_DESC"] })
        .then(p => {
            p.media.map(fromApi).forEach(a => {
                const dupe = localList.concat(extra).some(x => sameTitle(x, a, true));
                if (a.trailerId && !dupe) extra.push(a);
            });
            moreNext = p.pageInfo.hasNextPage;
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = "Load More Trailers";
            render();
        })
        .catch(() => {
            morePage--;
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = "Retry";
        });
}
loadMoreBtn.addEventListener("click", loadMore);

/* ===== Quick-pick chips (local list se) ===== */
function buildChips() {
    const box = document.querySelector(".chips");
    const surprise = $("surpriseBtn");
    const emojis = ["🔥", "✨", "🌸", "⚡", "🎬", "💫", "🍥", "🗡️"];

    box.querySelectorAll(".chip[data-q]").forEach(c => c.remove());
    box.querySelectorAll(".chip.auto").forEach(c => c.remove());

    pickRandom(localList, 5).forEach((a, i) => {
        const chip = el("button", "chip auto", emojis[i % emojis.length] + " " + a.title);
        chip.type = "button";
        chip.addEventListener("click", () => playAnime(a));
        box.insertBefore(chip, surprise);
    });
}

/* ===== Hero typing text ===== */
const typedWord = $("typedWord");
let typedFull = "";
let typedLast = "";
let typedPos = 0;
let typedDeleting = false;

function nextTypedName() {
    let name;
    do {
        name = localList[Math.floor(Math.random() * localList.length)].title;
    } while (name === typedLast && localList.length > 1);
    typedLast = name;
    return name;
}

function typeTick() {
    if (!typedFull) typedFull = nextTypedName();

    typedPos += typedDeleting ? -1 : 1;
    typedWord.textContent = typedFull.slice(0, typedPos);

    let delay = typedDeleting ? 45 : 90;

    if (!typedDeleting && typedPos === typedFull.length) {
        typedDeleting = true;
        delay = 1600;
    } else if (typedDeleting && typedPos === 0) {
        typedDeleting = false;
        typedFull = nextTypedName();
        delay = 350;
    }
    setTimeout(typeTick, delay);
}

$("typedBtn").addEventListener("click", () => {
    const anime = localList.find(a => a.title === typedFull);
    if (anime) playAnime(anime);
});

/* ===== Player state (sirf local video ke liye) ===== */
player.addEventListener("play",  () => stage.classList.add("is-live"));
player.addEventListener("pause", () => stage.classList.remove("is-live"));
player.addEventListener("ended", () => stage.classList.remove("is-live"));
player.addEventListener("error", () => {
    stage.classList.remove("is-playing", "is-live");
    setStatus("This video could not be loaded. Please check its filename and path.");
});
player.addEventListener("click", () => {
    if (player.paused) player.play();
    else player.pause();
});

/* ===== Index se aaya hua link:  watch.html#watch=anime-123 ===== */
function goHash() {
    const m = location.hash.match(/^#watch=anime-(\d+)$/);
    if (!m) return;

    setStatus("Loading anime…");
    api({ id: parseInt(m[1], 10), page: 1 })
        .then(p => {
            const a = p.media[0];
            if (!a) { setStatus("Anime not found."); return; }
            const anime = fromApi(a);
            if (!localList.concat(extra).some(x => x.key === anime.key)) extra.unshift(anime);
            render();
            playAnime(anime);
        })
        .catch(() => setStatus("Could not load this anime. Check your internet and try again."));
}
window.addEventListener("hashchange", goHash);

/* ===== Start ===== */
render();
buildChips();
syncClear();

if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    typedWord.textContent = nextTypedName();
} else {
    typeTick();
}

goHash();