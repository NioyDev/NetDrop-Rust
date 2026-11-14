# Guía y Registro de Migración: NetDrop (Python/Flask ➔ Rust)

Este documento detalla la reescritura completa de **NetDrop**, migrada desde Python 3.11 + Flask hacia **Rust (Axum + Tokio)**, conservando exactamente la arquitectura de módulos, las rutas HTTP, el formato de respuestas JSON, las cabeceras de caché y la compatibilidad con el frontend web.

---

## 1. Tabla de Correspondencia Arquitectónica

| Módulo Original (Python) | Módulo Nuevo (Rust) | Propósito y Responsabilidad |
|---|---|---|
| `app.py` (`__main__`) | `src/main.rs` | Detección de instancia única, arranque en segundo plano, WebView nativo y control de ciclo de vida. |
| `app.py` (Flask App, Rutas, Caché) | `src/app.rs` | Configuración del Router Axum, estado global (`AppState`), middleware de cabeceras HTTP de caché, plantillas Tera y compresión. |
| Rutas `/`, `/settings`, `/update`, `/qrgenerator` | `src/rutas/paginas.rs` | Renderizado de las vistas HTML con contexto Jinja2/Tera. |
| Rutas `/archivo`, `/descarga`, `/eliminar` | `src/rutas/archivos.rs` | Visualización inline (con Range requests), descarga adjunta y borrado seguro de archivos. |
| Rutas `/upload`, `/upload-chunk` | `src/rutas/subida.rs` | Subida directa multipart y subida chunk-by-chunk por fragmentos con ensamblado atómico. |
| Rutas `/api/sync-status`, `/api/app-settings`, `/api/theme` | `src/rutas/api.rs` | Endpoints REST JSON para sincronización en tiempo real (Live Sync), persistencia de ajustes y temas. |
| Rutas `/qr`, `/qr-image` | `src/rutas/qr.rs` | Servicio y regeneración del código QR de conexión. |
| `Funciones/paths.py` | `src/funciones/paths.rs` | Localización de carpetas en `%LOCALAPPDATA%\NetDrop\File` y `\QR` (o `$HOME` en Linux/macOS). |
| `Funciones/configuracion.py` | `src/funciones/configuracion.rs` | Listas de extensiones permitidas, límite de tamaño (1000 MB) y sanitización `secure_filename`. |
| `Funciones/Show_File.py` | `src/funciones/show_file.rs` | Escaneo del directorio de subidas, ordenamiento por `mtime` descendente y formateo legible de tamaños. |
| `Funciones/ip.py` | `src/funciones/ip.rs` | Obtención de la IP local real mediante socket UDP sin envío de paquetes. |
| `Funciones/Qr_Generator.py` | `src/funciones/qr_generator.rs` | Generación de código QR nítido con el logotipo central superpuesto a 1/4 del ancho. |
| `Funciones/abrirNavegador.py` | `src/funciones/abrir_navegador.rs` | Apertura de la URL en el navegador predeterminado del sistema operativo. |
| `Funciones/close.py` | `src/funciones/close.rs` | Detección de puerto 5000 abierto para evitar instancias duplicadas. |
| `Lanzador/main.py` + `estilos.qss` | `src/lanzador/main.rs` (feature `launcher`) | Ventana fija ligera de 350x250 con botones estilizados con el sistema de diseño Terracota. |
| `distribucion/NetDrop-Setup.iss` | `distribucion/NetDrop-Setup.iss` | Instalador nativo Inno Setup para Windows para empaquetar el binario único compilado. |
| `netdrop-installer/DEBIAN/control` | `distribucion/NetDrop.desktop` y `.github/workflows/` | Empaquetado `.deb` para distribuciones Debian/Ubuntu con integración en el menú de aplicaciones. |
| `.github/workflows/release-all.yml` | `.github/workflows/ci.yml` y `release.yml` | Integración continua con verificación de formato/clippy/tests y publicación automática en GitHub Releases para Windows y Linux. |

