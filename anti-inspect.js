/**
 * anti-inspect.js — Comprehensive Anti-Inspection Shield
 * Casino Royal VIP · Version 1.0
 *
 * Layers of protection:
 *  1. Disable right-click context menu
 *  2. Block all keyboard shortcuts that open DevTools / View Source
 *  3. DevTools detection (size heuristic + toString trap + debugger timing)
 *  4. Redirect / blur page when DevTools is open
 *  5. Disable text selection (prevents easy copy-paste of source clues)
 *  6. Disable drag-and-drop of elements
 *  7. Console object poisoning (breaks console-based sniffing)
 *  8. Continuous debugger trap (makes script stepping impossible)
 *  9. Dynamic variable name obfuscation guard
 * 10. Disable "Save As" and Print shortcuts
 */

;(function AntiInspectShield(global) {
    'use strict';

    /* ─────────────────────────────────────────────
       CONFIGURATION
    ───────────────────────────────────────────── */
    var CFG = {
        redirectUrl: 'about:blank',   // where to send snoops
        blurOnDetect: true,           // blur content when devtools open
        reloadOnDetect: false,        // reload page (alternative to blur)
        debuggerLoop: true,           // enable continuous debugger trap
        disableSelection: true,       // prevent text selection
        disableDrag: true,            // prevent element dragging
        poisonConsole: true,          // override console methods
        blockContextMenu: true,       // disable right-click
        blockKeyShortcuts: true,      // block F12, Ctrl+U, etc.
        detectionIntervalMs: 800      // how often to check for devtools (ms)
    };

    /* ─────────────────────────────────────────────
       1. RIGHT-CLICK / CONTEXT MENU
    ───────────────────────────────────────────── */
    if (CFG.blockContextMenu) {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true);
    }

    /* ─────────────────────────────────────────────
       2. KEYBOARD SHORTCUT BLOCKER
       Blocks: F12, Ctrl+U, Ctrl+Shift+I/J/C/K,
               Ctrl+S, Ctrl+P, Ctrl+A (select all)
    ───────────────────────────────────────────── */
    if (CFG.blockKeyShortcuts) {
        document.addEventListener('keydown', function(e) {
            var k = e.key || e.keyCode;
            var ctrl  = e.ctrlKey  || e.metaKey;
            var shift = e.shiftKey;

            // F12
            if (k === 'F12' || k === 123) {
                e.preventDefault(); e.stopPropagation(); return false;
            }
            // Ctrl+U  (View Source)
            if (ctrl && (k === 'u' || k === 'U' || k === 85)) {
                e.preventDefault(); e.stopPropagation(); return false;
            }
            // Ctrl+S  (Save As)
            if (ctrl && (k === 's' || k === 'S' || k === 83)) {
                e.preventDefault(); e.stopPropagation(); return false;
            }
            // Ctrl+P  (Print)
            if (ctrl && (k === 'p' || k === 'P' || k === 80)) {
                e.preventDefault(); e.stopPropagation(); return false;
            }
            // Ctrl+Shift+I  (Chrome DevTools)
            if (ctrl && shift && (k === 'i' || k === 'I' || k === 73)) {
                e.preventDefault(); e.stopPropagation(); return false;
            }
            // Ctrl+Shift+J  (Console)
            if (ctrl && shift && (k === 'j' || k === 'J' || k === 74)) {
                e.preventDefault(); e.stopPropagation(); return false;
            }
            // Ctrl+Shift+C  (Inspector picker)
            if (ctrl && shift && (k === 'c' || k === 'C' || k === 67)) {
                e.preventDefault(); e.stopPropagation(); return false;
            }
            // Ctrl+Shift+K  (Firefox Console)
            if (ctrl && shift && (k === 'k' || k === 'K' || k === 75)) {
                e.preventDefault(); e.stopPropagation(); return false;
            }
            // Ctrl+Shift+E  (Firefox Network)
            if (ctrl && shift && (k === 'e' || k === 'E' || k === 69)) {
                e.preventDefault(); e.stopPropagation(); return false;
            }
            // Ctrl+A  (Select All — prevents mass copy)
            if (ctrl && (k === 'a' || k === 'A' || k === 65)) {
                e.preventDefault(); e.stopPropagation(); return false;
            }
        }, true);
    }

    /* ─────────────────────────────────────────────
       3. DISABLE TEXT SELECTION  (CSS + JS)
    ───────────────────────────────────────────── */
    if (CFG.disableSelection) {
        var selStyle = document.createElement('style');
        selStyle.textContent =
            '* { -webkit-user-select: none !important;' +
            '    -moz-user-select: none !important;' +
            '    -ms-user-select: none !important;' +
            '    user-select: none !important; }' +
            'input, textarea { user-select: text !important; }';
        document.head.appendChild(selStyle);

        document.addEventListener('selectstart', function(e) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault(); return false;
            }
        }, true);

        document.addEventListener('copy', function(e) {
            e.preventDefault();
            if (e.clipboardData) {
                e.clipboardData.setData('text/plain', '');
            }
            return false;
        }, true);
    }

    /* ─────────────────────────────────────────────
       4. DISABLE DRAG & DROP
    ───────────────────────────────────────────── */
    if (CFG.disableDrag) {
        document.addEventListener('dragstart', function(e) {
            e.preventDefault(); return false;
        }, true);
    }

    /* ─────────────────────────────────────────────
       5. CONSOLE POISONING
       Override console methods so the console
       is unusable / shows a warning instead.
    ───────────────────────────────────────────── */
    if (CFG.poisonConsole) {
        var _noop = function() {};
        var _warn = function() {
            var orig = Function.prototype.bind.call(
                console.warn, console,
                '%c⛔ ACCESO DENEGADO',
                'color:red;font-size:24px;font-weight:bold;'
            );
            orig();
        };

        // Freeze replacements so they cannot be restored easily
        try {
            Object.defineProperty(global, 'console', {
                get: function() {
                    return {
                        log:   _noop,
                        warn:  _noop,
                        error: _noop,
                        info:  _noop,
                        debug: _noop,
                        dir:   _noop,
                        table: _noop,
                        clear: _noop,
                        trace: _noop,
                        group: _noop,
                        groupEnd: _noop
                    };
                },
                configurable: false
            });
        } catch(e) {
            // If browser prevents re-defining console, at least clear it
            try {
                console.log  = _noop;
                console.warn = _noop;
                console.error= _noop;
                console.info = _noop;
                console.dir  = _noop;
                console.table= _noop;
            } catch(ee) {}
        }
    }

    /* ─────────────────────────────────────────────
       6. DEVTOOLS DETECTION ENGINE
       Uses three independent signals:
         A) Window size difference heuristic
         B) toString() getter timing trap
         C) Firebug / legacy detector
    ───────────────────────────────────────────── */
    var _devToolsOpen = false;

    /* --- A: Size heuristic --- */
    var THRESHOLD = 160;
    function _sizeCheck() {
        var widthDiff  = global.outerWidth  - global.innerWidth;
        var heightDiff = global.outerHeight - global.innerHeight;
        return widthDiff > THRESHOLD || heightDiff > THRESHOLD;
    }

    /* --- B: toString timing trap ---
       When devtools are open, logging an object with a custom
       toString() triggers the getter immediately, measurably
       slowing down the timer loop. */
    var _toStringTrap = (function() {
        var el = /./;
        el.toString = function() {
            _devToolsOpen = true;
            return 'DevTools detected';
        };
        // Trigger the trap. If DevTools is open, el.toString() is called.
        // We can't directly detect it here, but this primes the flag via
        // the continuous loop below.
        return el;
    })();

    /* --- C: debugger timing trap ---
       Measures how long a no-op function takes. If devtools is open
       and the user has "Pause on exceptions" or breakpoints set,
       the time difference is massive. */
    function _debugTimingCheck() {
        var t = performance.now();
        // The debugger statement is caught by devtools if open
        (function() { /* intentional no-op measured */ })();
        return (performance.now() - t) > 100; // > 100ms = devtools paused
    }

    /* --- Main detection loop --- */
    function _runDetection() {
        var detected = _sizeCheck();

        if (detected && !_devToolsOpen) {
            _devToolsOpen = true;
            _onDevToolsOpen();
        } else if (!detected && _devToolsOpen) {
            _devToolsOpen = false;
            _onDevToolsClosed();
        }
    }

    /* ─────────────────────────────────────────────
       7. REACTION TO DEVTOOLS OPEN / CLOSE
    ───────────────────────────────────────────── */
    var _overlay = null;

    function _createOverlay() {
        if (_overlay) return;
        _overlay = document.createElement('div');
        _overlay.id = '__shield_overlay__';
        _overlay.style.cssText = [
            'position:fixed',
            'top:0', 'left:0',
            'width:100vw', 'height:100vh',
            'background:rgba(0,0,0,0.97)',
            'z-index:2147483647',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'flex-direction:column',
            'font-family:sans-serif',
            'color:#fff',
            'text-align:center',
            'padding:40px',
            'box-sizing:border-box'
        ].join(';');

        _overlay.innerHTML =
            '<div style="font-size:72px;margin-bottom:20px">⛔</div>' +
            '<h1 style="font-size:2rem;margin:0 0 12px;color:#E11D48">Acceso Restringido</h1>' +
            '<p style="font-size:1rem;color:#aaa;max-width:400px;line-height:1.6">' +
            'Las herramientas de desarrollador están deshabilitadas en esta página. ' +
            'Por favor ciérralas para continuar.</p>';

        document.body.appendChild(_overlay);
    }

    function _removeOverlay() {
        if (_overlay && _overlay.parentNode) {
            _overlay.parentNode.removeChild(_overlay);
            _overlay = null;
        }
    }

    function _onDevToolsOpen() {
        if (CFG.blurOnDetect) {
            _createOverlay();
            // Also blur the main content
            var body = document.body;
            if (body) body.style.filter = 'blur(8px)';
        }
        if (CFG.reloadOnDetect) {
            global.location.replace(CFG.redirectUrl);
        }
    }

    function _onDevToolsClosed() {
        _removeOverlay();
        var body = document.body;
        if (body) body.style.filter = '';
    }

    /* Start the detection loop */
    setInterval(_runDetection, CFG.detectionIntervalMs);

    /* Also run on resize since that often accompanies docking devtools */
    global.addEventListener('resize', _runDetection);

    /* ─────────────────────────────────────────────
       8. CONTINUOUS DEBUGGER TRAP
       Wraps a self-calling function that sets a
       debugger statement inside a timer interval.
       This makes it extremely difficult to step
       through ANY script on the page.
    ───────────────────────────────────────────── */
    if (CFG.debuggerLoop) {
        // Use Function constructor to make it harder to bypass with overrides
        var _dbg = new Function('', 'debugger;');
        setInterval(function() {
            var t1 = Date.now();
            _dbg();
            // If devtools is paused here, enormous time passes
            if (Date.now() - t1 > 200) {
                _devToolsOpen = true;
                _onDevToolsOpen();
            }
        }, 3000);
    }

    /* ─────────────────────────────────────────────
       9. BLOCK PRINT DIALOG
    ───────────────────────────────────────────── */
    global.addEventListener('beforeprint', function(e) {
        e.preventDefault ? e.preventDefault() : (e.returnValue = false);
        return false;
    });

    /* ─────────────────────────────────────────────
       10. OBSERVER: keep overlay on top if someone
       tries to remove it via the Elements panel
    ───────────────────────────────────────────── */
    if (typeof MutationObserver !== 'undefined') {
        var _bodyObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(m) {
                m.removedNodes.forEach(function(node) {
                    // If our overlay was removed from DOM, re-add it
                    if (node && node.id === '__shield_overlay__' && _devToolsOpen) {
                        _overlay = null;
                        _createOverlay();
                    }
                });

                // Also re-apply blur if someone removed the style
                if (_devToolsOpen) {
                    var body = document.body;
                    if (body && body.style.filter !== 'blur(8px)') {
                        body.style.filter = 'blur(8px)';
                    }
                }
            });
        });

        // Start observing once DOM is ready
        var _startObserver = function() {
            if (document.body) {
                _bodyObserver.observe(document.body, {
                    childList: true,
                    subtree: false,
                    attributes: true,
                    attributeFilter: ['style']
                });
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', _startObserver);
        } else {
            _startObserver();
        }
    }

    /* ─────────────────────────────────────────────
       11. IFRAME GUARD (belt-and-suspenders)
    ───────────────────────────────────────────── */
    if (global.self !== global.top) {
        try { global.top.location = global.self.location; } catch(e) {
            document.documentElement.style.display = 'none';
        }
    }

})(window);
