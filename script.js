/**
 * Casino Royal VIP - script.js
 * Animations, interactions, dynamic effects & security hardening
 * Version 2.0
 */

'use strict';

/* =============================================
   0. SECURITY MODULE
   — Runs first, before anything else
   ============================================= */
(function SecurityShield() {

    /* --- 0.1  Clickjacking guard ---
       If this page is being loaded inside an iframe
       (common attack vector), redirect top window to us. */
    if (window.self !== window.top) {
        try {
            window.top.location = window.self.location;
        } catch (e) {
            // Cross-origin iframe: hide the body to prevent clickjacking
            document.documentElement.style.display = 'none';
        }
        return;
    }

    /* --- 0.2  XSS Sanitizer (safe text helper) ---
       Centralises all dynamic text insertion. Never use
       innerHTML with user-controlled data—use this instead. */
    window._safeText = function(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    };

    /* --- 0.3  URL allow-list validator ---
       Any dynamic link must pass through this before being set. */
    window._safeUrl = function(url) {
        try {
            const parsed = new URL(url, window.location.origin);
            const allowed = ['https://wa.me', 'https://fonts.googleapis.com',
                             window.location.origin];
            if (allowed.some(a => parsed.href.startsWith(a))) return url;
        } catch (e) { /* fall through */ }
        return '#'; // Block anything not on the allow-list
    };

    /* --- 0.4  Honeypot trap ---
       Adds a hidden field to any forms on the page.
       If it's filled in by a bot, log it as suspicious. */
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('form').forEach(form => {
            const hp = document.createElement('input');
            hp.type = 'text';
            hp.name = '_hp_field'; // Bots typically fill hidden fields
            hp.autocomplete = 'off';
            hp.tabIndex = -1;
            hp.style.cssText = 'position:absolute;left:-9999px;opacity:0;height:0;width:0;';
            hp.setAttribute('aria-hidden', 'true');
            form.appendChild(hp);

            form.addEventListener('submit', e => {
                if (hp.value !== '') {
                    // Honeypot triggered — silently block
                    e.preventDefault();
                    SecurityShield._log('honeypot', 'Bot submission blocked');
                }
            });
        });
    });

    /* --- 0.5  Rate limiter for external links (anti-spam) ---
       Prevents automated scripts from rapidly firing
       dozens of WhatsApp redirect calls in a loop. */
    const _linkCooldowns = new Map();
    document.addEventListener('click', e => {
        const anchor = e.target.closest('a[href*="wa.me"]');
        if (!anchor) return;
        const href = anchor.getAttribute('href') || '';
        const now  = Date.now();
        const last = _linkCooldowns.get(href) || 0;
        if (now - last < 1500) {           // 1.5 s cooldown per link
            e.preventDefault();
            return;
        }
        _linkCooldowns.set(href, now);
    }, true);

    /* --- 0.6  Suspicious activity detector ---
       Watches for signs of automated / scripted interaction:
       extremely fast repeated clicks, devtools open, etc. */
    let _clickCount = 0;
    let _clickTimer = null;

    document.addEventListener('click', () => {
        _clickCount++;
        clearTimeout(_clickTimer);
        _clickTimer = setTimeout(() => { _clickCount = 0; }, 3000);
        if (_clickCount > 15) {
            SecurityShield._log('rapid-clicks', `${_clickCount} clicks in 3s`);
            _clickCount = 0;
        }
    });

    /* Devtools size-change heuristic (basic) */
    const _devToolsThreshold = 160;
    setInterval(() => {
        if (
            window.outerWidth  - window.innerWidth  > _devToolsThreshold ||
            window.outerHeight - window.innerHeight > _devToolsThreshold
        ) {
            SecurityShield._log('devtools', 'DevTools may be open');
        }
    }, 10000);

    /* --- 0.7  Internal logger (silent, no user impact) --- */
    SecurityShield._log = function(type, detail) {
        // In production: replace with real endpoint via navigator.sendBeacon
        try {
            const entry = { type, detail, ts: new Date().toISOString(), ua: navigator.userAgent };
            const existing = JSON.parse(sessionStorage.getItem('_sec_log') || '[]');
            existing.push(entry);
            sessionStorage.setItem('_sec_log', JSON.stringify(existing.slice(-50)));
        } catch(e) { /* storage full or blocked */ }
    };

    /* --- 0.8  Console warning for attackers --- */
    if (window.console && console.warn) {
        console.warn(
            '%c⛔ STOP!',
            'color:red;font-size:36px;font-weight:bold;'
        );
        console.warn(
            '%cEsta consola es para desarrolladores. Si alguien te pidió pegar código aquí, es un intento de hackeo. No pegues nada.',
            'color:#E11D48;font-size:14px;'
        );
    }

})();

