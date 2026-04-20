/**
 * Premium Animation Engine v1.0
 * Handles scroll reveals, magnetic interactions, and UI polish.
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveals();
    initMagneticButtons();
    // initCustomCursor(); // Removed as per user request
    initParallax();
    initPreloader();
});

/**
 * Scroll Reveal using Intersection Observer
 */
function initScrollReveals() {
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Handle staggered children if needed
                if (entry.target.classList.contains('reveal-staggered')) {
                    const children = entry.target.querySelectorAll(':scope > *');
                    children.forEach((child, index) => {
                        child.style.transitionDelay = `${index * 0.15}s`;
                        child.classList.add('revealed');
                    });
                }
                observer.unobserve(entry.target);
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.reveal, .reveal-staggered').forEach(el => {
        revealObserver.observe(el);
    });
}

/**
 * Magnetic Button Interaction
 */
function initMagneticButtons() {
    const magneticBtns = document.querySelectorAll('.premium-btn, .social-token, .user');
    
    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            // Subtle pull effect (strength factor: 0.2)
            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.3}px) scale(1.02)`;
            
            // Inner content shift if exists
            const icon = btn.querySelector('i');
            if (icon) {
                icon.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
            }
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
            const icon = btn.querySelector('i');
            if (icon) icon.style.transform = '';
        });
    });
}



/**
 * Parallax Background Effect
 */
function initParallax() {
    const parallaxEl = document.querySelector('.parallax-backdrop');
    if (!parallaxEl) return;

    window.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth - e.pageX * 2) / 100;
        const y = (window.innerHeight - e.pageY * 2) / 100;
        
        parallaxEl.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
    });
}

/**
 * Abstract Preloader
 */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    window.addEventListener('load', () => {
        setTimeout(() => {
            preloader.classList.add('fade-out');
            document.body.classList.remove('loading');
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 800);
        }, 1500); // Minimum 1.5s splash for branding
    });
}