---

## 2. Hallazgos y Análisis del Código Original

### 2.1. "Función de desbloqueo de archivos (solo Windows)"
El archivo `README.md` original mencionaba en su línea 77:
> *"La funcion de desbloqueo de archivos solo funciona en Windows."*

**Hallazgo verificado:** Se realizó una búsqueda exhaustiva en todo el árbol de archivos del repositorio original (`grep` por `desbloque`, `unlock`, `Zone.Identifier`, flujos alternativos NTFS, etc.). **No existe ninguna implementación ni lógica de código asociada en el proyecto Python.** Se trataba exclusivamente de un texto informativo en la documentación.

### 2.2. Inconsistencia de detección de IP en el QR original
En el proyecto Python:
- `Funciones/ip.py`, `app.py` y `abrirNavegador.py` utilizaban el truco del socket UDP a `8.8.8.8:80` para obtener la IP de red local (ej. `192.168.1.x`).
- Sin embargo, `Funciones/Qr_Generator.py` utilizaba `socket.gethostname()` y `socket.gethostbyname(hostname)`. En computadoras con adaptadores virtuales, VPN o configuraciones multitarjeta, esto provocaba que el QR codificara a menudo `127.0.0.1` en vez de la IP Wi-Fi real.
- **Acción tomada:** En Rust se utiliza `sacar_ip()` de manera consistente en todo el sistema para garantizar que el celular siempre pueda escanear y conectarse a la IP correcta.

### 2.3. Soporte de método GET en `/eliminar/<filename>`
En una API REST pura, eliminar un recurso debería ser exclusivamente `POST` o `DELETE`. Sin embargo, en el frontend original (`templates/index.html`):
```javascript
function confirmDeleteFile() {
    window.location.href = "/eliminar/" + encodeURIComponent(fileName);
}
```
Al hacer `window.location.href = ...`, el navegador emite una petición HTTP `GET`.
- **Acción tomada:** El endpoint `/eliminar/:filename` en Rust acepta tanto `GET` como `POST` para mantener una compatibilidad del 100% sin romper el diálogo modal de confirmación del frontend.

---

## 3. Mejoras Técnicas de la Versión Rust

1. **Un solo ejecutable autocontenido (Zero-Dependency):**
   - Todas las plantillas HTML (`templates/`) y todos los recursos estáticos (`static/`) quedan compilados directamente dentro del binario ejecutable mediante `rust-embed`.
   - Ya no se requiere Python, PyInstaller, WebView2 bootstrappers pesados ni descompresión temporal en carpetas `_MEIxxxx`.

2. **I/O Asíncrono no bloqueante y Streaming Real:**
   - En Flask, las descargas y subidas grandes ocupaban hilos sincrónicos del servidor WSGI.
   - En Rust, las descargas utilizan `ReaderStream` con soporte completo de encabezados `Range` (reproducción y seeking instantáneo en videos y audio), `Content-Length` y tipos MIME inferidos con exactitud.
   - Las subidas directas y en fragmentos (chunks) se transmiten en bloques de disco asíncronos mediante `tokio::fs`, sin cargar el archivo completo en memoria RAM.

3. **Seguridad contra Path Traversal:**
   - La función `secure_filename` en Rust previene ataques de escape de directorio (`../../`, caracteres no permitidos, barras diagonales invertidas de Windows y nombres reservados) en todas las rutas de archivo, descargas y subidas parciales.

4. **Compresión HTTP de alto rendimiento:**
   - Middleware de compresión transparente (Brotli, Gzip y Zstd) para archivos estáticos y respuestas HTML, reduciendo el consumo de ancho de banda en la red local.

5. **Caché HTTP optimizada:**
   - Archivos estáticos (`/static/*`) servidos con `Cache-Control: public, max-age=31536000, immutable`.
   - Endpoints de datos (`/api/*`) protegidos con `Cache-Control: no-cache, must-revalidate`.