/* =============================================
   1. PARTICLE SYSTEM
   ============================================= */
(function initParticles() {
    const container = document.getElementById('particles-container');
    if (!container) return;

    const count = window.innerWidth < 768 ? 20 : 50;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';

        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const tx = (Math.random() - 0.5) * 200;
        const ty = (Math.random() - 0.5) * 300;
        const dur = 15 + Math.random() * 15;
        const delay = Math.random() * 20;

        p.style.cssText = `
            left: ${x}%;
            top: ${y}%;
            --tx: ${tx}px;
            --ty: ${ty}px;
            animation: float-particle ${dur}s ${delay}s infinite ease-in-out;
        `;
        container.appendChild(p);
    }
})();

/* =============================================
   2. NAVBAR - Sticky & Scroll Effect
   ============================================= */
(function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    const onScroll = debounce(() => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
    }, 10);

    window.addEventListener('scroll', onScroll, { passive: true });

    // Mobile menu toggle
    const toggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            toggle.setAttribute('aria-expanded', navLinks.classList.contains('open'));
        });

        // Close on link click
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
            });
        });
    }
})();

/* =============================================
   3. SMOOTH SCROLL
   ============================================= */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    });
});

/* =============================================
   4. SCROLL REVEAL (Intersection Observer)
   ============================================= */
(function initReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, idx) => {
            if (entry.isIntersecting) {
                // Stagger effect for grouped items
                const parent = entry.target.parentElement;
                const siblings = parent ? Array.from(parent.querySelectorAll('.reveal')) : [];
                const index = siblings.indexOf(entry.target);
                const delay = index * 80;

                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);

                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -60px 0px'
    });

    elements.forEach(el => observer.observe(el));
})();

/* =============================================
   5. ANIMATED COUNTER (static stats on scroll)
   ============================================= */
(function initCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));

    function animateCounter(el) {
        const target = parseInt(el.dataset.target, 10);
        const duration = 2200;
        const fps = 60;
        const steps = duration / (1000 / fps);
        let frame = 0;

        const timer = setInterval(() => {
            frame++;
            const progress = frame / steps;
            const eased = 1 - Math.pow(1 - Math.min(progress, 1), 3);
            const current = Math.round(target * eased);
            el.textContent = formatNumber(current);
            if (frame >= steps) {
                el.textContent = formatNumber(target);
                clearInterval(timer);
            }
        }, 1000 / fps);
    }

    function formatNumber(n) {
        if (n >= 1000) return n.toLocaleString('es-AR');
        return n;
    }
})();

/* =============================================
   5b. DYNAMIC LIVE USERS COUNTER 🔴
   — Simulates real-time fluctuation of active users.
   Updates the hero badge and the stats card simultaneously.
   ============================================= */
