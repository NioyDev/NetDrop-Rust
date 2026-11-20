/**
 * @fileoverview Lógica de la Página de Ajustes y Configuración (SkillNexthezia)
 * Gestión de temas visuales, editor JSON, notificaciones y modo en segundo plano.
 */

(function () {
    'use strict';

    let defaultThemes = [];

    /**
     * Inicialización al cargar la vista de configuración.
     */
    function initSettings() {
        loadThemes();
        loadSystemSettings();
        setupEventListeners();
    }

    /**
     * Valida la sintaxis del JSON en tiempo real en el editor.
     */
    function validateJsonLive() {
        const textarea = document.getElementById('ThemeJsonInput');
        const badge = document.getElementById('JsonValidationBadge');
        if (!textarea || !badge) return;

        const val = textarea.value.trim();
        if (!val) {
            badge.textContent = 'Pendiente';
            badge.className = 'json-badge';
            return;
        }

        try {
            const parsed = JSON.parse(val);
            if (parsed.bgBase && parsed.accent) {
                badge.textContent = '✓ JSON Válido';
                badge.className = 'json-badge valid';
            } else {
                badge.textContent = '⚠️ Faltan claves (bgBase, accent)';
                badge.className = 'json-badge invalid';
            }
        } catch (e) {
            badge.textContent = '⚠️ Error de sintaxis';
            badge.className = 'json-badge invalid';
        }
    }

    /**
     * Configura escuchadores de eventos para la página de ajustes.
     */
    function setupEventListeners() {
        document.addEventListener('click', handleSettingsClick);
        window.addEventListener('theme-changed', () => {
            renderThemeGrid();
        });

        const jsonInput = document.getElementById('ThemeJsonInput');
        if (jsonInput) {
            jsonInput.addEventListener('input', validateJsonLive);
            validateJsonLive();
        }

        const fileInput = document.getElementById('ThemeFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', handleThemeFileSelected);
        }

        ['ToggleBackgroundMode', 'ToggleNotifications', 'ToggleNotificationSound'].forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('change', saveSystemSettings);
            }
        });
    }

    /**
     * Alterna la pestaña activa en la vista de ajustes.
     * @param {string} tabKey 
     * @param {HTMLElement} btn 
     */
    function switchTab(tabKey, btn) {
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-tab-content').forEach(c => c.style.display = 'none');

        if (btn) btn.classList.add('active');
        const tabEl = document.getElementById('Tab' + tabKey.charAt(0).toUpperCase() + tabKey.slice(1));
        if (tabEl) tabEl.style.display = 'block';
    }

    /**
     * Carga el archivo de temas predeterminados del servidor.
     */
    async function loadThemes() {
        if (Array.isArray(window.DEFAULT_THEMES) && window.DEFAULT_THEMES.length > 0) {
            defaultThemes = window.DEFAULT_THEMES;
            renderThemeGrid();
        }

        try {
            const res = await fetch('/static/json/themes.json?t=' + Date.now());
            if (res.ok) {
                defaultThemes = await res.json();
                renderThemeGrid();
            }
        } catch (e) {
            console.error('Error al cargar temas:', e);
        }
    }

    /**
     * Obtiene los datos del tema actualmente activo.
     * @returns {Promise<object|null>}
     */
    async function getActiveThemeData() {
        try {
            const local = localStorage.getItem('netdrop_active_theme_data');
            if (local) return JSON.parse(local);
        } catch (e) {}

        try {
            const res = await fetch('/api/theme');
            if (res.ok) {
                const data = await res.json();
                if (data.ok && data.theme) return data.theme;
            }
        } catch (e) {}

        return defaultThemes.length > 0 ? defaultThemes[0] : null;
    }

    /**
     * Renderiza la cuadrícula de temas visuales disponibles.
     */
    async function renderThemeGrid() {
        const grid = document.getElementById('ThemeGrid');
        if (!grid) return;

        const activeTheme = await getActiveThemeData();
        grid.innerHTML = '';

        defaultThemes.forEach(theme => {
            const isSelected = activeTheme && (
                theme.id === activeTheme.id ||
                (theme.bgBase === activeTheme.bgBase && theme.accent === activeTheme.accent)
            );

            const card = document.createElement('div');
            card.className = `theme-card ${isSelected ? 'active' : ''}`;
            card.dataset.action = 'select-theme';
            card.dataset.themeId = theme.id;
            card.setAttribute('data-theme-id', theme.id);

            card.innerHTML = `
                <div class="theme-card-header">
                    <span class="theme-card-name">${theme.name}</span>
                    ${isSelected ? '<span class="theme-active-badge">✓ Activo</span>' : ''}
                </div>
                <div class="theme-color-swatches" style="background-color: ${theme.bgBase};">
                    <div class="swatch-item" style="background-color: ${theme.surface}; border-color: ${theme.border};"></div>
                    <div class="swatch-item" style="background-color: ${theme.accent};"></div>
                    <div class="swatch-item" style="background-color: ${theme.text};"></div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    /**
     * Aplica el tema seleccionado por el usuario.
     * @param {object} theme 
     */
    function applySelectedTheme(theme) {
        if (typeof window.applyThemeVariables === 'function') {
            window.applyThemeVariables(theme, true);
        } else if (typeof applyThemeVariables === 'function') {
            applyThemeVariables(theme, true);
        }
        renderThemeGrid();
        if (window.showToast) window.showToast(`✓ Tema "${theme.name}" aplicado`);
    }

    /**
     * Aplica un tema personalizado introducido en el editor JSON.
     */
    function applyCustomJsonTheme() {
        const textarea = document.getElementById('ThemeJsonInput');
        const jsonText = textarea ? textarea.value.trim() : '';

        if (!jsonText) {
            if (window.showToast) window.showToast('Por favor introduce un JSON válido');
            return;
        }

        try {
            const customTheme = JSON.parse(jsonText);
            if (!customTheme.bgBase || !customTheme.accent) {
                throw new Error('El JSON debe incluir al menos bgBase y accent');
            }

            customTheme.id = customTheme.id || 'custom-' + Date.now();
            customTheme.name = customTheme.name || 'Tema Personalizado';

            applySelectedTheme(customTheme);
        } catch (err) {
            if (window.showToast) window.showToast('Error en JSON: ' + err.message);
        }
    }

    /**
     * Descarga la plantilla base JSON de temas.
     */
    function downloadThemeTemplate() {
        const template = {
            id: 'mi-tema-personalizado',
            name: 'Mi Tema Personalizado',
            bgBase: '#faf8f5',
            surface: '#ffffff',
            surfaceHover: '#f3efe9',
            text: '#1a1a1a',
            textHeading: '#111111',
            textMuted: '#666360',
            accent: '#c85a32',
            accentHover: '#b04923',
            accentBg: 'rgba(200, 90, 50, 0.08)',
            border: '#e6e2dc',
            borderHover: '#c5c0b8',
            danger: '#c93b2b',
            dangerHover: '#a82e20',
            dangerBg: 'rgba(201, 59, 43, 0.08)'
        };

        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'netdrop-tema-plantilla.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.showToast) window.showToast('✓ Plantilla JSON descargada');
    }

    /**
     * Lee un archivo JSON cargado desde el disco.
     * @param {Event} event 
     */
    function handleThemeFileSelected(event) {
        const file = event.target.files ? event.target.files[0] : null;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const textarea = document.getElementById('ThemeJsonInput');
            if (textarea) {
                textarea.value = e.target.result;
                if (window.showToast) window.showToast('✓ Archivo JSON cargado. Pulsa en "Aplicar Tema JSON"');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Exporta el tema activo al editor JSON.
     */
    function exportActiveThemeJson() {
        const data = localStorage.getItem('netdrop_active_theme_data');
        const textarea = document.getElementById('ThemeJsonInput');
        if (data && textarea) {
            textarea.value = JSON.stringify(JSON.parse(data), null, 2);
            if (window.showToast) window.showToast('✓ JSON del tema activo cargado en el editor');
        }
    }

    /**
     * Restablece el tema predeterminado.
     */
    function resetToDefaultTheme() {
        if (defaultThemes.length > 0) {
            applySelectedTheme(defaultThemes[0]);
        }
    }

    /**
     * Carga las preferencias del sistema desde el servidor.
     */
    async function loadSystemSettings() {
        try {
            const res = await fetch('/api/app-settings');
            if (!res.ok) return;
            const data = await res.json();
            if (data.ok && data.settings) {
                const bgToggle = document.getElementById('ToggleBackgroundMode');
                const notifToggle = document.getElementById('ToggleNotifications');
                const soundToggle = document.getElementById('ToggleNotificationSound');

                if (bgToggle) bgToggle.checked = Boolean(data.settings.background_mode);
                if (notifToggle) notifToggle.checked = data.settings.notifications_enabled !== false;
                if (soundToggle) soundToggle.checked = data.settings.notification_sound !== false;
            }
        } catch (e) {}
    }

    /**
     * Guarda las preferencias del sistema en el backend.
     */
    async function saveSystemSettings() {
        const bgToggle = document.getElementById('ToggleBackgroundMode');
        const notifToggle = document.getElementById('ToggleNotifications');
        const soundToggle = document.getElementById('ToggleNotificationSound');

        const bgMode = bgToggle ? bgToggle.checked : false;
        const notifs = notifToggle ? notifToggle.checked : true;
        const sound = soundToggle ? soundToggle.checked : true;

        try {
            const res = await fetch('/api/app-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    background_mode: bgMode,
                    notifications_enabled: notifs,
                    notification_sound: sound
                })
            });

            if (res.ok) {
                const msg = bgMode
                    ? '✓ Modo segundo plano activado al cerrar'
                    : '✓ Al cerrar la ventana se cerrará todo el programa por completo';
                if (window.showToast) window.showToast(msg);
            }
        } catch (e) {
            if (window.showToast) window.showToast('Error al guardar ajustes');
        }
    }

    /**
     * Delegador de clics en la interfaz de ajustes.
     * @param {MouseEvent} event 
     */
    function handleSettingsClick(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        if (action === 'switch-tab') {
            event.preventDefault();
            const tabKey = target.getAttribute('data-tab') || 'themes';
            switchTab(tabKey, target);
        } else if (action === 'select-theme') {
            event.preventDefault();
            const themeId = target.dataset.themeId || target.getAttribute('data-theme-id') || target.getAttribute('data-themeId');
            const found = defaultThemes.find(t => t.id === themeId);
            if (found) applySelectedTheme(found);
        } else if (action === 'apply-custom-theme') {
            event.preventDefault();
            applyCustomJsonTheme();
        } else if (action === 'download-theme-template') {
            event.preventDefault();
            downloadThemeTemplate();
        } else if (action === 'trigger-theme-file') {
            event.preventDefault();
            const fileInput = document.getElementById('ThemeFileInput');
            if (fileInput) fileInput.click();
        } else if (action === 'export-active-theme') {
            event.preventDefault();
            exportActiveThemeJson();
        } else if (action === 'reset-default-theme') {
            event.preventDefault();
            resetToDefaultTheme();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSettings);
    } else {
        initSettings();
    }
})();
