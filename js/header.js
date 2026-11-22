/* ==========================================================
   Anemria — header.js  (SHARED HEADER)
   Har page par ye 2 cheezein lagao (body ke bilkul shuru mein):
       <div id="site-header"></div>
       <script src="js/header.js"></script>
   Ye header ko page mein daal deta hai, active link khud highlight
   karta hai, aur login ke baad "Log in" ko "Log out" se replace karta hai.
   ========================================================== */
(function () {
    'use strict';

    /* ---- SIRF YE EK LINE CHECK KARNI HAI ----
       Community page login ke baad user ko localStorage mein jis naam (key)
       se save karta hai, wahi naam yahan likho.
       Kaise dekhein: browser mein F12 -> Application -> Local Storage */
    var USER_KEY = 'anemriaUser';

    var LINKS = [
        ['index.html',      'Home'],
        ['anime-list.html', 'Explorer &amp; Story'],
        ['watch.html',      'Watch &amp; Stream'],
        ['anime-chat.html', 'Anime Chat'],
        ['community.html',  'Community Hub']
    ];

    function currentPage() {
        var p = location.pathname.split('/').pop();
        return p || 'index.html';
    }

    function buildHeader() {
        var cur = currentPage();
        var items = LINKS.map(function (l) {
            var on = (l[0] === cur);
            return '<li><a href="' + l[0] + '"' + (on ? ' class="active" aria-current="page"' : '') + '>' + l[1] + '</a></li>';
        }).join('');

        return '' +
        '<header class="site-header">' +
            '<div class="logo-container">' +
                '<h1>Anemria</h1>' +
                '<p>Your Ultimate Anime Universe Hub</p>' +
            '</div>' +
            '<nav aria-label="Main navigation"><ul>' + items + '</ul></nav>' +
            '<div class="header-actions">' +
                '<a href="community.html#friends" class="profile-chip" id="profileBox" hidden>' +
                    '<span class="pc-av" id="hdAv"></span><span class="pc-name" id="hdName"></span>' +
                '</a>' +
                '<button type="button" class="auth-btn" id="authBtn">Log in</button>' +
                '<button type="button" class="theme-toggle" id="themeToggle" role="switch" aria-checked="true" aria-label="Toggle dark and light mode" title="Dark / Light mode">' +
                    '<svg class="icon-moon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>' +
                    '<span class="toggle-knob"></span>' +
                    '<svg class="icon-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' +
                '</button>' +
            '</div>' +
        '</header>';
    }

    /* ---------- Header page mein daalo ---------- */
    var holder = document.getElementById('site-header');
    if (!holder) {
        holder = document.createElement('div');
        holder.id = 'site-header';
        document.body.insertBefore(holder, document.body.firstChild);
    }
    holder.outerHTML = buildHeader();

    /* ---------- Login state ---------- */
    function getUser() {
        try {
            var raw = localStorage.getItem(USER_KEY);
            if (!raw) return null;
            try {
                var u = JSON.parse(raw);
                if (u && typeof u === 'object') return u;
                return { name: String(u) };
            } catch (e) {
                return { name: raw };
            }
        } catch (e) {
            return null;
        }
    }

    function updateAuth() {
        var btn  = document.getElementById('authBtn');
        var chip = document.getElementById('profileBox');
        var av   = document.getElementById('hdAv');
        var nm   = document.getElementById('hdName');
        if (!btn || !chip) return;

        var u = getUser();

        if (u) {
            var name = u.name || u.username || u.userName || u.displayName || 'Profile';
            var pic  = u.avatar || u.photo || u.image || '';

            btn.textContent = 'Log out';
            btn.classList.add('is-logout');

            chip.hidden = false;
            nm.textContent = name;
            av.textContent = '';
            if (pic) {
                var img = document.createElement('img');
                img.src = pic;
                img.alt = '';
                av.appendChild(img);
            } else {
                av.textContent = String(name).charAt(0).toUpperCase();
            }
        } else {
            btn.textContent = 'Log in';
            btn.classList.remove('is-logout');
            chip.hidden = true;
            nm.textContent = '';
            av.textContent = '';
        }
    }

    document.getElementById('authBtn').addEventListener('click', function () {
        if (getUser()) {
            /* Log out */
            try { localStorage.removeItem(USER_KEY); } catch (e) {}
            updateAuth();
            window.dispatchEvent(new Event('anemria-auth'));
            if (currentPage() === 'community.html') location.reload();
        } else if (typeof window.openLogin === 'function') {
            /* community page ka apna login popup (agar function ka naam openLogin ho) */
            window.openLogin();
        } else {
            /* warna community page par bhej do */
            location.href = 'community.html#login';
        }
    });

    /* dusre tab/page mein login-logout ho to yahan bhi update ho */
    window.addEventListener('storage', function (e) {
        if (e.key === USER_KEY || e.key === null) updateAuth();
    });
    window.addEventListener('anemria-auth', updateAuth);

    /* community ka login code login hone ke baad ye chala sakta hai: window.updateHeaderAuth() */
    window.updateHeaderAuth = updateAuth;

    updateAuth();
})();