(function initLiveUsersCounter() {

    /* Base values — feel free to customise */
    const BASE_USERS    = 50000; // approximate baseline
    const MIN_USERS     = 47000;
    const MAX_USERS     = 55000;
    const TICK_MS       = 4000;  // update every 4 seconds

    /* Drift parameters — simulate organic ups and downs */
    const DRIFT_MAX     = 120;   // max change per tick
    const DRIFT_BIAS    = 0.55;  // slight upward bias (>0.5)
    const SPIKE_PROB    = 0.07;  // 7% chance of a bigger jump (event effect)
    const SPIKE_MAX     = 350;

    /* Seed the initial count so it feels real on load */
    let liveCount = BASE_USERS
        + Math.floor((Math.random() - 0.5) * 2000);

    /* Find every element we want to update */
    const heroBadge   = document.querySelector('.hero-badge');
    const statCard    = document.querySelector('.stat-number[data-target="50000"]');
    const tickerItems = document.querySelectorAll('.ticker-item');

    /* ---- Render ---- */
    function render(count) {
        const formatted = count.toLocaleString('es-AR');
        const short = count >= 1000
            ? (count / 1000).toFixed(1).replace('.', ',') + 'K'
            : count.toString();

        /* 1. Hero badge */
        if (heroBadge) {
            heroBadge.innerHTML =
                `<span class="badge-pulse"></span>🎲 ${formatted} jugadores activos ahora`;
        }

        /* 2. Stats card (after it has been revealed) */
        if (statCard && statCard.dataset.live !== 'false') {
            // Only replace text if initial counter animation is done
            if (statCard.textContent !== '0') {
                statCard.textContent = formatted;
                statCard.dataset.live = 'true';
            }
        }
    }

    /* ---- Tick ---- */
    function tick() {
        const isSpike  = Math.random() < SPIKE_PROB;
        const maxDelta = isSpike ? SPIKE_MAX : DRIFT_MAX;
        const direction = Math.random() < DRIFT_BIAS ? 1 : -1;
        const delta = Math.floor(Math.random() * maxDelta) * direction;

        liveCount = Math.min(MAX_USERS, Math.max(MIN_USERS, liveCount + delta));
        render(liveCount);

        /* 3. Dynamically rotate a ticker item to show a new "winner" */
        injectTickerWinner();
    }

    /* ---- Ticker winner injection ---- */
    const NAMES = ['Martín G.','Sofía R.','Diego P.','Laura V.','Nicolás B.',
                   'Ana K.','Pablo M.','Valeria T.','Guido L.','Camila F.',
                   'Ramiro C.','Lucía S.','Hernán A.','Jimena D.','Matías E.'];
    const GAMES = ['Slots','Ruleta','Blackjack','Poker','Casino en Vivo'];
    let tickerIdx = 0;

    function injectTickerWinner() {
        const track = document.querySelector('.ticker-track');
        if (!track) return;

        const name   = NAMES[Math.floor(Math.random() * NAMES.length)];
        const game   = GAMES[Math.floor(Math.random() * GAMES.length)];
        const amount = (Math.floor(Math.random() * 450) + 50) * 1000;
        const fmt    = '$' + amount.toLocaleString('es-AR');

        // Safely encode: do not use innerHTML with raw user data
        const span = document.createElement('span');
        span.className = 'ticker-item';
        span.textContent = `🏆 ${name} ganó ${fmt} jugando ${game}`;

        // Fade the new item in
        span.style.opacity = '0';
        span.style.transition = 'opacity 0.8s ease';
        track.appendChild(span);
        requestAnimationFrame(() => { span.style.opacity = '1'; });

        // Remove old items to keep DOM clean (keep max 30)
        const items = track.querySelectorAll('.ticker-item');
        if (items.length > 30) {
            items[0].remove();
        }
    }

    /* ---- Smooth number transition helper ---- */
    function smoothUpdate(el, newVal) {
        if (!el) return;
        const oldVal = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0;
        const diff   = newVal - oldVal;
        const steps  = 20;
        let step     = 0;
        const t = setInterval(() => {
            step++;
            const current = Math.round(oldVal + (diff * step / steps));
            el.textContent = current.toLocaleString('es-AR');
            if (step >= steps) clearInterval(t);
        }, 50);
    }

    /* ---- Init ---- */
    render(liveCount);                          // draw immediately
    setInterval(tick, TICK_MS);                 // then update on interval

})();



/* =============================================
   6. FLIP CARDS - Mobile Tap Support
   ============================================= */
(function initFlipCards() {
    const cards = document.querySelectorAll('.service-card-flip');
    if (!cards.length) return;

    cards.forEach(card => {
        // Touch / click flip for mobile
        card.addEventListener('click', (e) => {
            // Prevent flip interference with inner link clicks on back side
            if (e.target.closest('a') && card.classList.contains('flipped')) return;

            // Only flip via click on mobile (hover handles desktop)
            if (window.innerWidth <= 1023) {
                card.classList.toggle('flipped');
            }
        });
    });
})();

