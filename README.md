# NetDrop-Rust

[![CI](https://github.com/NioyDev/NetDrop-Rust/actions/workflows/ci.yml/badge.svg)](https://github.com/NioyDev/NetDrop-Rust/actions/workflows/ci.yml)
![Licencia](https://img.shields.io/badge/licencia-PolyForm%20Noncommercial%201.0.0-blue)
![Rust](https://img.shields.io/badge/hecho%20con-Rust-orange?logo=rust)
![Estado](https://img.shields.io/badge/estado-en%20desarrollo-yellow)

**Comparte archivos entre tu PC y tu celular por la red local, escaneando un código QR.**

NetDrop-Rust es la reescritura en Rust de [NetDrop](https://github.com/NioyDev/NetDrop),
una aplicación web local para compartir archivos dentro de la misma red.
Ejecútala en tu computadora y accede desde tu celular escaneando un código QR.
Desde el navegador podrás subir, ver, descargar y eliminar archivos
(imágenes, sonidos y documentos).

> 🚧 **Proyecto en desarrollo.** Este repositorio nació como una forma de aprender
> Rust migrando una aplicación real, y avanza por etapas. Consulta el
> [estado de la migración](#estado-de-la-migración) para saber qué ya funciona.

<!-- Cuando la app funcione, añade aquí un GIF corto: escanear QR → subir archivo → verlo en el celular -->
<!-- ![Demostración](docs/demo.gif) -->

## ¿Cómo funcionará?

1. Ejecutas NetDrop-Rust en tu computadora.
2. La app muestra un código QR con la dirección local (por ejemplo `http://192.168.1.20:5000`).
3. Escaneas el QR con tu celular, conectado a la **misma red Wi-Fi**.
4. Subes, descargas o eliminas archivos desde el navegador del celular o de la PC.

Todo ocurre dentro de tu red. No necesita internet, cuentas ni servidores externos.

## Funciones

### Objetivo de la versión 1.0

- Subida de archivos desde el navegador
- Listado, descarga y eliminación de archivos compartidos
- Código QR para abrir la página rápido desde el celular
- Funcionamiento en red local, sin internet ni cuentas

### Mejoras previstas

- Subida de archivos grandes por partes (chunks)
- Acceso protegido con PIN o token
- Aceptar solo conexiones de redes privadas
- Vista previa de imágenes y reproducción de audio
- Ajustes y tema guardados
- HTTPS opcional
- Binarios para Linux y Windows

## Tecnologías

| Parte | Tecnología |
|---|---|
| Lenguaje | Rust |
| Servidor web | Axum + Tokio |
| Plantillas | Tera |
| QR | crate `qrcode` |

## Requisitos

- Computadora con Windows o Linux
- Celular y computadora en la misma red local
- [Rust](https://rustup.rs) (para compilar desde el código fuente)

## Compilar y ejecutar desde el código fuente

```bash
git clone https://github.com/NioyDev/NetDrop-Rust
cd NetDrop-Rust
cargo run --release
```

> Si no puedes entrar desde el celular, revisa [Problemas comunes](#problemas-comunes).

## Problemas comunes

**No abre desde el celular**

- Comprueba que ambos dispositivos estén en la **misma red Wi-Fi**.
- Permite el puerto `5000` en el firewall.
  - Linux (ufw): `sudo ufw allow 5000/tcp`
  - Windows: acepta el aviso del firewall la primera vez.
- Algunos routers tienen **aislamiento de clientes** (típico en redes de invitados), que impide que los dispositivos se vean entre sí.

**El QR muestra una IP que no es la correcta**

- Puede pasar si tu PC tiene varias conexiones (VPN, Docker, cable y Wi-Fi). Usa la IP de la red a la que está conectado tu celular.

## Seguridad y privacidad

- NetDrop-Rust está pensado para **redes locales de confianza**. No lo expongas a internet.
- Mientras no exista el acceso con PIN (ver [mejoras previstas](#mejoras-previstas)), cualquier dispositivo con acceso a tu red podrá llegar a la aplicación.
- No envía datos a servidores externos.
- El software se ofrece **sin garantía** (ver [LICENSE](LICENSE)).

Para reportar una vulnerabilidad, lee la [política de seguridad](SECURITY.md).

## Estado de la migración

- [ ] Servidor básico
- [ ] Listar, descargar y eliminar archivos
- [ ] Plantillas y archivos estáticos
- [ ] Subida de archivos (simple y por chunks)
- [ ] Generación de QR e IP local
- [ ] Ajustes y tema
- [ ] HTTPS
- [ ] Empaquetado para Linux y Windows

Los cambios de cada versión se anotan en el [CHANGELOG](CHANGELOG.md).

## Licencia

Este proyecto se distribuye como software *source-available* bajo la licencia
**PolyForm Noncommercial 1.0.0**.

- ✅ Uso personal, educativo y de organizaciones sin fines de lucro
- ❌ Uso comercial sin permiso

Si necesitas una licencia comercial, escríbeme a través de mi perfil de GitHub.

- [Texto oficial (inglés)](LICENSE)
- [Traducción al español, no oficial](LICENSE.es.md)

## Autor

Creado por [Nioy](https://github.com/NioyDev).

Si el proyecto te sirve, una ⭐ ayuda a que más gente lo encuentre.