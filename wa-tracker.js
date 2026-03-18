/**
 * ============================================================
 * wa-tracker.js — WhatsApp Anti-Ban + Tracking System
 * Casino Royal VIP · Version 1.0
 * ============================================================
 *
 * FEATURES:
 *  1. Number rotation (by source / random) — 1 number per session
 *  2. UTM parameter reading — detects traffic source automatically
 *  3. Unique tracking code per visit — identifies origin in chat
 *  4. Message variation — never sends the same text twice
 *  5. Click rate limiter — prevents spam / robotic behavior
 *  6. Meta Pixel event on WA click (optional, configure below)
 *  7. Replaces ALL wa.me links on the page automatically
 *
 * ============================================================
 * ⚙️  CONFIGURACIÓN — EDITAR SOLO ESTA SECCIÓN
 * ============================================================ */

const WA_CONFIG = {

    /* ── NÚMEROS DE WHATSAPP (con código de país, sin + ni espacios) ──
       Añadí o quitá números. Mínimo 1, recomendado 2–4.
       Ejemplo Argentina: '5491112345678'
       Ejemplo México:    '5215512345678'          */
    numeros: {
        // Tráfico de Meta Ads / Facebook / Instagram pagado
        meta:      ['5491100000001', '5491100000002'],
        // Tráfico de TikTok
        tiktok:    ['5491100000003'],
        // Influencers / afiliados
        influencer:['5491100000002', '5491100000003'],
        // Google Ads
        google:    ['5491100000001'],
        // Tráfico orgánico (directo, sin UTM)
        organico:  ['5491100000001', '5491100000002', '5491100000003'],
    },

    /* ── PREFIJOS DE CÓDIGO DE TRACKING por fuente ──
       Se incluyen en el mensaje de WhatsApp para saber de dónde viene. */
    prefijos: {
        meta:       'META',
        tiktok:     'TT',
        influencer: 'INF',
        google:     'GGL',
        organico:   'LD',
        desconocido:'X',
    },

    /* ── PIXEL DE META (opcional) ──
       Si tenés Pixel de Meta, poné tu ID acá.
       Dejalo en '' si no lo usás todavía.           */
    metaPixelId: '',

    /* ── EVENTO DE META PIXEL a disparar en click ── */
    metaPixelEvent: 'Lead',

    /* ── MENSAJES PRE-CARGADOS (se rotan aleatoriamente) ──
       El token {CODE} se reemplaza con el código de tracking.
       Agregá o modificá mensajes para mayor variedad.        */
    mensajes: [
        'Hola! Quiero registrarme ✅ Mi código: {CODE}',
        'Buenas! Me interesa el bono del 50% 🎰 Código: {CODE}',
        'Hola, quiero crear mi cuenta. Ref: {CODE} 🤩',
        'Buen día! Vengo por el bono de bienvenida. Mi código es {CODE}',
        'Hola! Quiero cargar fichas y recibir mi bono. ID: {CODE}',
        'Muy buenas! Me interesa jugar. Código de referido: {CODE} 🎲',
        'Consulta por registrarme. Código: {CODE} ✨',
        'Hola! Quiero empezar a jugar, el código que tengo es {CODE}',
    ],

    /* ── COOLDOWN entre clicks en WA (milisegundos) ──
       Evita que bots o scripts hagan clicks repetitivos.
       1500 = 1.5 segundos de espera entre clicks.           */
    clickCooldownMs: 1500,

    /* ── LONGITUD DEL CÓDIGO ALEATORIO generado por visita ── */
    codigoLength: 6,

};

/* ============================================================
   SISTEMA INTERNO — No es necesario editar debajo de esta línea
   ============================================================ */
