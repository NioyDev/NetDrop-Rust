# Mapa 1 a 1: Python/Flask -> Rust (NetDrop)

Este documento registra la equivalencia exacta de cada archivo, función y estructura entre el proyecto original en Python (`https://github.com/NioyDev/NetDrop`) y su reescritura en Rust (`NetDrop-Rust`), cumpliendo con la regla de oro: **mismos nombres en snake_case, misma ubicación lógica y misma responsabilidad**.

---

## 1. Mapeo de Archivos

| Archivo Original (Python) | Archivo Equivalente (Rust) | Rol y Responsabilidad |
|---|---|---|
| `app.py` (__main__) | `src/main.rs` | Bloque principal, detección de instancia única, arranque de servidor y ventana |
| `app.py` (resto) | `src/app.rs` | Router Axum, estado global, middleware de caché, plantillas Tera y manejadores de endpoints |
| `Funciones/paths.py` | `src/funciones/paths.rs` | Resolución de rutas de datos, estáticos, subidas y directorios de ejecución |
| `Funciones/Show_File.py` | `src/funciones/show_file.rs` | Formateo legible de tamaños y listado ordenado de archivos |
| `Funciones/close.py` | `src/funciones/close.rs` | Detección de puerto 5000 para instancia única |
| `Funciones/ip.py` | `src/funciones/ip.rs` | Detección de IP local vía socket UDP hacia 8.8.8.8:80 |
| `Funciones/abrirNavegador.py` | `src/funciones/abrir_navegador.rs` | Apertura de URL en el navegador nativo |
| `Funciones/Qr_Generator.py` | `src/funciones/qr_generator.rs` | Generación del código QR con logo central |
| `Funciones/configuracion.py` | `src/funciones/configuracion.rs` | Extensiones permitidas (`ALLOWED_EXTENSIONS`), límite de 1000 MB y sanitización |
| `Lanzador/main.py` | `src/lanzador/main.rs` | Clase `MiApp` y función `iniciador` para la mini ventana lanzadora |
| `Lanzador/estilos.qss` | `src/lanzador/main.rs` | Estilos visuales del lanzador (fondo `#FAF8F5`, botones con `#C85A32`) |
| `templates/*.html` | `templates/*.html` | Plantillas HTML adaptadas a sintaxis Tera con funciones equivalentes (`url_for`) |
| `static/*` | `static/*` | Archivos estáticos (CSS, JS, logos, iconos, temas) embebidos con `rust-embed` |
| `distribucion/NetDrop-Setup.iss` | `distribucion/NetDrop-Setup.iss` | Script de Inno Setup adaptado para el binario Rust |
| `netdrop-installer/DEBIAN/control` | `netdrop-installer/DEBIAN/control` | Metadatos para empaquetado `.deb` |

---

## 2. Mapeo Exhaustivo de Funciones

### `Funciones/paths.py` -> `src/funciones/paths.rs`

| Función Python | Función Rust | Comentario Obligatorio en Código |
|---|---|---|
| `project_root()` | `pub fn project_root() -> PathBuf` | `// Equivale a project_root de paths.py` |
| `resource_root()` | `pub fn resource_root() -> PathBuf` | `// Equivale a resource_root de paths.py` |
| `data_root()` | `pub fn data_root() -> PathBuf` | `// Equivale a data_root de paths.py` |
| `upload_dir()` | `pub fn upload_dir() -> PathBuf` | `// Equivale a upload_dir de paths.py` |
| `qr_dir()` | `pub fn qr_dir() -> PathBuf` | `// Equivale a qr_dir de paths.py` |
| `static_dir()` | `pub fn static_dir() -> PathBuf` | `// Equivale a static_dir de paths.py` |
| `templates_dir()` | `pub fn templates_dir() -> PathBuf` | `// Equivale a templates_dir de paths.py` |
| `logo_path()` | `pub fn logo_path() -> PathBuf` | `// Equivale a logo_path de paths.py` |
| `qr_path()` | `pub fn qr_path() -> PathBuf` | `// Equivale a qr_path de paths.py` |
| `ensure_runtime_dirs()` | `pub fn ensure_runtime_dirs() -> std::io::Result<(PathBuf, PathBuf)>` | `// Equivale a ensure_runtime_dirs de paths.py` |

---

### `Funciones/Show_File.py` -> `src/funciones/show_file.rs`

| Función Python | Función Rust | Comentario Obligatorio en Código |
|---|---|---|
| `formatear_tamano(tamano)` | `pub fn formatear_tamano(mut tamano: f64) -> String` | `// Equivale a formatear_tamano de Show_File.py` |
| `Show_File()` | `pub fn show_file() -> Vec<ArchivoInfo>` | `// Equivale a Show_File de Show_File.py` |

