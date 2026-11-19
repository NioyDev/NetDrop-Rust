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
            window.applyThemeVariables(targetTheme);
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
     * Maneja el clic en el backdrop para cerrar hojas o modales.
     * @param {MouseEvent} event 
     */
    function handleBackdropClick(event) {
        const qrModal = document.getElementById('qrModal');
        if (event.target === qrModal) {
            closeQrSheet();
        }

        const downloadModal = document.getElementById('downloadModal');
        if (event.target === downloadModal) {
            downloadModal.style.display = 'none';
        }
    }

    /**
     * Atajos de teclado accesibles (Tecla Esc).
     * @param {KeyboardEvent} event 
     */
    function handleKeydown(event) {
        if (event.key === 'Escape') {
            closeQrSheet();
            const downloadModal = document.getElementById('downloadModal');
            if (downloadModal) downloadModal.style.display = 'none';
        }
    }

    // Inicialización de escuchadores globales
    document.addEventListener('click', handleActionClick);
    window.addEventListener('click', handleBackdropClick);
    window.addEventListener('keydown', handleKeydown);

    // Exportación global en el objeto window
    window.showToast = showToast;
    window.openQrModal = openQrSheet;
    window.closeQrModal = closeQrSheet;
    window.copyIpAddress = copyIpAddress;
    window.toggleQuickTheme = toggleQuickTheme;
})();
