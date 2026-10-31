/* Anemria Hub — watch.js (Watch & Stream page) */

/* ===== DATA =====
   Format: [title, image, video, tagline]
   Baad mein API aaye to sirf setAnimeList(apiData) call karna hai. */
let animeList = [
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
].map(([title, image, video, tag]) => ({ title, image, video, tag }));

/* ===== Helpers ===== */
const $ = id => document.getElementById(id);
const grid = $("animeGrid");
const input = $("animeSearch");
const player = $("animePlayer");
const stage = $("playerSection");
const lcd = $("lcd");
const clearBtn = $("clearBtn");
let current = "";

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
}

function setStatus(msg) {
    $("videoStatus").textContent = msg;
}

function pickRandom(list, count) {
    return [...list].sort(() => Math.random() - 0.5).slice(0, count);
}

/* ===== Poster cards ===== */
function renderAnime(list) {
    grid.replaceChildren();

    list.forEach((anime, i) => {
        const card = el("article", "poster");
        card.style.setProperty("--i", i);
        card.dataset.title = anime.title;
        if (anime.title === current) card.classList.add("is-active");

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
            el("span", "badge h", "HINDI"),
            info
        );
        grid.append(card);

        // poora card clickable
        card.addEventListener("click", () => playAnime(anime));
    });

    if (!list.length) {
        grid.append(el("p", "empty", "😢 No anime found. Try another title!"));
    }

    $("resultCount").textContent = list.length === animeList.length
        ? "✨ " + list.length + " anime ready to stream"
        : "🔎 " + list.length + " found";
}

/* ===== Play ===== */
function playAnime(anime) {
    current = anime.title;
    player.pause();
    player.removeAttribute("poster");
    player.src = anime.video;
    player.load();

    $("videoTitle").textContent = anime.title;
    $("nowLabel").textContent = "NOW PLAYING 🎬";
    setStatus("Loading…");
    stage.classList.add("is-playing");

    document.querySelectorAll(".poster").forEach(p =>
        p.classList.toggle("is-active", p.dataset.title === current));

    lcd.scrollIntoView({ behavior: "smooth", block: "center" });

    player.play()
        .then(() => setStatus(""))
        .catch(() => setStatus("Press ▶ on the screen to start"));
}

/* ===== Search ===== */
function searchAnime() {
    const q = input.value.trim().toLowerCase();
    renderAnime(animeList.filter(a =>
        a.title.toLowerCase().includes(q) || (a.tag || "").toLowerCase().includes(q)));
}

function syncClear() {
    clearBtn.hidden = input.value === "";
}

$("searchBtn").addEventListener("click", searchAnime);

input.addEventListener("input", () => { searchAnime(); syncClear(); });
input.addEventListener("keydown", e => { if (e.key === "Enter") searchAnime(); });

clearBtn.addEventListener("click", () => {
    input.value = "";
    searchAnime();
    syncClear();
    input.focus();
});

$("surpriseBtn").addEventListener("click", () =>
    playAnime(animeList[Math.floor(Math.random() * animeList.length)]));

/* ===== Quick-pick chips (random, list se khud ban'te hain) ===== */
function buildChips() {
    const box = document.querySelector(".chips");
    const surprise = $("surpriseBtn");
    const emojis = ["🔥", "✨", "🌸", "⚡", "🎬", "💫", "🍥", "🗡️"];

    box.querySelectorAll(".chip[data-q]").forEach(c => c.remove());
    box.querySelectorAll(".chip.auto").forEach(c => c.remove());

    pickRandom(animeList, 5).forEach((a, i) => {
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
        name = animeList[Math.floor(Math.random() * animeList.length)].title;
    } while (name === typedLast && animeList.length > 1);
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
    const anime = animeList.find(a => a.title === typedFull);
    if (anime) playAnime(anime);
});

/* ===== API ke liye: nayi list lagane ka ek hi raasta ===== */
function setAnimeList(newList) {
    animeList = newList;      // [{title, image, video, tag}, ...]
    renderAnime(animeList);
    buildChips();
}

/* ===== Player state ===== */
player.addEventListener("play",  () => stage.classList.add("is-live"));
player.addEventListener("pause", () => stage.classList.remove("is-live"));
player.addEventListener("ended", () => stage.classList.remove("is-live"));
player.addEventListener("error", () => {
    stage.classList.remove("is-playing", "is-live");
    setStatus("This video could not be loaded. Please check its filename and path.");
});
/* TV par click = play / pause */
player.addEventListener("click", () => {
    if (player.paused) player.play();
    else player.pause();
});
/* ===== Start ===== */
renderAnime(animeList);
buildChips();
syncClear();

if (matchMedia("(prefers-reduced-motion: reduce) ").matches) {
    typedWord.textContent = nextTypedName();
} else {
    typeTick();
}