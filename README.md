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

## 🚀 Comparativa de Rendimiento Medida: Python vs. Rust

| Métrica | NetDrop (Python + Flask) | NetDrop-Rust (Rust + Axum) | Mejora Verificada |
|---|---|---|---|
| **Consumo de RAM en reposo** | 36.3 MB (sin GUI) / ~75 MB (con GUI) | **5.2 MB** | **~86% menos memoria** |
| **Tiempo de transferencia (subida 20 MB)** | 0.231 s (692.6 Mbps) | **0.115 s (1391.3 Mbps)** | **2x más rápido (el doble de ancho de banda)** |
| **Tamaño del instalador (Setup.exe)** | ~45 – 70 MB (PyInstaller) | **10.2 MB** (Inno Setup) | **~75% menor tamaño** |
| **Paquete portable comprimido (ZIP)** | ~55 MB | **11.0 MB** | **~80% menor tamaño** |
| **Subida de archivos grandes (hasta 1000 MB)** | Buffer intermedio en RAM | **Streaming directo a disco (`.part`)** | Cero desbordamiento de RAM |
| **Descarga de archivos (HTTP)** | Síncrona, streaming básico | **ReaderStream asíncrono + HTTP Range** | Soporte nativo de seeking y reanudación |
| **Detección de puerto / Single-Instance** | Verificación por socket lenta | **Detección instantánea (timeout 1s)** | Reenvío inmediato al navegador existente |

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

## 📂 Arquitectura del Proyecto (1 a 1 con Python)

```text
NetDrop-Rust/
├── Cargo.toml                       # Dependencias Axum, perfiles LTO y metadatos deb
├── src/
│   ├── main.rs                      # Equivale al bloque __main__ de app.py, ejecutar_servidor y arrancar_webview
│   ├── app.rs                       # Equivale a las rutas, plantillas y lógica de servidor de app.py
│   ├── lib.rs                       # Exportación modular y suite completa de pruebas unitarias
│   ├── funciones/                   # Módulos idénticos a Funciones/ de Python
│   │   ├── configuracion.rs         # configuracion.py (constantes y ALLOWED_EXTENSIONS)
│   │   ├── paths.rs                 # paths.py (10 funciones idénticas)
│   │   ├── show_file.rs             # Show_File.py (formatear_tamano y show_file)
│   │   ├── ip.rs                    # ip.py (sacar_ip con socket UDP)
│   │   ├── qr_generator.rs          # Qr_Generator.py (generar_qr con logo superpuesto)
│   │   ├── close.rs                 # close.py (esta_cerrado con timeout de 1s)
│   │   └── abrir_navegador.rs       # abrirNavegador.py (abrir_navegador)
│   └── lanzador/                    # Lanzador/ de Python
│       └── main.rs                  # main.py (clase MiApp con new, establecer_icono, cargar_estilos, e iniciador)
├── templates/                       # Plantillas Jinja2 adaptadas a Tera (misma estructura)
├── static/                          # CSS, JavaScript, temas e iconos (copiados idénticos)
├── tests/
│   └── paridad_test.py              # Suite de pruebas automatizadas de paridad HTTP Python vs. Rust
├── distribucion/                    # Inno Setup (.iss) y lanzador para Linux (.desktop)
├── netdrop-installer/DEBIAN/        # Archivo de control para empaquetado Debian/Ubuntu
├── MAPA_PYTHON_RUST.md              # Tabla detallada 1 a 1 de archivos y funciones
├── MIGRACION.md                     # Bitácora y documentación exhaustiva de la migración
├── PRODUCT.md                       # Especificación técnica del producto
├── RELEASE_NOTES.md                 # Notas de versión
└── .github/workflows/               # CI automático (ci.yml) y Release automatizado (release.yml)
```

---

## 🛠️ Instalación y Uso

### 1. Descarga de Paquetes Oficiales (Releases)
Puedes descargar directamente los artefactos oficiales desde los [Releases de GitHub](https://github.com/NioyDev/NetDrop-Rust/releases):
- **Windows (Instalador):** `NetDrop-Rust-Setup.exe` (asistente de instalación Inno Setup con acceso directo y soporte para desinstalación limpia).
- **Windows (Portable):** `NetDrop-Rust-Windows-x64.zip` (archivo comprimido con ejecutable autónomo `netdrop.exe`).
- **Linux (Tarball):** `NetDrop-Rust-Linux-x64.tar.gz` (binario compilado con archivo `.desktop` y licencia).
- **Linux (Debian / Ubuntu):** `netdrop-rust_amd64.deb` (paquete nativo instalable con `sudo dpkg -i netdrop-rust_amd64.deb`).

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

- [x] Arquitectura de módulos y funciones 1 a 1 en Rust (`src/app.rs`, `src/funciones/`, `src/lanzador/`)
- [x] Contrato HTTP y endpoints 100% idénticos con paridad verificada contra Python (`tests/paridad_test.py`)
- [x] Subida tradicional y streaming por chunks con ensamblado atómico
- [x] Motor de plantillas Tera con assets embebidos en el binario (`rust-embed`)
- [x] Generación de QR con logotipo centrado
- [x] Detección de instancia única en puerto 5000 con timeout de 1s
- [x] Ventana de escritorio nativa y modo segundo plano
- [x] Soporte TLS / HTTPS opcional mediante certificados locales
- [x] Suite de pruebas unitarias y de integración (14 tests pasando)
- [x] Empaquetado oficial: `NetDrop-Rust-Windows-x64.zip`, `NetDrop-Rust-Setup.exe`, `NetDrop-Rust-Linux-x64.tar.gz`, `netdrop-rust_amd64.deb`
- [x] Integración continua y workflows de release automatizados con GitHub Actions

> **Nota sobre la "Función de desbloqueo de archivos":**
> La documentación histórica del proyecto original mencionaba una función de desbloqueo de archivos para Windows. Tras una auditoría exhaustiva del código fuente en Python, se constató que dicha función nunca existió en código ejecutable. Para más detalles, consulta [MIGRACION.md](MIGRACION.md).

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **PolyForm Noncommercial 1.0.0**.
Para más detalles, consulta [LICENSE](LICENSE) o su versión traducida al español [LICENSE.es.md](LICENSE.es.md).
