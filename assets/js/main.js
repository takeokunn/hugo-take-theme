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

    const setupTagSort = () => {
        const grid = document.querySelector('[data-tag-grid]');
        if (!grid) return;

        const requested = new URLSearchParams(window.location.search).get('sort');
        const sort = ['new', 'kana'].includes(requested) ? requested : 'count';
        const cards = [...grid.querySelectorAll('[data-tag-card]')];
        if (sort === 'new') {
            cards.sort((a, b) => Date.parse(b.dataset.date) - Date.parse(a.dataset.date));
        } else if (sort === 'kana') {
            cards.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name, 'ja'));
        }
        grid.append(...cards);

        document.querySelectorAll('[data-tag-sort]').forEach((link) => {
            const active = link.dataset.tagSort === sort;
            link.classList.toggle('is-active', active);
            if (active) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    };

    // ---------------------------------------------------------------
    // Post: TOC current section and reading progress (§4.2, §5-3)
    // Every [data-toc] (sidebar panel and the <details> below 1100px; one of
    // them is not rendered) is updated together. Links keep the browser's
    // default anchor jump. Without IntersectionObserver nothing is enhanced.
    // ---------------------------------------------------------------
    const setupToc = () => {
        const article = document.querySelector('[data-post]');
        const tocs = [...document.querySelectorAll('[data-toc]')];
        if (!article || tocs.length === 0 || !('IntersectionObserver' in window)) return;

        const headings = [...article.querySelectorAll('.prose h2, .prose h3')].filter((heading) => heading.id);
        if (headings.length === 0) return;

        // The first heading carrying an id decides the link's position
        // (Hugo makes ids unique; this only keeps duplicates harmless).
        const indexById = new Map();
        headings.forEach((heading, index) => {
            if (!indexById.has(heading.id)) indexById.set(heading.id, index);
        });

        const links = [];
        tocs.forEach((toc) => {
            toc.querySelectorAll('a[href^="#"]').forEach((link) => {
                let id = link.getAttribute('href').slice(1);
                try {
                    id = decodeURIComponent(id);
                } catch (e) {
                    // Malformed escape: compare the raw fragment.
                }
                if (indexById.has(id)) links.push({ link, index: indexById.get(id) });
            });
        });

        const bars = tocs.flatMap((toc) =>
            [...toc.querySelectorAll('[data-toc-progress]')].map((bar) => ({
                bar,
                percent: bar.querySelector('[data-toc-percent]'),
            }))
        );

        // A heading is "reached" once its top is at or above this line: the
        // bottom of the fixed header, or the heading's scroll-margin-top (where
        // an anchor jump puts it), whichever is lower. The +1 absorbs sub-pixel
        // rounding so a heading reached by an anchor jump counts as current.
        const readLine = () => {
            const header = document.querySelector('.site-header');
            const fixedHeader = header && getComputedStyle(header).position === 'fixed' ? header.offsetHeight : 0;
            const margin = parseFloat(getComputedStyle(headings[0]).scrollMarginTop) || 0;
            return Math.ceil(Math.max(fixedHeader, margin)) + 1;
        };

        let currentIndex = -2; // -1 = above the first heading; -2 = not yet applied
        const updateCurrent = () => {
            const line = readLine();
            let index = -1;
            headings.forEach((heading, i) => {
                if (heading.getBoundingClientRect().top <= line) index = i;
            });
            const effective = index < 0 ? -1 : indexById.get(headings[index].id);
            if (effective === currentIndex) return;
            currentIndex = effective;
            links.forEach(({ link, index: linkIndex }) => {
                const isCurrent = linkIndex === effective;
                link.classList.toggle('is-current', isCurrent);
                link.classList.toggle('is-read', linkIndex < effective);
                if (isCurrent) {
                    link.setAttribute('aria-current', 'location');
                } else {
                    link.removeAttribute('aria-current');
                }
            });
        };

        let progress = -1;
        const updateProgress = () => {
            const top = article.getBoundingClientRect().top + window.scrollY;
            const height = article.offsetHeight;
            const range = height - window.innerHeight;
            const ratio = range > 0 ? (window.scrollY - top) / range : window.scrollY + window.innerHeight >= top + height ? 1 : 0;
            const value = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
            if (value === progress) return;
            progress = value;
            bars.forEach(({ bar, percent }) => {
                bar.setAttribute('aria-valuenow', String(value));
                bar.style.setProperty('--progress', String(value));
                if (percent) percent.textContent = String(value);
            });
        };

        // The rootMargin puts the top edge of the observed area on the read
        // line, so a heading crossing it (threshold 1 = fully visible) fires
        // the callback. Positions are re-read from every heading there, which
        // keeps fast scrolling and anchor jumps from skipping a section.
        let observer = null;
        const observe = () => {
            observer?.disconnect();
            observer = new IntersectionObserver(updateCurrent, {
                rootMargin: `-${readLine()}px 0px 0px 0px`,
                threshold: [0, 1],
            });
            headings.forEach((heading) => observer.observe(heading));
        };

        let ticking = false;
        let layoutChanged = false;
        const schedule = (relayout) => {
            layoutChanged = layoutChanged || relayout;
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                if (layoutChanged) {
                    layoutChanged = false;
                    observe();
                    updateCurrent();
                }
                updateProgress();
            });
        };

        window.addEventListener('scroll', () => schedule(false), { passive: true });
        window.addEventListener('resize', () => schedule(true), { passive: true });
        if ('ResizeObserver' in window) new ResizeObserver(() => schedule(true)).observe(article);

        observe();
        updateCurrent();
        updateProgress();
    };

    // ---------------------------------------------------------------
    // Post: copy the page URL (§5-4)
    // Each [data-copy-link] reports through the nearest [data-copy-status]
    // (an aria-live region) found by walking up from the button. The text
    // comes from data-copied-label / data-failed-label set by the template.
    // Without the Clipboard API the buttons are hidden rather than left
    // inert.
    // ---------------------------------------------------------------
    const COPY_STATUS_MS = 2000;
    // Gap between clearing and rewriting the live region so that the same
    // message is announced again.
    const COPY_REANNOUNCE_MS = 50;

    const setupCopyLink = () => {
        const buttons = document.querySelectorAll('[data-copy-link]');
        if (buttons.length === 0) return;

        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
            buttons.forEach((button) => {
                button.hidden = true;
                // Author CSS can override [hidden] on the button; the wrapper has no display rule.
                const item = button.closest('li');
                if (item) item.hidden = true;
            });
            return;
        }

        const timers = new WeakMap();

        const findStatus = (button) => {
            for (let node = button.parentElement; node; node = node.parentElement) {
                const status = node.querySelector('[data-copy-status]');
                if (status) return status;
            }
            return null;
        };

        const show = (status, text) => {
            clearTimeout(timers.get(status));
            status.textContent = '';
            if (!text) return;
            timers.set(
                status,
                setTimeout(() => {
                    status.textContent = text;
                    timers.set(
                        status,
                        setTimeout(() => {
                            status.textContent = '';
                        }, COPY_STATUS_MS)
                    );
                }, COPY_REANNOUNCE_MS)
            );
        };

        document.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-copy-link]');
            if (!button) return;
            const status = findStatus(button);
            let label;
            try {
                await navigator.clipboard.writeText(location.href);
                label = status?.dataset.copiedLabel;
            } catch (e) {
                label = status?.dataset.failedLabel;
            }
            if (status) show(status, label);
        });
    };

    const features = [setupTheme, setupGoToTop, setupMenu, setupTagSort, setupToc, setupCopyLink];

    const init = () => features.forEach((setup) => setup());

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
