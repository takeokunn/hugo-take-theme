'use strict';

(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
    // Mobile menu - WAI-ARIA APG disclosure navigation pattern.
    // Without JS the nav list stays visible (CSS keys off html.js),
    // so this is pure progressive enhancement.
    // ---------------------------------------------------------------
    const setupMenu = () => {
        const toggle = document.querySelector('.menu-toggle');
        const menu = document.getElementById('site-menu');
        if (!toggle || !menu) return;

        const closeButton = menu.querySelector('.menu-close-button');

        const setOpen = (open, { restoreFocus = false } = {}) => {
            toggle.setAttribute('aria-expanded', String(open));
            menu.classList.toggle('open', open);
            document.body.classList.toggle('menu-is-open', open);
            if (open) {
                const firstLink = menu.querySelector('a');
                if (firstLink) firstLink.focus();
            } else if (restoreFocus) {
                toggle.focus();
            }
        };

        toggle.addEventListener('click', () => {
            setOpen(toggle.getAttribute('aria-expanded') !== 'true');
        });

        if (closeButton) {
            closeButton.addEventListener('click', () => setOpen(false, { restoreFocus: true }));
        }

        // Escape closes the menu and restores focus to the toggle
        menu.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && menu.classList.contains('open')) {
                setOpen(false, { restoreFocus: true });
            }
        });

        // Following a link closes the overlay
        menu.addEventListener('click', (event) => {
            if (event.target.closest('a')) setOpen(false);
        });

        // Reset state when resizing to desktop where the menu is always visible
        const desktop = window.matchMedia('(min-width: 769px)');
        desktop.addEventListener('change', (event) => {
            if (event.matches) setOpen(false);
        });
    };

    // ---------------------------------------------------------------
    // Table of contents: no JS needed - <details> is natively
    // accessible and animation is handled in CSS. Nothing to do here.
    // ---------------------------------------------------------------

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupGoToTop();
            setupMenu();
        });
    } else {
        setupGoToTop();
        setupMenu();
    }
})();
