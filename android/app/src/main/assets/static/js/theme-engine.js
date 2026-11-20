/**
 * NETDROP DYNAMIC THEME ENGINE (DUAL SYNC: DISK SERVER + LOCALSTORAGE)
 */

const DEFAULT_THEMES = [
  {
    "id": "warm",
    "name": "Cálido Terracota",
    "bgBase": "#faf7f2",
    "surface": "#ffffff",
    "surfaceHover": "#f4efea",
    "text": "#292524",
    "textHeading": "#1c1917",
    "textMuted": "#78716c",
    "accent": "#c85a32",
    "accentHover": "#b04824",
    "accentBg": "rgba(200, 90, 50, 0.08)",
    "border": "#e7e2da",
    "borderHover": "#d6cfbe",
    "danger": "#dc2626",
    "dangerHover": "#b91c1c",
    "dangerBg": "rgba(220, 38, 38, 0.08)"
  },
  {
    "id": "dark-slate",
    "name": "Oscuro Grafito",
    "bgBase": "#0b0f19",
    "surface": "#151d2f",
    "surfaceHover": "#1e293b",
    "text": "#e2e8f0",
    "textHeading": "#f8fafc",
    "textMuted": "#94a3b8",
    "accent": "#3b82f6",
    "accentHover": "#2563eb",
    "accentBg": "rgba(59, 130, 246, 0.14)",
    "border": "#222f43",
    "borderHover": "#33435c",
    "danger": "#ef4444",
    "dangerHover": "#dc2626",
    "dangerBg": "rgba(239, 68, 68, 0.14)"
  },
  {
    "id": "forest",
    "name": "Bosque Esmeralda",
    "bgBase": "#f4f9f6",
    "surface": "#ffffff",
    "surfaceHover": "#e8f3ed",
    "text": "#1b4332",
    "textHeading": "#081c15",
    "textMuted": "#52796f",
    "accent": "#2d6a4f",
    "accentHover": "#1b4332",
    "accentBg": "rgba(45, 106, 79, 0.1)",
    "border": "#d1e6da",
    "borderHover": "#b7d5c4",
    "danger": "#e63946",
    "dangerHover": "#c92a37",
    "dangerBg": "rgba(230, 57, 70, 0.1)"
  },
  {
    "id": "midnight-amber",
    "name": "Noche Ámbar",
    "bgBase": "#121212",
    "surface": "#1e1e1e",
    "surfaceHover": "#2a2a2a",
    "text": "#e5e7eb",
    "textHeading": "#f9fafb",
    "textMuted": "#9ca3af",
    "accent": "#f59e0b",
    "accentHover": "#d97706",
    "accentBg": "rgba(245, 158, 11, 0.15)",
    "border": "#333333",
    "borderHover": "#474747",
    "danger": "#f43f5e",
    "dangerHover": "#e11d48",
    "dangerBg": "rgba(244, 63, 94, 0.15)"
  },
  {
    "id": "nordic",
    "name": "Nórdico Océano",
    "bgBase": "#f1f5f9",
    "surface": "#ffffff",
    "surfaceHover": "#e2e8f0",
    "text": "#1e293b",
    "textHeading": "#0f172a",
    "textMuted": "#64748b",
    "accent": "#0284c7",
    "accentHover": "#0369a1",
    "accentBg": "rgba(2, 132, 199, 0.1)",
    "border": "#cbd5e1",
    "borderHover": "#94a3b8",
    "danger": "#ef4444",
    "dangerHover": "#dc2626",
    "dangerBg": "rgba(239, 68, 68, 0.1)"
  },
  {
    "id": "twilight",
    "name": "Crepúsculo Amatista",
    "bgBase": "#15121e",
    "surface": "#201b2e",
    "surfaceHover": "#2c253e",
    "text": "#ddd6fe",
    "textHeading": "#f5f3ff",
    "textMuted": "#a78bfa",
    "accent": "#7c3aed",
    "accentHover": "#6d28d9",
    "accentBg": "rgba(124, 58, 237, 0.15)",
    "border": "#3b3152",
    "borderHover": "#4e426c",
    "danger": "#fb7185",
    "dangerHover": "#f43f5e",
    "dangerBg": "rgba(251, 113, 133, 0.15)"
  }
];