/* =============================================
   7. COUNTDOWN TIMER (Bonus Section)
   ============================================= */
(function initBonoTimer() {
    const hoursEl   = document.getElementById('timer-hours');
    const minutesEl = document.getElementById('timer-minutes');
    const secondsEl = document.getElementById('timer-seconds');
    if (!hoursEl) return;

    // Set deadline: 24h from page session start
    const SESSION_KEY = 'casino_bono_deadline';
    let deadline = parseInt(sessionStorage.getItem(SESSION_KEY), 10);

    if (!deadline || deadline < Date.now()) {
        deadline = Date.now() + 23 * 3600 * 1000 + 59 * 60 * 1000 + 59 * 1000;
        sessionStorage.setItem(SESSION_KEY, deadline);
    }

    function updateTimer() {
        const remaining = Math.max(0, deadline - Date.now());

        const hours   = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        hoursEl.textContent   = String(hours).padStart(2, '0');
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');

        // Flash effect on seconds change
        secondsEl.style.color = '';
        requestAnimationFrame(() => {
            secondsEl.style.color = 'var(--orange-400)';
            setTimeout(() => { secondsEl.style.color = ''; }, 300);
        });

        if (remaining > 0) {
            setTimeout(updateTimer, 1000);
        }
    }

    updateTimer();
})();

/* =============================================
   8. PARALLAX BACKGROUND
   ============================================= */
(function initParallax() {
    const heroBg = document.querySelector('.hero-bg-gradient');
    if (!heroBg) return;

    const onScroll = debounce(() => {
        const scrolled = window.scrollY;
        heroBg.style.transform = `translateY(${scrolled * 0.25}px)`;
    }, 5);

    window.addEventListener('scroll', onScroll, { passive: true });
})();

/* =============================================
   9. NAVBAR ACTIVE LINK ON SCROLL
   ============================================= */
(function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + entry.target.id) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, { threshold: 0.4, rootMargin: '-80px 0px 0px 0px' });

    sections.forEach(s => observer.observe(s));
})();

/* =============================================
   10. WHATSAPP FLOAT BUTTON - Attention Effect
   ============================================= */
(function initWhatsAppFloat() {
    const btn = document.getElementById('whatsapp-float');
    if (!btn) return;

    // Shake after 5 seconds to attract attention
    setTimeout(() => {
        btn.style.animation = 'whatsapp-shake 0.6s ease-in-out';
        setTimeout(() => { btn.style.animation = ''; }, 700);
    }, 5000);

    // Repeat every 30 seconds
    setInterval(() => {
        btn.style.animation = 'whatsapp-shake 0.6s ease-in-out';
        setTimeout(() => { btn.style.animation = ''; }, 700);
    }, 30000);
})();

/* =============================================
   11. TICKER PAUSE ON HOVER
   ============================================= */
(function initTicker() {
    const track = document.querySelector('.ticker-track');
    if (!track) return;
    track.addEventListener('mouseenter', () => { track.style.animationPlayState = 'paused'; });
    track.addEventListener('mouseleave', () => { track.style.animationPlayState = 'running'; });
})();

/* =============================================
   12. ADD MISSING KEYFRAMES VIA JS
   ============================================= */
(function addKeyframes() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes whatsapp-shake {
            0%, 100% { transform: rotate(0); }
            20% { transform: rotate(-15deg) scale(1.1); }
            40% { transform: rotate(15deg) scale(1.15); }
            60% { transform: rotate(-10deg) scale(1.1); }
            80% { transform: rotate(10deg) scale(1.05); }
        }

        .nav-link.active {
            color: var(--primary-400) !important;
        }
        .nav-link.active::after {
            transform: scaleX(1) !important;
        }
    `;
    document.head.appendChild(style);
})();

/* =============================================
   UTILITY: DEBOUNCE
   ============================================= */
function debounce(fn, wait) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
    };
}

/* =============================================
   CONSOLE GREETING
   ============================================= */
console.log('%c🎰 Casino Royal VIP', 'color:#E11D48;font-size:20px;font-weight:bold;');
console.log('%cBuilt with ❤️ for the best online casino experience.', 'color:#A855F7');
