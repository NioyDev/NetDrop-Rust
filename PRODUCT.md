# Product: NetDrop-Rust

<!-- impeccable:product-schema 1 -->

## Platform

Web local + Aplicación de escritorio nativa (Windows, Linux, macOS).

## Users

Usuarios en red local (hogar, oficina, grupos de trabajo) que necesitan enviar y recibir archivos de forma rápida, privada y segura entre la computadora principal y cualquier otro dispositivo conectado (móviles, tablets, otras laptops) sin depender de internet ni de software de terceros en los clientes.

## Product Purpose

Servidor web local y aplicación de escritorio ultraligera escrita en Rust que facilita la transferencia de archivos en tiempo real mediante un navegador web, ofreciendo código QR de escaneo rápido y gestión directa (subir, ver, descargar, eliminar) en un único binario nativo de menos de 20 MB y con ~10 MB de consumo de RAM.

## Positioning

Solución de transferencia local en un clic, ultrarrápida, de bajo consumo y sin telemetría, que no requiere servidores externos ni instalación de aplicaciones en los dispositivos receptores.

## Operating Context

Entorno de red local (Wi-Fi / LAN), ejecutado en `http://0.0.0.0:5000` (o `https://0.0.0.0:5000` con certificados TLS locales). Acceso desde dispositivos móviles o exploradores secundarios.

## Capabilities and Constraints

- Subida multi-archivo y streaming de subida por bloques (`/upload-chunk`) para archivos grandes (hasta 1000 MB) sin saturar la memoria RAM.
- Generación automática de código QR con la IP local y logo centrado para fácil vinculación con móviles.
- Visualización previa en línea (inline con soporte de Range HTTP para seeking de video y audio), descarga y eliminación segura contra ataques de path traversal.
- Almacenamiento seguro aislado en la carpeta de datos del usuario (`%LOCALAPPDATA%\NetDrop` o `~/.local/share/NetDrop`).
- Backend asíncrono de alto rendimiento con Tokio y Axum, motor de plantillas Tera con assets estáticos embebidos en el binario compilado (`rust-embed`).
- Ventana de escritorio nativa (850x650) con soporte para modo segundo plano (`background_mode`) y lanzador opcional.

## Brand Commitments

- Nombre: NetDrop-Rust
- Autor: Nioy
- Enfoque: Rendimiento extremo, consumo mínimo de recursos, privacidad local estricta e interfaz editorial limpia y funcional.

## Evidence on Hand

- Código backend y router en `src/app.rs` y `src/main.rs`.
- Módulos auxiliares 1 a 1 en `src/funciones/`.
- Plantillas Tera e interfaz CSS/JS en `templates/` y `static/`.
- Repositorio y documentación en `README.md`, `MIGRACION.md` y `MAPA_PYTHON_RUST.md`.

## Product Principles

1. **Privacidad y Eficiencia Local:** Cero dependencia de servicios en la nube, memoria RAM reducida en un 85% frente a Python.
2. **Acceso Inmediato:** Escaneo QR o IP directa sin registro ni configuración pesada.
3. **Simplicidad y Robustez:** Binario único autocontenido, arranque en menos de 25 ms y tolerancia a fallos.