---

### `Funciones/close.py` -> `src/funciones/close.rs`

| Función Python | Función Rust | Comentario Obligatorio en Código |
|---|---|---|
| `esta_cerrado()` | `pub fn esta_cerrado() -> bool` | `// Equivale a esta_cerrado de close.py` |

---

### `Funciones/ip.py` -> `src/funciones/ip.rs`

| Función Python | Función Rust | Comentario Obligatorio en Código |
|---|---|---|
| `sacar_ip()` | `pub fn sacar_ip() -> String` | `// Equivale a sacar_ip de ip.py` |

---

### `Funciones/abrirNavegador.py` -> `src/funciones/abrir_navegador.rs`

| Función Python | Función Rust | Comentario Obligatorio en Código |
|---|---|---|
| `abrir_navegador()` | `pub fn abrir_navegador()` | `// Equivale a abrir_navegador de abrirNavegador.py` |

---

### `Funciones/Qr_Generator.py` -> `src/funciones/qr_generator.rs`

| Función Python | Función Rust | Comentario Obligatorio en Código |
|---|---|---|
| `Generar_QR()` | `pub fn generar_qr() -> Result<(), Box<dyn std::error::Error + Send + Sync>>` | `// Equivale a Generar_QR de Qr_Generator.py` |

---

### `Funciones/configuracion.py` -> `src/funciones/configuracion.rs`

| Elemento Python | Elemento Rust | Comentario Obligatorio en Código |
|---|---|---|
| `DOCUMENTS` | `pub static DOCUMENTS: LazyLock<HashSet<&'static str>>` | `// Constante DOCUMENTS de configuracion.py` |
| `SPREADSHEETS_PRESENTATIONS` | `pub static SPREADSHEETS_PRESENTATIONS: LazyLock<HashSet<&'static str>>` | `// Constante SPREADSHEETS_PRESENTATIONS de configuracion.py` |
| `IMAGES` | `pub static IMAGES: LazyLock<HashSet<&'static str>>` | `// Constante IMAGES de configuracion.py` |
| `AUDIO` | `pub static AUDIO: LazyLock<HashSet<&'static str>>` | `// Constante AUDIO de configuracion.py` |
| `VIDEO` | `pub static VIDEO: LazyLock<HashSet<&'static str>>` | `// Constante VIDEO de configuracion.py` |
| `SUBTITLES` | `pub static SUBTITLES: LazyLock<HashSet<&'static str>>` | `// Constante SUBTITLES de configuracion.py` |
| `ARCHIVES` | `pub static ARCHIVES: LazyLock<HashSet<&'static str>>` | `// Constante ARCHIVES de configuracion.py` |
| `CODE` | `pub static CODE: LazyLock<HashSet<&'static str>>` | `// Constante CODE de configuracion.py` |
| `DATA_CONFIG` | `pub static DATA_CONFIG: LazyLock<HashSet<&'static str>>` | `// Constante DATA_CONFIG de configuracion.py` |
| `FONTS` | `pub static FONTS: LazyLock<HashSet<&'static str>>` | `// Constante FONTS de configuracion.py` |
| `MODELS_3D_CAD` | `pub static MODELS_3D_CAD: LazyLock<HashSet<&'static str>>` | `// Constante MODELS_3D_CAD de configuracion.py` |
| `MISC` | `pub static MISC: LazyLock<HashSet<&'static str>>` | `// Constante MISC de configuracion.py` |
| `RISKY` | `pub static RISKY: LazyLock<HashSet<&'static str>>` | `// Constante RISKY de configuracion.py` |
| `ALLOWED_EXTENSIONS` | `pub static ALLOWED_EXTENSIONS: LazyLock<HashSet<&'static str>>` | `// Constante ALLOWED_EXTENSIONS de configuracion.py` |
| `MAX_FILE_SIZE` | `pub const MAX_FILE_SIZE: u64 = 1000 * 1024 * 1024;` | `// Constante MAX_FILE_SIZE de configuracion.py` |

---

### `app.py` -> `src/app.rs` y `src/main.rs`

