# NetDrop-Rust

Reescritura en Rust de [NetDrop](https://github.com/NioyDev/NetDrop), una
aplicación web local para compartir archivos dentro de la misma red.

Ejecútala en tu computadora y accede desde tu celular escaneando un código QR.
Desde el navegador puedes subir, ver, descargar y eliminar archivos
(imágenes, sonidos y documentos).

> 🚧 Proyecto en desarrollo. Este repositorio nació como una forma de aprender
> Rust migrando una aplicación real, y avanza por etapas.

## Funciones

- Subida de archivos desde el navegador
- Listado, descarga y eliminación de archivos compartidos
- Código QR para abrir la página rápido desde el móvil
- Funciona en red local, sin internet ni cuentas

## Tecnologías

- Backend: Rust, Axum, Tokio
- Plantillas: Tera
- QR: crate `qrcode`

## Estado de la migración

- [ ] Servidor básico
- [ ] Listar, descargar y eliminar archivos
- [ ] Plantillas y archivos estáticos
- [ ] Subida de archivos (simple y por chunks)
- [ ] Generación de QR e IP local
- [ ] Ajustes y tema
- [ ] HTTPS
- [ ] Empaquetado para Linux y Windows
