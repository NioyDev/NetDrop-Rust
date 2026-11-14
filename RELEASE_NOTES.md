# NetDrop-Rust v2.1.2 - Reescritura Nativa en Rust, Streaming Asíncrono y Alto Rendimiento

¡Presentamos **NetDrop-Rust v2.1.2**! La migración completa y definitiva del proyecto original a **Rust**, preservando al 100% el diseño visual, los contratos HTTP y todas las funcionalidades de la aplicación, multiplicando por 80 su velocidad de arranque y reduciendo en un 85% el consumo de memoria RAM.

---

### 🚀 1. Arquitectura Nativa de Alto Rendimiento
- **Único ejecutable independiente:** Todas las plantillas HTML y recursos estáticos (CSS, JS, logos, iconos, temas) van incrustados directamente dentro del binario compilado (`rust-embed`). No requiere Python, librerías del sistema ni carpetas externas para funcionar.
- **Consumo insignificante de memoria:** Solo ~8 a 14 MB de RAM en reposo (frente a los 65-90 MB de la versión en Python).
- **Arranque ultra instantáneo:** Inicio en menos de 25 milisegundos.

### 🌊 2. Streaming de Subida y Descarga Asíncrona
- **Subida por Chunks (`/upload-chunk`):** Procesamiento de fragmentos directo a disco en `.partials/<id>.part` con ensamblado atómico final, garantizando cero desbordamientos de memoria RAM en archivos de hasta 1000 MB.
- **Descargas optimizadas con Range:** Soporte completo de cabeceras HTTP Range (`206 Partial Content`) para reproducción multimedia en streaming (adelantar o retrasar videos y audios sin descargar el archivo completo).

### 🛡️ 3. Seguridad Reforzada contra Path Traversal
- Sanitización estricta de nombres en todas las operaciones de visualización, descarga y eliminación de archivos (`/archivo/`, `/descarga/`, `/eliminar/`).
- Detección y prevención absoluta de escapes de directorio (`..`, `/`, `\`).

### 📱 4. Código QR con Logotipo Centrado e IP Real
- Generación automática de código QR local superponiendo el isotipo de NetDrop en el centro (escala 1/4).
- Detección precisa de la interfaz de red local mediante socket UDP no bloqueante hacia `8.8.8.8:80`.

### 🖥️ 5. Ventana de Escritorio Nativa y Modo Segundo Plano
- Ventana de escritorio dedicada de 850x650 redimensionable, con soporte completo para la configuración de modo segundo plano (`background_mode`): al cerrar la ventana, el proceso se apaga limpiamente o permanece activo en red según las preferencias del usuario.
- Lanzador opcional independiente (`netdrop-launcher`).

### 🔒 6. Cifrado TLS / HTTPS Local
- Detección automática de `cert.crt` y `cert.key` para habilitar de inmediato servidor seguro HTTPS mediante `rustls` y `axum-server`.

---

### 📦 Artefactos y Distribución Disponibles:
- `NetDrop-Rust-Windows-x64.zip`: Binario portable autocontenido para Windows de 64 bits.
- `NetDrop-Rust-Setup.exe`: Instalador guiado de Windows creado con Inno Setup.
- `NetDrop-Rust-Linux-x64.tar.gz`: Binario portable para distribuciones Linux x86_64.
- `netdrop-rust_amd64.deb`: Paquete instalable para Debian, Ubuntu y derivados.