| Función Python en `app.py` | Archivo y Función en Rust | Comentario Obligatorio en Código |
|---|---|---|
| `add_cache_headers(response)` | `src/app.rs::add_cache_headers` | `// Equivale a add_cache_headers de app.py` |
| `allowed_file(filename)` | `src/app.rs::allowed_file` | `// Equivale a allowed_file de app.py` |
| `guardar_archivo_subido(file)` | `src/app.rs::guardar_archivo_subido` | `// Equivale a guardar_archivo_subido de app.py` |
| `cert_paths()` | `src/app.rs::cert_paths` | `// Equivale a cert_paths de app.py` |
| `es_https()` | `src/app.rs::es_https` | `// Equivale a es_https de app.py` |
| `index()` | `src/app.rs::index` | `// Equivale a index de app.py` |
| `settings()` | `src/app.rs::settings` | `// Equivale a settings de app.py` |
| `sync_status()` | `src/app.rs::sync_status` | `// Equivale a sync_status de app.py` |
| `get_app_settings()` | `src/app.rs::get_app_settings` | `// Equivale a get_app_settings de app.py` |
| `save_app_settings(settings)` | `src/app.rs::save_app_settings` | `// Equivale a save_app_settings de app.py` |
| `api_app_settings()` (GET/POST) | `src/app.rs::api_app_settings_get` / `api_app_settings_post` | `// Equivale a api_app_settings de app.py` |
| `api_theme()` (GET/POST) | `src/app.rs::api_theme_get` / `api_theme_post` | `// Equivale a api_theme de app.py` |
| `archivo_demasiado_grande(e)` | `src/app.rs::archivo_demasiado_grande` | `// Equivale a archivo_demasiado_grande de app.py` |
| `upload()` | `src/app.rs::upload` | `// Equivale a upload de app.py` |
| `upload_chunk()` | `src/app.rs::upload_chunk` | `// Equivale a upload_chunk de app.py` |
| `archivo(ruta)` | `src/app.rs::archivo` | `// Equivale a archivo de app.py` |
| `descarga(nombre)` | `src/app.rs::descarga` | `// Equivale a descarga de app.py` |
| `eliminar(nombre)` | `src/app.rs::eliminar` | `// Equivale a eliminar de app.py` |
| `update()` | `src/app.rs::update` | `// Equivale a update de app.py` |
| `QR_Generador_Vista()` | `src/app.rs::qr_generador_vista` | `// Equivale a QR_Generador_Vista de app.py` |
| `qr_image()` | `src/app.rs::qr_image` | `// Equivale a qr_image de app.py` |
| `qr()` | `src/app.rs::qr` | `// Equivale a qr de app.py` |
| `ejecutar_servidor()` | `src/main.rs::ejecutar_servidor` | `// Equivale a ejecutar_servidor de app.py` |
| `arrancar_webview()` (con `on_window_closed`) | `src/main.rs::arrancar_webview` | `// Equivale a arrancar_webview de app.py` |
| `if __name__ == '__main__':` | `src/main.rs::main` | `// Equivale a __main__ de app.py` |

---

### `Lanzador/main.py` -> `src/lanzador/main.rs`

| Elemento Python | Elemento Rust | Comentario Obligatorio en Código |
|---|---|---|
| `class MiApp(QMainWindow)` | `pub struct MiApp` | `// Equivale a clase MiApp de Lanzador/main.py` |
| `MiApp.__init__()` | `pub fn MiApp::new() -> Self` | `// Equivale a __init__ de MiApp en Lanzador/main.py` |
| `MiApp.establecer_icono()` | `pub fn MiApp::establecer_icono(&mut self)` | `// Equivale a establecer_icono de MiApp en Lanzador/main.py` |
| `MiApp.cargar_estilos()` | `pub fn MiApp::cargar_estilos(&self) -> &'static str` | `// Equivale a cargar_estilos de MiApp en Lanzador/main.py` |
| `Iniciador()` | `pub fn iniciador()` | `// Equivale a Iniciador de Lanzador/main.py` |

---

## 3. Notas Técnicas y Justificaciones

1. **Sustitución de PyInstaller y requirements.txt**:
   - `requirements.txt` se sustituye íntegramente por `Cargo.toml`.
   - Los archivos `.spec` de PyInstaller se sustituyen por el enlazado estático nativo de Cargo y la macro `rust-embed`, que incrusta las plantillas HTML y los recursos estáticos directamente en el binario final sin necesidad de carpetas externas ni desempaquetado en `/tmp`.
2. **Directorio `target/` fuera de OneDrive**:
   - Se configuró `target-dir = "C:/Users/migue/.cargo-target/netdrop-rust"` en `.cargo/config.toml` para evitar contención de bloqueos de archivo y desbordamientos de sincronización en OneDrive.
3. **Manejo del límite de memoria en compilación (MinGW GCC 16 / 8 GB RAM)**:
   - Configuración en `.cargo/config.toml` de `jobs = 1` y `RUST_MIN_STACK = "16777216"`, permitiendo compilaciones libres de fallos OOM.
4. **Comentarios de Paridad**:
   - Todas las funciones implementadas cuentan con su encabezado de paridad formal `// Equivale a <función> de <archivo>.py`.
