/* Anemria Hub — script.js */

/* ===== DARK / LIGHT THEME ===== */
(function () {
    var KEY = 'anemria-theme';
    var root = document.documentElement;

    function getSaved() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function apply(theme) {
        root.setAttribute('data-theme', theme);
        var btn = document.getElementById('themeToggle');
        if (btn) btn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
    }

    // Page khulte hi saved theme lagao (default: dark)
    apply(getSaved() === 'light' ? 'light' : 'dark');

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('themeToggle');
        if (!btn) return;

        apply(root.getAttribute('data-theme'));

        btn.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            apply(next);
            try { localStorage.setItem(KEY, next); } catch (e) {}
        });
    });

    // Doosre tab mein theme badle to ye tab bhi badal jaye
    window.addEventListener('storage', function (e) {
        if (e.key === KEY) apply(e.newValue === 'light' ? 'light' : 'dark');
    });
})();