function applyThemeVariables(inputTheme, syncServer = true) {
    if (!inputTheme) return;
    const root = document.documentElement;

    // Fusión defensiva con plantilla base para garantizar contraste WCAG AA siempre
    const isDark = inputTheme.bgBase && (
        inputTheme.bgBase === '#000000' ||
        inputTheme.bgBase.startsWith('#0') ||
        inputTheme.bgBase.startsWith('#1') ||
        inputTheme.bgBase.startsWith('#2')
    );
    const baseFallback = isDark ? DEFAULT_THEMES[1] : DEFAULT_THEMES[0];
    const theme = Object.assign({}, baseFallback, inputTheme);

    if (theme.bgBase) {
        root.style.setProperty('--color-bg-base', theme.bgBase);
        if (document.body) {
            document.body.style.backgroundColor = theme.bgBase;
        }
    }
    if (theme.surface) root.style.setProperty('--color-surface', theme.surface);
    if (theme.surfaceHover) root.style.setProperty('--color-surface-hover', theme.surfaceHover);
    if (theme.text) root.style.setProperty('--color-text', theme.text);
    if (theme.textHeading) root.style.setProperty('--color-text-heading', theme.textHeading);
    if (theme.textMuted) root.style.setProperty('--color-text-muted', theme.textMuted);
    if (theme.accent) root.style.setProperty('--color-accent', theme.accent);
    if (theme.accentHover) root.style.setProperty('--color-accent-hover', theme.accentHover);
    if (theme.accentBg) root.style.setProperty('--color-accent-bg', theme.accentBg);
    if (theme.border) root.style.setProperty('--color-border', theme.border);
    if (theme.borderHover) root.style.setProperty('--color-border-hover', theme.borderHover);
    if (theme.danger) root.style.setProperty('--color-danger', theme.danger);
    if (theme.dangerHover) root.style.setProperty('--color-danger-hover', theme.dangerHover);
    if (theme.dangerBg) root.style.setProperty('--color-danger-bg', theme.dangerBg);

    // Guardar en localStorage
    try {
        localStorage.setItem('netdrop_active_theme_data', JSON.stringify(theme));
    } catch (e) {}

    // Notificar a otros componentes que el tema cambió
    try {
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
    } catch (e) {}

    // Persistir en servidor (para Escritorio pywebview / Móvil)
    if (syncServer && window.fetch) {
        fetch('/api/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(theme)
        }).catch(() => {});
    }
}

// Exportar globalmente en window para acceso desde cualquier script
window.applyThemeVariables = applyThemeVariables;
window.DEFAULT_THEMES = DEFAULT_THEMES;

async function initThemeEngine() {
    // 1. Carga ultra-rápida desde localStorage (si existe)
    let applied = false;
    try {
        const savedThemeData = localStorage.getItem('netdrop_active_theme_data');
        if (savedThemeData) {
            const theme = JSON.parse(savedThemeData);
            applyThemeVariables(theme, false);
            applied = true;
        }
    } catch (e) {}

    // 2. Si no hay localStorage o estamos en app de escritorio WebKit, consultar al servidor backend
    if (window.fetch) {
        try {
            const res = await fetch('/api/theme');
            if (res.ok) {
                const data = await res.json();
                if (data.ok && data.theme) {
                    applyThemeVariables(data.theme, false);
                    applied = true;
                }
            }
        } catch (e) {}
    }

    // 3. Fallback a tema por defecto (Warm Terracota)
    if (!applied) {
        applyThemeVariables(DEFAULT_THEMES[0], false);
    }
}

// Iniciar inmediatamente
window.initThemeEngine = initThemeEngine;
initThemeEngine();

// Re-asegurar al completar DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeEngine);
} else {
    initThemeEngine();
}
