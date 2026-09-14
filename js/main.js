// Always restore pages to the top on load/navigation (prevents opening mid-page or from the bottom).
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
if (!window.location.hash) window.scrollTo(0, 0);

// Lenis smooth scroll instance (shared so scroll handlers / anchors can use it).
let lenis = null;

function initSmoothScroll() {
    if (typeof Lenis === 'undefined') return;
    // Respect users who prefer reduced motion: keep native scrolling for accessibility.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
}

function forceScrollTop() {
    if (window.location.hash) return; // allow deep-links / in-page anchors to keep working
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
}

// Reset to top also when the page is restored from the back/forward cache.
window.addEventListener('pageshow', forceScrollTop);

// If this page was prerendered (Speculation Rules), re-assert top position and
// refresh Lenis measurements the moment it becomes the active, visible page.
if (document.prerendering) {
    document.addEventListener('prerenderingchange', () => {
        forceScrollTop();
        if (lenis && typeof lenis.resize === 'function') lenis.resize();
    }, { once: true });
}

document.addEventListener('DOMContentLoaded', () => {
    initSmoothScroll();
    forceScrollTop();

    // Smooth-scroll for in-page anchor links (skips placeholder "#" links and modal triggers).
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        if (link.hasAttribute('data-modal')) return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        if (lenis) {
            lenis.scrollTo(target);
        } else {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });

    const navLinksContainer = document.querySelector('.nav-links');
    if (!navLinksContainer) return;

    // Create sliding indicator bar if not already in DOM
    let indicator = navLinksContainer.querySelector('.nav-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'nav-indicator';
        navLinksContainer.appendChild(indicator);
    }

    const links = navLinksContainer.querySelectorAll('a');
    let activeLink = navLinksContainer.querySelector('a.active');
    let hoverTimeout = null;

    // Debounce utility function
    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function moveIndicator(targetElement) {
        if (!targetElement) {
            indicator.style.opacity = '0';
            return;
        }
        const containerRect = navLinksContainer.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();

        const left = elementRect.left - containerRect.left;
        const width = elementRect.width;

        indicator.style.left = `${left}px`;
        indicator.style.width = `${width}px`;
        indicator.style.opacity = '1';
    }

    // Initialize indicator position on page load
    if (activeLink) {
        setTimeout(() => moveIndicator(activeLink), 50);
    }

    // Add debounced mouse event listeners to links
    links.forEach(link => {
        link.addEventListener('mouseenter', (e) => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            moveIndicator(e.currentTarget);
        });

        link.addEventListener('mouseleave', () => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            hoverTimeout = setTimeout(() => {
                const isStillHovered = navLinksContainer.querySelector('a:hover');
                if (isStillHovered) return;
                if (activeLink) {
                    moveIndicator(activeLink);
                } else {
                    indicator.style.opacity = '0';
                }
            }, 80); // 80ms delay to smooth out fast mouse movements between items
        });
    });

    // Debounce window resize calculation
    const handleResize = debounce(() => {
        const hovered = navLinksContainer.querySelector('a:hover');
        if (hovered) {
            moveIndicator(hovered);
        } else if (activeLink) {
            moveIndicator(activeLink);
        }
    }, 100);

    window.addEventListener('resize', handleResize);

    // Mobile Hamburger Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinksContainer.classList.toggle('nav-active');
            hamburger.classList.toggle('toggle');
        });
        
        // Close menu when clicking a link
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinksContainer.classList.remove('nav-active');
                hamburger.classList.remove('toggle');
            });
        });
    }

    // Product Category Filtering Logic
    const filterButtons = document.querySelectorAll('.product-filter-bar .filter-btn');
    const productCards = document.querySelectorAll('.products-grid .product-card');

    if (filterButtons.length > 0 && productCards.length > 0) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state on buttons
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filterValue = btn.getAttribute('data-filter');

                productCards.forEach(card => {
                    const cardCategory = card.getAttribute('data-category');
                    if (filterValue === 'all' || cardCategory === filterValue) {
                        card.style.display = 'flex';
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 50);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(15px)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 250);
                    }
                });
            });
        });
    }

    // Product Image Lightbox Zoom Modal
    const productImages = document.querySelectorAll('.product-img-wrapper');
    if (productImages.length > 0) {
        // Create modal container if not exists
        let modal = document.querySelector('.product-lightbox-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'product-lightbox-modal';
            modal.innerHTML = `
                <div class="lightbox-overlay"></div>
                <div class="lightbox-content">
                    <button class="lightbox-close" aria-label="Close">&times;</button>
                    <div class="lightbox-img-container">
                        <img src="" alt="" class="lightbox-img">
                    </div>
                    <div class="lightbox-caption">
                        <h4 class="lightbox-title"></h4>
                    </div>
                    <div class="lightbox-hint">Click image to toggle 2x zoom</div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const modalImg = modal.querySelector('.lightbox-img');
        const modalTitle = modal.querySelector('.lightbox-title');
        const closeBtn = modal.querySelector('.lightbox-close');
        const overlay = modal.querySelector('.lightbox-overlay');
        const imgContainer = modal.querySelector('.lightbox-img-container');

        let isZoomed = false;

        function openModal(imgSrc, titleText) {
            modalImg.src = imgSrc;
            modalTitle.textContent = titleText;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            isZoomed = false;
            modalImg.classList.remove('zoomed-in');
        }

        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            isZoomed = false;
            modalImg.classList.remove('zoomed-in');
        }

        productImages.forEach(wrapper => {
            wrapper.addEventListener('click', () => {
                const img = wrapper.querySelector('.product-img');
                const card = wrapper.closest('.product-card');
                const title = card ? card.querySelector('.product-name').textContent : '';
                if (img) {
                    openModal(img.src, title);
                }
            });
        });

        // Toggle 2x Zoom on image click inside modal
        imgContainer.addEventListener('click', () => {
            isZoomed = !isZoomed;
            if (isZoomed) {
                modalImg.classList.add('zoomed-in');
            } else {
                modalImg.classList.remove('zoomed-in');
            }
        });

        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    // Product Description Read More / Read Less Toggle
    const descriptions = document.querySelectorAll('.product-desc');
    descriptions.forEach(desc => {
        // Check if text length or scroll height exceeds 3 lines
        if (desc.scrollHeight > 72 || desc.textContent.trim().length > 140) {
            const btn = document.createElement('button');
            btn.className = 'read-more-btn';
            btn.setAttribute('type', 'button');
            btn.innerHTML = 'Read More &#10095;';
            
            desc.after(btn);

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isExpanded = desc.classList.toggle('expanded');
                btn.innerHTML = isExpanded ? 'Read Less &#10094;' : 'Read More &#10095;';
            });
        }
    });

    // Featured Products Carousel Script
    const carouselTrack = document.querySelector('.carousel-track');
    const prevBtn = document.querySelector('.carousel-nav-btn.prev-btn');
    const nextBtn = document.querySelector('.carousel-nav-btn.next-btn');

    if (carouselTrack && prevBtn && nextBtn) {
        let currentIndex = 0;

        function getVisibleCardsCount() {
            if (window.innerWidth <= 640) return 1;
            if (window.innerWidth <= 1024) return 2;
            return 3;
        }

        function updateCarousel() {
            const cards = carouselTrack.querySelectorAll('.carousel-card');
            if (cards.length === 0) return;
            const totalCards = cards.length;
            const visibleCards = getVisibleCardsCount();
            const maxIndex = totalCards - visibleCards;

            if (currentIndex < 0) currentIndex = 0;
            if (currentIndex > maxIndex) currentIndex = maxIndex;

            const cardWidth = cards[0].offsetWidth + 30; // Card width + gap
            carouselTrack.style.transform = `translateX(-${currentIndex * cardWidth}px)`;
        }

        nextBtn.addEventListener('click', () => {
            const visibleCards = getVisibleCardsCount();
            const totalCards = carouselTrack.querySelectorAll('.carousel-card').length;
            if (currentIndex < totalCards - visibleCards) {
                currentIndex++;
            } else {
                currentIndex = 0; // Loop back to start
            }
            updateCarousel();
        });

        prevBtn.addEventListener('click', () => {
            const visibleCards = getVisibleCardsCount();
            const totalCards = carouselTrack.querySelectorAll('.carousel-card').length;
            if (currentIndex > 0) {
                currentIndex--;
            } else {
                currentIndex = totalCards - visibleCards;
            }
            updateCarousel();
        });

        window.addEventListener('resize', debounce(() => {
            updateCarousel();
        }, 100));

        // Auto-play timer
        let autoPlayTimer = setInterval(() => {
            nextBtn.click();
        }, 4000);

        const carouselWrapper = document.querySelector('.product-carousel-wrapper');
        if (carouselWrapper) {
            carouselWrapper.addEventListener('mouseenter', () => clearInterval(autoPlayTimer));
            carouselWrapper.addEventListener('mouseleave', () => {
                clearInterval(autoPlayTimer);
                autoPlayTimer = setInterval(() => nextBtn.click(), 4000);
            });
        }
    }

    // Scroll Transition between Hero Section and Intro Section (Text + Background Cross-Fade)
    function initHeroScrollTransition() {
        const heroBanner = document.querySelector('.projects-hero-banner, .services-hero-banner, .markets-hero-banner');
        if (!heroBanner) return;

        const heroContent = heroBanner.querySelector('.hero-content');
        const heroBgImg = heroBanner.querySelector('.hero-bg-img');
        const introSection = document.querySelector('.projects-intro-section, .services-intro-section, .markets-intro-section');
        if (!heroContent || !introSection) return;

        const introBgImg = introSection.querySelector('.section-bg-img');
        const introElements = introSection.querySelectorAll('.cloud-title-container, .services-intro-text, .markets-intro-text');

        let ticking = false;

        function updateScrollFade() {
            const scrollY = window.scrollY || window.pageYOffset;
            const heroHeight = heroBanner.offsetHeight || 600;

            // 1. Hero Content Text Fade Out (0% -> 55% hero height scroll)
            const heroFadeDistance = heroHeight * 0.55;
            let heroProgress = scrollY / heroFadeDistance;
            if (heroProgress < 0) heroProgress = 0;
            if (heroProgress > 1) heroProgress = 1;

            const heroOpacity = 1 - heroProgress;
            const heroTranslateY = heroProgress * -30;

            heroContent.style.opacity = heroOpacity.toFixed(3);
            heroContent.style.transform = `translateY(${heroTranslateY.toFixed(1)}px)`;

            // 2. Hero Background Image Parallax & Fade Out (0% -> 80% scroll)
            if (heroBgImg) {
                const bgFadeDistance = heroHeight * 0.80;
                let bgProgress = scrollY / bgFadeDistance;
                if (bgProgress < 0) bgProgress = 0;
                if (bgProgress > 1) bgProgress = 1;

                const bgOpacity = 1 - bgProgress;
                const bgTranslateY = scrollY * 0.30; // Smooth parallax movement
                const bgScale = 1 + (scrollY / heroHeight) * 0.05; // Subtle scale depth

                heroBgImg.style.opacity = bgOpacity.toFixed(3);
                heroBgImg.style.transform = `translateY(${bgTranslateY.toFixed(1)}px) scale(${bgScale.toFixed(3)})`;
            }

            // 3. Intro Section Background Image Fade In & Parallax (10% -> 75% scroll)
            if (introBgImg) {
                const introBgStart = heroHeight * 0.10;
                const introBgEnd = heroHeight * 0.75;
                let introBgProgress = (scrollY - introBgStart) / (introBgEnd - introBgStart);
                if (introBgProgress < 0) introBgProgress = 0;
                if (introBgProgress > 1) introBgProgress = 1;

                const introBgOpacity = 0.2 + (0.8 * introBgProgress);
                const introBgTranslateY = (1 - introBgProgress) * -15;

                introBgImg.style.opacity = introBgOpacity.toFixed(3);
                introBgImg.style.transform = `translateY(${introBgTranslateY.toFixed(1)}px)`;
            }

            // 4. Intro Section Content Text Fade In (15% -> 70% hero height scroll)
            const introFadeStart = heroHeight * 0.15;
            const introFadeEnd = heroHeight * 0.70;
            
            let introProgress = (scrollY - introFadeStart) / (introFadeEnd - introFadeStart);
            if (introProgress < 0) introProgress = 0;
            if (introProgress > 1) introProgress = 1;

            const introOpacity = introProgress;
            const introTranslateY = (1 - introProgress) * 40;

            introElements.forEach(el => {
                el.style.opacity = introOpacity.toFixed(3);
                el.style.transform = `translateY(${introTranslateY.toFixed(1)}px)`;
            });

            ticking = false;
        }

        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(updateScrollFade);
                ticking = true;
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });

        // Run initially on page load
        updateScrollFade();
    }

    initHeroScrollTransition();

    // Mask Logo Scroll Animation (Homepage)
    function initMaskLogoScrollTransition() {
        const maskLogo = document.querySelector('.scroll-mask-logo');
        const whoWeAreSection = document.querySelector('#who-we-are');
        const heroBanner = document.querySelector('.home-hero-banner');

        if (!maskLogo || !whoWeAreSection || !heroBanner) return;

        let tickingMask = false;

        function updateMaskScroll() {
            const scrollY = window.scrollY || window.pageYOffset;
            const heroHeight = heroBanner.offsetHeight || window.innerHeight;
            
            // The animation happens while scrolling down the hero section
            // From 0 to 80% of hero height
            const animEnd = heroHeight * 0.80;
            
            let progress = scrollY / animEnd;
            if (progress < 0) progress = 0;
            if (progress > 1) progress = 1;

            // Smooth easing (Ease Out Cubic)
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            // Scale shrinks from very large (25x) to normal (1x)
            const maxScale = 25;
            const currentScale = maxScale - (maxScale - 1) * easeProgress;
            
            // Opacity fades in quickly during the first 10% of the animation
            const opacityProgress = Math.min(progress / 0.1, 1);
            
            maskLogo.style.transform = `scale(${currentScale.toFixed(3)})`;
            maskLogo.style.opacity = opacityProgress.toFixed(3);

            tickingMask = false;
        }

        function onMaskScroll() {
            if (!tickingMask) {
                requestAnimationFrame(updateMaskScroll);
                tickingMask = true;
            }
        }

        window.addEventListener('scroll', onMaskScroll, { passive: true });
        window.addEventListener('resize', onMaskScroll, { passive: true });
        
        updateMaskScroll(); // Initialize
    }

    initMaskLogoScrollTransition();

    // Homepage Action Buttons Pop-up Modals (History, Our Mission, Why Choose Us)
    const modalTriggers = document.querySelectorAll('[data-modal]');
    if (modalTriggers.length > 0) {
        function openInfoModal(targetModalId) {
            const targetModal = document.getElementById(targetModalId);
            if (!targetModal) return;

            targetModal.classList.add('active');
            targetModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeInfoModal(modal) {
            if (!modal) return;
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        modalTriggers.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = btn.getAttribute('data-modal');
                openInfoModal(modalId);
            });
        });

        const allInfoModals = document.querySelectorAll('.info-popup-modal');
        allInfoModals.forEach(modal => {
            const closeBtn = modal.querySelector('.info-modal-close');
            const footerCloseBtn = modal.querySelector('.modal-close-btn');
            const overlay = modal.querySelector('.info-modal-overlay');

            if (closeBtn) closeBtn.addEventListener('click', () => closeInfoModal(modal));
            if (footerCloseBtn) footerCloseBtn.addEventListener('click', () => closeInfoModal(modal));
            if (overlay) overlay.addEventListener('click', () => closeInfoModal(modal));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.info-popup-modal.active');
                if (activeModal) closeInfoModal(activeModal);
            }
        });
    }
});



