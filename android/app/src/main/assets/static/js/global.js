/**
 * @fileoverview Sistema Global de Interacción y Ergonomía Mobile-First (SkillNexthezia)
 * Manejo de Toasts, Bottom Sheets / Modales accesibles, Web Share API y cambio rápido de tema.
 */

(function () {
    'use strict';

    /**
     * Muestra una notificación tipo Toast con multiplicador en pantalla.
     * @param {string} message - Texto a mostrar.
     * @param {number} [duration=3000] - Tiempo visible en milisegundos.
     */
    function showToast(message, duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const cleanMessage = message.replace(/^[✓⚠️ℹ️]\s*/, '');
        const existing = findExistingToast(container, cleanMessage);

        if (existing) {
            incrementToastCount(existing, duration);
            return;
        }

        createNewToast(container, cleanMessage, duration);
    }

    /**
     * Localiza un toast activo idéntico para evitar spam visual.
     * @param {HTMLElement} container 
     * @param {string} cleanText 
     * @returns {HTMLElement|undefined}
     */
    function findExistingToast(container, cleanText) {
        return Array.from(container.children).find(
            el => el.dataset.baseMessage === cleanText && el.classList.contains('show')
        );
    }

    /**
     * Incrementa el contador (x2, x3...) de una notificación activa.
     * @param {HTMLElement} toast 
     * @param {number} duration 
     */
    function incrementToastCount(toast, duration) {
        const count = parseInt(toast.dataset.count || '1', 10) + 1;
        toast.dataset.count = String(count);

        const badge = toast.querySelector('.toast-multiplier');
        if (badge) {
            badge.textContent = `x${count}`;
            badge.style.display = 'inline-flex';
        }

        toast.classList.remove('toast-bounce');
        void toast.offsetWidth; // Forzar reflujo de renderizado
        toast.classList.add('toast-bounce');

        clearTimeout(toast.dismissTimer);
        toast.dismissTimer = setTimeout(() => dismissToast(toast), duration);
    }

    /**
     * Construye un nuevo elemento DOM de notificación y lo agrega.
     * @param {HTMLElement} container 
     * @param {string} cleanText 
     * @param {number} duration 
     */
    function createNewToast(container, cleanText, duration) {
        const toast = document.createElement('div');
        toast.className = 'toast-card';
        toast.dataset.baseMessage = cleanText;
        toast.dataset.count = '1';

        toast.innerHTML = `
            <div class="toast-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="toast-content">
                <span class="toast-text">${cleanText}</span>
            </div>
            <span class="toast-multiplier" style="display: none;">x1</span>
        `;

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        toast.dismissTimer = setTimeout(() => dismissToast(toast), duration);
    }

    /**
     * Descarta suavemente un toast del DOM.
     * @param {HTMLElement} toast 
     */
    function dismissToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 260);
    }

    /**
     * Abre el modal / bottom sheet de Código QR para móviles.
     */
    function openQrSheet() {
        const modal = document.getElementById('qrModal');
        if (!modal) return;
        modal.classList.add('active');
        document.body.classList.add('sheet-open');
    }

    /**
     * Cierra el modal / bottom sheet de Código QR.
     */
    function closeQrSheet() {
        const modal = document.getElementById('qrModal');
        if (!modal) return;
        modal.classList.remove('active');
        document.body.classList.remove('sheet-open');
    }

    /**
     * Copia la dirección IP local de NetDrop al portapapeles.
     */
    function copyIpAddress() {
        const ipElem = document.getElementById('ipAddressText');
        if (!ipElem) return;

        const ipText = ipElem.textContent.trim();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(ipText).then(() => {
                showToast('✓ Dirección IP copiada al portapapeles');
            }).catch(() => {
                showToast('IP: ' + ipText);
            });
            return;
        }
        showToast('IP: ' + ipText);
    }

    /**
     * Comparte el enlace directo mediante Web Share API en dispositivos móviles.
     */
    function shareIpLink() {
        const ipElem = document.getElementById('ipAddressText');
        if (!ipElem) return;

        const url = ipElem.textContent.trim();
        if (navigator.share) {
            navigator.share({
                title: 'NetDrop - Red Local',
                text: 'Conéctate a NetDrop para compartir archivos en la red local:',
                url: url
            }).then(() => {
                showToast('✓ Enlace compartido');
            }).catch(() => {
                copyIpAddress();
            });
            return;
        }
        copyIpAddress();
    }

    /**
     * Alterna rápidamente entre los temas visuales Claro y Oscuro.
     */
    async function toggleQuickTheme() {
        let currentTheme = null;
        try {
            const raw = localStorage.getItem('netdrop_active_theme_data');
            if (raw) currentTheme = JSON.parse(raw);
        } catch (e) {}

        const isDark = currentTheme && currentTheme.bgBase && (
            currentTheme.bgBase === '#0f172a' ||
            currentTheme.bgBase === '#1a1918' ||
            currentTheme.bgBase.startsWith('#0') ||
            currentTheme.bgBase.startsWith('#1')
        );

        let targetTheme = null;
        try {
            const res = await fetch('/static/json/themes.json');
            const themes = await res.json();
            targetTheme = isDark
                ? themes.find(t => t.id === 'warm') || themes[0]
                : themes.find(t => t.id === 'dark-slate') || themes[1];
        } catch (e) {
            targetTheme = isDark
                ? { id: 'warm', name: 'Cálido Terracota', bgBase: '#faf8f5', surface: '#ffffff', surfaceHover: '#f3efe9', text: '#1a1a1a', textHeading: '#111111', textMuted: '#666360', accent: '#c85a32', accentHover: '#b04923', accentBg: 'rgba(200, 90, 50, 0.08)', border: '#e6e2dc', borderHover: '#c5c0b8', danger: '#c93b2b', dangerHover: '#a82e20', dangerBg: 'rgba(201, 59, 43, 0.08)' }
                : { id: 'dark-slate', name: 'Oscuro Minimal', bgBase: '#0f172a', surface: '#1e293b', surfaceHover: '#334155', text: '#cbd5e1', textHeading: '#f8fafc', textMuted: '#94a3b8', accent: '#6366f1', accentHover: '#4f46e5', accentBg: 'rgba(99, 102, 241, 0.15)', border: '#334155', borderHover: '#475569', danger: '#ef4444', dangerHover: '#dc2626', dangerBg: 'rgba(239, 68, 68, 0.15)' };
        }

        if (typeof window.applyThemeVariables === 'function') {
            window.applyThemeVariables(targetTheme, true);
            showToast(`✓ Tema "${targetTheme.name}" activado`);
        }
    }

    /**
     * Manejador delegado para clics con data-action.
     * @param {MouseEvent} event 
     */
    function handleActionClick(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        if (action === 'open-qr') {
            event.preventDefault();
            openQrSheet();
        } else if (action === 'close-qr') {
            event.preventDefault();
            closeQrSheet();
        } else if (action === 'copy-ip') {
            event.preventDefault();
            copyIpAddress();
        } else if (action === 'share-ip') {
            event.preventDefault();
            shareIpLink();
        } else if (action === 'toggle-theme') {
            event.preventDefault();
            toggleQuickTheme();
        } else if (action === 'close-download-modal') {
            event.preventDefault();
            const modal = document.getElementById('downloadModal');
            if (modal) modal.style.display = 'none';
        }
    }

    /**
     * Cierra de manera uniforme cualquier modal o bottom sheet activo.
     * @param {HTMLElement} modal 
     */
    function closeModal(modal) {
        if (!modal) return;
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = '';
            content.style.transition = '';
        }

        if (modal.id === 'previewModal') {
            if (typeof window.closePreviewModal === 'function') {
                window.closePreviewModal();
            } else {
                modal.classList.remove('active');
                const body = document.getElementById('previewBody');
                if (body) body.innerHTML = '';
                document.body.classList.remove('sheet-open');
            }
        } else if (modal.id === 'deleteModal') {
            if (typeof window.closeDeleteModal === 'function') {
                window.closeDeleteModal();
            } else {
                modal.classList.remove('active');
                document.body.classList.remove('sheet-open');
            }
        } else if (modal.id === 'qrModal') {
            closeQrSheet();
        } else {
            modal.classList.remove('active');
            modal.style.display = 'none';
            document.body.classList.remove('sheet-open');
        }
    }

    /**
     * Configura el gesto táctil y de arrastre hacia abajo (Swipe Down to Dismiss)
     * para todas las hojas inferiores / modales de la interfaz.
     */
    function setupModalGestures() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const content = modal.querySelector('.modal-content');
            if (!content || modal.dataset.gestureAttached === 'true') return;
            modal.dataset.gestureAttached = 'true';

            let startY = 0;
            let currentY = 0;
            let isDragging = false;
            let isEligible = false;

            const onTouchStart = (e) => {
                if (!modal.classList.contains('active') && getComputedStyle(modal).display === 'none') {
                    return;
                }
                if (e.target.closest('button, a, input, select, textarea, .modal-close')) {
                    return;
                }

                const handle = modal.querySelector('.bottom-sheet-handle');
                const header = modal.querySelector('.modal-header-row');
                const isHandle = handle && handle.contains(e.target);
                const isHeader = header && header.contains(e.target);

                const scrollable = e.target.closest('.preview-body, .modal-content, .qr-modal-body');
                const isAtTop = !scrollable || scrollable.scrollTop <= 2;

                if (isHandle || isHeader || isAtTop) {
                    isEligible = true;
                    startY = e.touches ? e.touches[0].clientY : e.clientY;
                    currentY = startY;
                    isDragging = false;
                }
            };

            const onTouchMove = (e) => {
                if (!isEligible) return;

                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const deltaY = clientY - startY;

                if (deltaY > 6) {
                    isDragging = true;
                    if (e.cancelable) e.preventDefault();
                    content.style.transition = 'none';
                    content.style.transform = `translateY(${deltaY}px)`;
                } else if (deltaY < 0 && isDragging) {
                    content.style.transform = 'translateY(0)';
                }
            };

            const onTouchEnd = () => {
                if (!isEligible) return;
                isEligible = false;

                if (!isDragging) return;
                isDragging = false;

                const deltaY = currentY - startY;
                const threshold = 70;

                if (deltaY > threshold) {
                    content.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
                    content.style.transform = 'translateY(100%)';
                    setTimeout(() => {
                        closeModal(modal);
                        content.style.transition = '';
                        content.style.transform = '';
                    }, 220);
                } else {
                    content.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
                    content.style.transform = 'translateY(0)';
                    setTimeout(() => {
                        content.style.transition = '';
                        content.style.transform = '';
                    }, 200);
                }
            };

            const updatePos = (e) => {
                if (isEligible) {
                    currentY = e.touches ? e.touches[0].clientY : e.clientY;
                }
            };

            // Eventos táctiles
            content.addEventListener('touchstart', onTouchStart, { passive: true });
            content.addEventListener('touchmove', (e) => {
                updatePos(e);
                onTouchMove(e);
            }, { passive: false });
            content.addEventListener('touchend', onTouchEnd);
            content.addEventListener('touchcancel', onTouchEnd);

            // Soporte para arrastre con puntero/ratón en el handle
            const handle = modal.querySelector('.bottom-sheet-handle');
            if (handle) {
                handle.addEventListener('mousedown', (e) => {
                    isEligible = true;
                    startY = e.clientY;
                    currentY = startY;
                    isDragging = false;

                    const onMouseMove = (ev) => {
                        currentY = ev.clientY;
                        const deltaY = currentY - startY;
                        if (deltaY > 4) {
                            isDragging = true;
                            content.style.transition = 'none';
                            content.style.transform = `translateY(${deltaY}px)`;
                        }
                    };

                    const onMouseUp = () => {
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                        onTouchEnd();
                    };

                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                });
            }
        });
    }

    /**
     * Maneja el clic en el backdrop para cerrar hojas o modales.
     * @param {MouseEvent} event 
     */
    function handleBackdropClick(event) {
        if (event.target && event.target.classList && event.target.classList.contains('modal')) {
            closeModal(event.target);
        }
    }

    /**
     * Atajos de teclado accesibles (Tecla Esc) y bloqueo de inspector web.
     * @param {KeyboardEvent} event 
     */
    function handleKeydown(event) {
        if (event.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active, .modal[style*="display: flex"], #downloadModal[style*="display: block"]');
            if (activeModal) {
                closeModal(activeModal);
            }
        }

        // Bloquear atajos de depuración web en la aplicación nativa (F12, Ctrl+U, Ctrl+Shift+I, etc.)
        if (
            event.key === 'F12' ||
            (event.ctrlKey && (event.key === 'u' || event.key === 'U' || event.key === 's' || event.key === 'S' || event.key === 'p' || event.key === 'P')) ||
            (event.ctrlKey && event.shiftKey && (event.key === 'i' || event.key === 'I' || event.key === 'j' || event.key === 'J' || event.key === 'c' || event.key === 'C'))
        ) {
            event.preventDefault();
        }
    }

    /**
     * Deshabilita de manera absoluta el menú contextual del navegador (clic derecho)
     * en el webview y en cualquier pantalla.
     * @param {MouseEvent} event 
     */
    function handleContextMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        return false;
    }

    // Inicialización de escuchadores globales
    document.addEventListener('click', handleActionClick);
    window.addEventListener('click', handleBackdropClick);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    // Inicializar gestos al cargar el documento
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupModalGestures);
    } else {
        setupModalGestures();
    }

    // Exportación global en el objeto window
    window.showToast = showToast;
    window.openQrModal = openQrSheet;
    window.closeQrModal = closeQrSheet;
    window.closeModal = closeModal;
    window.setupModalGestures = setupModalGestures;
    window.copyIpAddress = copyIpAddress;
    window.toggleQuickTheme = toggleQuickTheme;
})();