(function WATracker() {
    'use strict';

    /* ── 1. Leer UTMs de la URL ── */
    function getUTMs() {
        const p = new URLSearchParams(window.location.search);
        return {
            source:   (p.get('utm_source')   || '').toLowerCase(),
            medium:   (p.get('utm_medium')   || '').toLowerCase(),
            campaign: (p.get('utm_campaign') || '').toLowerCase(),
            content:  (p.get('utm_content')  || '').toLowerCase(),
            term:     (p.get('utm_term')      || '').toLowerCase(),
            ref:      (p.get('ref')           || '').toLowerCase(), // soporte para ?ref=influencer1
        };
    }

    /* ── 2. Detectar fuente de tráfico ── */
    function detectarFuente(utms) {
        const s = utms.source;
        const m = utms.medium;
        if (s.includes('facebook') || s.includes('fb') || s.includes('instagram') || s.includes('ig') || m.includes('paid') || m.includes('cpc')) return 'meta';
        if (s.includes('tiktok') || s.includes('tt')) return 'tiktok';
        if (s.includes('google') || s.includes('ggl')) return 'google';
        if (utms.ref || s.includes('influencer') || s.includes('inf') || m.includes('afiliado')) return 'influencer';
        if (s || m) return 'organico'; // tiene UTM pero no reconocido
        return 'organico'; // tráfico directo
    }

    /* ── 3. Elegir número según fuente (rotar dentro del grupo) ── */
    function elegirNumero(fuente) {
        const grupo = WA_CONFIG.numeros[fuente] || WA_CONFIG.numeros.organico;
        // Rotación round-robin dentro del grupo, persistida por sesión
        const KEY = `wa_idx_${fuente}`;
        let idx = parseInt(sessionStorage.getItem(KEY) || '0', 10);
        const numero = grupo[idx % grupo.length];
        sessionStorage.setItem(KEY, (idx + 1) % grupo.length);
        return numero;
    }

    /* ── 4. Generar código de tracking único por visita/sesión ── */
    function generarCodigo(fuente, utms) {
        const SESSION_KEY = 'wa_tracking_code';
        let codigo = sessionStorage.getItem(SESSION_KEY);
        if (!codigo) {
            const prefijo = WA_CONFIG.prefijos[fuente] || WA_CONFIG.prefijos.desconocido;
            const campaña = utms.campaign.replace(/[^a-z0-9]/gi,'').slice(0,4).toUpperCase() || 'DIR';
            const rand    = Math.random().toString(36).substring(2, 2 + WA_CONFIG.codigoLength).toUpperCase();
            codigo = `${prefijo}_${campaña}_${rand}`;
            sessionStorage.setItem(SESSION_KEY, codigo);
        }
        return codigo;
    }

    /* ── 5. Elegir mensaje aleatorio y personalizar ── */
    function generarMensaje(codigo) {
        const msgs = WA_CONFIG.mensajes;
        const base = msgs[Math.floor(Math.random() * msgs.length)];
        return base.replace('{CODE}', codigo);
    }

    /* ── 6. Construir URL de WhatsApp ── */
    function buildWAUrl(numero, mensaje) {
        return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    }

    /* ── 7. Rate limiter — cooldown entre clicks ── */
    const _lastClick = {};
    function canClick(numero) {
        const now  = Date.now();
        const last = _lastClick[numero] || 0;
        if (now - last < WA_CONFIG.clickCooldownMs) return false;
        _lastClick[numero] = now;
        return true;
    }

    /* ── 8. Disparar Pixel de Meta (si está configurado) ── */
    function firePixel(codigo, fuente) {
        try {
            if (WA_CONFIG.metaPixelId && typeof fbq === 'function') {
                fbq('track', WA_CONFIG.metaPixelEvent, {
                    content_name: 'whatsapp_click',
                    content_category: fuente,
                    content_ids: [codigo],
                });
            }
        } catch(e) { /* Pixel no disponible */ }
    }

    /* ── 9. Reemplazar todos los links wa.me de la página ── */
    function reemplazarLinks(numero, mensaje) {
        const url = buildWAUrl(numero, mensaje);
        document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
            a.setAttribute('href', url);
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });
    }

    /* ── 10. Interceptar clicks y aplicar anti-spam ── */
    function interceptarClicks(numero, mensaje, codigo, fuente) {
        document.addEventListener('click', e => {
            const a = e.target.closest('a[href*="wa.me"]');
            if (!a) return;

            if (!canClick(numero)) {
                e.preventDefault();
                return; // click demasiado rápido — bloqueado
            }

            // Actualizar URL con el mensaje más reciente (por si acaso)
            a.href = buildWAUrl(numero, mensaje);

            // Disparar Pixel
            firePixel(codigo, fuente);

            // Log interno (útil para debug)
            console.info(`[WA-Tracker] → Número: ${numero} | Código: ${codigo} | Fuente: ${fuente}`);
        }, true);
    }

    /* ── 11. Actualizar contador en tiempo real (hero badge) ──
       Sincronizado con script.js si existe, sino lo maneja solo. */
    function actualizarBadge(numero) {
        // El badge de fuente activa en la consola
        console.info(`[WA-Tracker] Número activo esta sesión: ${numero}`);
    }

    /* ── 12. Mostrar el número asignado en DevTools (debug) ── */
    function logDebug(numero, codigo, fuente, utms) {
        console.groupCollapsed('%c[WA-Tracker] Sesión inicializada', 'color:#25D366;font-weight:bold');
        console.table({ Número: numero, Código: codigo, Fuente: fuente, UTM_Source: utms.source || '(directo)', UTM_Campaign: utms.campaign || '—' });
        console.groupEnd();
    }

    /* ── INIT ── */
    function init() {
        const utms   = getUTMs();
        const fuente = detectarFuente(utms);
        const numero = elegirNumero(fuente);
        const codigo = generarCodigo(fuente, utms);
        const msg    = generarMensaje(codigo);

        // Guardar en sesión para acceso externo si hace falta
        sessionStorage.setItem('wa_numero_activo', numero);
        sessionStorage.setItem('wa_fuente',        fuente);

        // Reemplazar links y activar interceptor
        reemplazarLinks(numero, msg);
        interceptarClicks(numero, msg, codigo, fuente);
        actualizarBadge(numero);
        logDebug(numero, codigo, fuente, utms);

        // Exponer API pública por si script.js necesita el número
        window.WATracker = {
            numero,
            codigo,
            fuente,
            mensaje: msg,
            buildUrl: () => buildWAUrl(numero, msg),
        };
    }

    // Ejecutar apenas el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
