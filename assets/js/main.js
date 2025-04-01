'use strict';

window.addEventListener('load', () => {
    // Go to top button functionality
    const gttButton = document.getElementById("totop");
    if (gttButton) {
        window.onscroll = () => {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                gttButton.style.visibility = "visible";
                gttButton.style.opacity = "1";
            } else {
                gttButton.style.visibility = "hidden";
                gttButton.style.opacity = "0";
            }
        };
    }

    // Table of Contents animation enhancement
    const tocDetails = document.querySelector('.toc');
    if (tocDetails) {
        const tocSummary = tocDetails.querySelector('summary');
        const tocContent = tocDetails.querySelector('ul');

        if (tocSummary && tocContent) {
            // Fix initial state for Safari and other browsers
            if (!tocDetails.open) {
                tocContent.style.display = 'none';
            }

            // Add animation for opening/closing
            tocDetails.addEventListener('toggle', () => {
                if (tocDetails.open) {
                    // Opening animation
                    tocContent.style.display = 'block';
                    requestAnimationFrame(() => {
                        tocSummary.style.transform = 'rotate(0deg)';
                        tocSummary.style.transition = 'transform 0.7s cubic-bezier(0.05, 0.85, 0.15, 1)';
                    });

                    // Use requestAnimationFrame for smoother animation
                    requestAnimationFrame(() => {
                        tocContent.style.maxHeight = `${tocContent.scrollHeight}px`;
                        tocContent.style.opacity = '1';
                        tocContent.style.paddingTop = '0.8rem';
                    });
                } else {
                    // Closing animation
                    requestAnimationFrame(() => {
                        tocSummary.style.transform = 'rotate(-90deg)';
                        tocSummary.style.transition = 'transform 0.7s cubic-bezier(0.05, 0.85, 0.15, 1)';
                    });
                    tocContent.style.maxHeight = '0';
                    tocContent.style.opacity = '0';
                    tocContent.style.paddingTop = '0';

                    // Hide content after animation completes
                    setTimeout(() => {
                        if (!tocDetails.open) {
                            tocContent.style.display = 'none';
                        }
                    }, 1000); // Match transition duration from CSS (1s)
                }
            });
        }
    }
});
