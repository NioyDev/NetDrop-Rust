# NetDropRS (Rust)

[![CI](https://github.com/NioyDev/NetDrop-Rust/actions/workflows/ci.yml/badge.svg)](https://github.com/NioyDev/NetDrop-Rust/actions/workflows/ci.yml)
![Licencia](https://img.shields.io/badge/licencia-PolyForm%20Noncommercial%201.0.0-blue)
![Rust](https://img.shields.io/badge/hecho%20con-Rust%202021-orange?logo=rust)
![Estado](https://img.shields.io/badge/estado-completado%20100%25-brightgreen)
![Binario](https://img.shields.io/badge/binario-autocontenido-success)

**Transferencia ultraligera y segura de archivos en red local con código QR, interfaz web y ventana de escritorio nativa.**

---

NetDropRS es la migración y evolución completa a **Rust** del proyecto original [NetDrop](https://github.com/NioyDev/NetDrop) (escrito originalmente en Python/Flask). Conserva al 100% la interfaz, el comportamiento y el contrato de endpoints HTTP, pero sustituye el runtime pesado de Python por un **único ejecutable nativo ultrarrápido**, con un consumo insignificante de memoria RAM y arranque inmediato.

---

## 🚀 Comparativa de Rendimiento: Python vs. Rust

| Métrica | NetDrop (Python + Flask) | NetDropRS (Rust + Axum) | Mejora |
|---|---|---|---|
| **Consumo de RAM en reposo** | ~65 – 90 MB | **~8 – 14 MB** | **~85% menos memoria** |
| **Tiempo de arranque** | ~1.8 – 2.5 s | **< 25 ms** | **~80x más rápido** |
| **Tamaño del paquete ejecutable** | ~45 – 70 MB (PyInstaller) | **~15 – 22 MB** (todo embebido) | **~60% menor tamaño** |
| **Subida de archivos grandes (1 GB)** | Buffer intermedio en RAM | **Streaming directo a disco (chunks 1MB)** | Cero desbordamiento de RAM |
| **Descarga de archivos (HTTP)** | Síncrona, streaming básico | **ReaderStream asíncrono + HTTP Range** | Soporte nativo de reanudación |
| **Arranque / Single-Instance** | Verificación por socket lenta | **Detección instantánea (timeout 1s)** | Reenvío instantáneo al navegador |

---

## ✨ Características Principales

- **Binario único autocontenido:** Todos los recursos estáticos (CSS, JS, logos, fuentes) y las plantillas HTML (motor Tera) van compilados dentro del propio ejecutable (`rust-embed`). No requiere carpetas externas para funcionar.
- **Subida por trozos (Chunked Upload):** Soporta subidas fragmentadas mediante `/upload-chunk` con archivo temporal `.part` y unión atómica al finalizar, evitando saturar la memoria RAM.
- **Protección contra Path Traversal:** Algoritmo estricto de sanitización (`secure_filename`) en rutas de descarga, visualización y eliminación (`/archivo/`, `/descarga/`, `/eliminar/`).
- **Generador de Código QR Local:** Detección automática de la IP privada en la interfaz de red local y renderizado del QR en PNG con el logotipo de la aplicación superpuesto y centrado.
- **Ventana de Escritorio Nativa:** Integración con `wry` y `tao` (motor WebView nativo del sistema operativo, sin Chromium pesado ni Electron).
- **Modo en Segundo Plano:** Configurable desde la interfaz; permite mantener el servidor web activo tras cerrar la ventana de escritorio o apagar el proceso completo.
- **Soporte HTTPS Automático:** Si se ubican `cert.crt` y `cert.key` junto al ejecutable, se activa automáticamente cifrado TLS con `rustls` y `axum-server`.
- **Lanzador Opcional Ultraligero (`netdrop-launcher`):** Mini interfaz compacta con botones para abrir en navegador o finalizar el servicio.

---

## 📂 Arquitectura del Proyecto

```text
NetDrop-Rust/
├── Cargo.toml                  # Configuración de dependencias, features y perfiles LTO
├── src/
│   ├── main.rs                 # Detección de instancia única, servidor Axum y WebView
│   ├── app.rs                  # Router HTTP, plantillas Tera y assets embebidos
│   ├── lib.rs                  # Biblioteca con suite de pruebas unitarias e integración
│   ├── rutas/
│   │   ├── paginas.rs          # Handlers GET /, /settings, /update, /qrgenerator
│   │   ├── subida.rs           # Handlers POST /upload y POST /upload-chunk (streaming)
│   │   ├── archivos.rs         # Servido inline, descarga con Range y eliminación
│   │   ├── api.rs              # /api/sync-status, /api/app-settings, /api/theme
│   │   └── qr.rs               # /qr-image y /qr (redirección)
│   ├── funciones/
│   │   ├── configuracion.rs    # Extensiones permitidas, límite 1000 MB y secure_filename
│   │   ├── paths.rs            # Rutas de datos (%LOCALAPPDATA%/NetDrop/File y /QR)
│   │   ├── show_file.rs        # Listado ordenado por mtime y formato legible de bytes
│   │   ├── ip.rs               # Detección de IP local mediante socket UDP a 8.8.8.8:80
│   │   ├── qr_generator.rs     # Generación de QR con logo central en 1/4 de escala
│   │   ├── close.rs            # Comprobación de puerto 5000 (instancia previa)
│   │   └── abrir_navegador.rs  # Apertura de navegador nativo
│   └── lanzador/
│       ├── main.rs             # Mini ventana independiente (350x250)
│       └── mod.rs
├── templates/                  # Plantillas HTML adaptadas a Tera
├── static/                     # CSS, JavaScript, temas e iconos
├── distribucion/               # Inno Setup (.iss) y lanzador para Linux (.desktop)
└── .github/workflows/          # CI automático (test + clippy + fmt) y Release al crear tag
```

---

## 🛠️ Instalación y Uso

### 1. Descarga para Windows
Puedes descargar directamente el instalador o el ejecutable portable desde la carpeta `dist/` o desde los [Releases](https://github.com/NioyDev/NetDrop-Rust/releases):
- **Instalador:** `NetDropRS-Setup.exe` (asistente de instalación Inno Setup con accesos directos).
- **Portable:** `NetDropRS.exe` (ejecutar directamente sin instalación).

### 2. Compilar desde el código fuente

Requisitos: [Rust y Cargo](https://rustup.rs) (versión 1.80+ recomendada).

```bash
# Clonar el repositorio
git clone https://github.com/NioyDev/NetDrop-Rust.git
cd NetDrop-Rust

# Ejecutar en modo desarrollo
cargo run

# Compilar binario de producción optimizado (LTO, strip)
cargo build --release --features tls,desktop
```

El binario resultante se encontrará en `target/release/netdrop.exe` (o `NetDropRS.exe`).

---

## 🧪 Pruebas Automatizadas y Calidad

El proyecto cuenta con una cobertura completa de pruebas unitarias y de integración que validan:
- Sanitización estricta contra ataques de Path Traversal (`../`, `..\\`).
- Formato exacto de tamaños legibles (`B`, `KB`, `MB`, `GB`, `TB`).
- Validación de extensiones permitidas y archivos sin extensión.
- Creación segura de carpetas en `%LOCALAPPDATA%\NetDrop`.
- Compilación y renderizado de todas las plantillas Tera.
- Comportamiento de endpoints (`GET /`, `GET /update`, `POST /api/app-settings`, `GET /api/sync-status`, etc.).
- Cabeceras HTTP de caché (`Cache-Control: public, max-age=31536000, immutable` para estáticos y `no-cache, must-revalidate` para APIs).

Para ejecutar las pruebas:
```bash
cargo test --lib
```

Verificación de formato y linter:
```bash
cargo fmt --check
cargo clippy -- -D warnings
```

---

## 📋 Estado de la Migración

- [x] Arquitectura de módulos idéntica en Rust (`src/rutas`, `src/funciones`, `src/lanzador`)
- [x] Contrato HTTP y endpoints 100% compatibles con el frontend original
- [x] Subida tradicional y streaming por chunks con ensamblado atómico
- [x] Motor de plantillas Tera con assets embebidos en el binario (`rust-embed`)
- [x] Generación de QR con logotipo centrado
- [x] Detección de instancia única en puerto 5000
- [x] Ventana de escritorio nativa (`wry`/`tao`) y modo segundo plano
- [x] Soporte TLS / HTTPS opcional mediante certificados locales
- [x] Suite de pruebas unitarias y de integración (14 tests pasando)
- [x] Empaquetado para Windows (Portable `.exe` e instalador Inno Setup)
- [x] Integración continua con GitHub Actions

> **Nota sobre la "Función de desbloqueo de archivos":**
> La documentación histórica del proyecto original mencionaba una función de desbloqueo de archivos para Windows. Tras una auditoría exhaustiva del código fuente en Python, se constató que dicha función nunca existió en código ejecutable. Para más detalles, consulta [MIGRACION.md](MIGRACION.md).

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **PolyForm Noncommercial 1.0.0**.
Para más detalles, consulta [LICENSE.txt](LICENSE.txt).
