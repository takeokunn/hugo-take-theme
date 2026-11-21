'use strict';

// Site JavaScript. No dependencies; every feature is progressive enhancement.
// To add a feature: write a `setupX` function in the "Page features" section
// that returns early when its markup is absent, then add it to `features`.

(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ---------------------------------------------------------------
    // Theme (§2.2, §5-1)
    // The inline script in partials/meta/standard.html sets
    // <html data-theme> before first paint; this keeps the controls in
    // sync and persists the user's choice in localStorage.theme.
    // ---------------------------------------------------------------
    const THEMES = { dracula: 'Dracula', alucard: 'Alucard' };

    // data-theme is the single source of truth: the head script always sets it.
    const currentTheme = () => (document.documentElement.dataset.theme === 'alucard' ? 'alucard' : 'dracula');

    const syncThemeColor = (theme) => {
        const meta = document.querySelector('meta[name="theme-color"]');
        const color = meta && meta.getAttribute(`data-${theme}`);
        if (color) meta.setAttribute('content', color);
    };

    const syncThemeControls = (theme) => {
        syncThemeColor(theme);
        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            const template = button.dataset.labelTemplate;
            if (template) button.setAttribute('aria-label', template.replace('{name}', THEMES[theme]));
            const label = button.querySelector('[data-theme-label]');
            if (label) label.textContent = THEMES[theme];
        });
        document.querySelectorAll('[data-theme-set]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.themeSet === theme));
        });
    };

    const applyTheme = (theme) => {
        document.documentElement.dataset.theme = theme;
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            // Storage may be unavailable (private mode); the choice lasts for this page only.
        }
        syncThemeControls(theme);
    };

    const setupTheme = () => {
        syncThemeControls(currentTheme());
        document.addEventListener('click', (event) => {
            const toggle = event.target.closest('[data-theme-toggle]');
            if (toggle) {
                applyTheme(currentTheme() === 'dracula' ? 'alucard' : 'dracula');
                return;
            }
            const option = event.target.closest('[data-theme-set]');
            if (option && THEMES[option.dataset.themeSet]) applyTheme(option.dataset.themeSet);
        });
    };

    // ---------------------------------------------------------------
    // Back-to-top button
    // Visibility is driven by the `hidden` attribute so the button is
    // also removed from the accessibility tree while off-screen.
    // ---------------------------------------------------------------
    const setupGoToTop = () => {
        const button = document.getElementById('totop');
        if (!button) return;

        let ticking = false;
        const update = () => {
            ticking = false;
            button.hidden = window.scrollY <= 300;
        };
        window.addEventListener(
            'scroll',
            () => {
                if (!ticking) {
                    ticking = true;
                    requestAnimationFrame(update);
                }
            },
            { passive: true }
        );
        update();

        button.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
            });
            // Return keyboard focus to the top of the document
            const skipTarget = document.getElementById('main-content') || document.body;
            skipTarget.focus({ preventScroll: true });
        });
    };

    // ---------------------------------------------------------------
    // Mobile menu (§3.2) - full-screen overlay opened by .menu-toggle
    // (aria-expanded / aria-controls). Esc closes, Tab is trapped inside,
    // page scroll is locked, and focus returns to the toggle on close.
    // Without JS the overlay stays hidden and the nav list is visible.
    // ---------------------------------------------------------------
    const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const setupMenu = () => {
        const toggle = document.querySelector('.menu-toggle');
        const menu = document.getElementById(toggle ? toggle.getAttribute('aria-controls') : '');
        if (!toggle || !menu) return;

        const closeButton = menu.querySelector('.mobile-menu__close');
        const isOpen = () => !menu.hidden;

        const setOpen = (open, { restoreFocus = true } = {}) => {
            menu.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('menu-is-open', open);
            if (open) {
                (closeButton || menu.querySelector(FOCUSABLE))?.focus();
            } else if (restoreFocus) {
                toggle.focus();
            }
        };

        toggle.addEventListener('click', () => setOpen(!isOpen()));
        closeButton?.addEventListener('click', () => setOpen(false));

        menu.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = [...menu.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        // Following a link closes the overlay. Links that keep this page open
        // (new tab, or an in-page #anchor) return focus to the toggle; for a
        // real navigation the page is about to change, so focus is left alone.
        menu.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (!link) return;
            const staysOnPage =
                link.target === '_blank' ||
                (link.hash !== '' && link.origin === location.origin && link.pathname === location.pathname);
            setOpen(false, { restoreFocus: staysOnPage });
        });

        // The overlay only exists below 769px; reset when widening
        window.matchMedia('(min-width: 769px)').addEventListener('change', (event) => {
            if (event.matches && isOpen()) setOpen(false, { restoreFocus: false });
        });
    };

    // ---------------------------------------------------------------
    // Page features (TOC progress, copy link, tag sorting, ...) go here.
    // ---------------------------------------------------------------

    const features = [setupTheme, setupGoToTop, setupMenu];

    const init = () => features.forEach((setup) => setup());

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
