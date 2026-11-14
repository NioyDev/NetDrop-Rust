# NetDrop-Rust v0.1.0 - Primera version oficial para Windows

Esta es la primera version oficial de NetDrop-Rust, reescritura completa en Rust (Axum + Tokio) del proyecto original NetDrop. Mantiene exactamente la misma arquitectura y contrato HTTP, ofreciendo un unico binario nativo, arranque inmediato y un consumo de memoria RAM reducido a solo 5.2 MB.

Esta version esta disponible exclusivamente para sistemas Microsoft Windows (x64). El soporte y empaquetado para distribuciones Linux se incluira en una version posterior.

---

## Novedades y caracteristicas incluidas

- Servidor web local asincrono de alto rendimiento basado en Tokio y Axum.
- Unico archivo ejecutable autocontenido: plantillas HTML (motor Tera) y recursos estaticos (CSS, JS, iconos y temas) compilados directamente dentro del binario.
- Streaming de subida y soporte de subida fragmentada por bloques (/upload-chunk) para archivos de hasta 1000 MB sin desbordamiento de memoria RAM.
- Visualizacion inline y descargas optimizadas con soporte completo de encabezados HTTP Range (reproduccion de video y audio con avance y retroceso).
- Generador de codigo QR local con deteccion automatica de la IP de red local e isotipo superpuesto en el centro.
- Proteccion estricta contra ataques de Directory Traversal en todas las operaciones de archivos.
- Deteccion de instancia unica en el puerto 5000 con tiempo de espera de 1 segundo para evitar colisiones.
- Soporte opcional para cifrado TLS / HTTPS local mediante certificados cert.crt y cert.key.

---

## Requisitos del sistema

- Sistema operativo: Microsoft Windows 10 o Windows 11 (64 bits).
- Red: Conexion a red local (Wi-Fi o cable Ethernet) compartida con los dispositivos clientes.
- Navegador web: Cualquier navegador moderno (Chrome, Edge, Firefox, Safari) en los dispositivos que se conecten al servidor.
- No requiere la instalacion de Python ni dependencias externas.

---

## Instrucciones de instalacion y uso

Se proporcionan dos alternativas de distribucion:

1. Instalador para Windows (NetDrop-Rust-Setup.exe):
   - Descargue y ejecute el instalador.
   - Siga el asistente de instalacion. No requiere privilegios de administrador y permite crear accesos directos en el Escritorio y Menu Inicio.
   - Incluye desinstalador automatico desde la configuracion de Windows.

2. Version Portable (NetDrop-Rust-Windows-x64.zip):
   - Descargue el archivo ZIP y descomprimalo en la carpeta de su preferencia.
   - Ejecute directamente netdrop.exe.
   - No requiere instalacion ni modifica el registro del sistema.

---

## Aviso sobre Windows Defender SmartScreen

Dado que los archivos ejecutables son de distribucion comunitaria de codigo abierto y no cuentan con un certificado digital comercial de pago (firma digital con costo anual):

- Es posible que Windows SmartScreen muestre una ventana azul con el mensaje "Windows protegio su PC".
- Para ejecutar la aplicacion de manera normal:
  1. Haga clic en el enlace "Mas informacion".
  2. Haga clic en el boton "Ejecutar de todas formas".
- Los archivos han sido analizados exhaustivamente con Microsoft Defender y verificados al 100% libres de malware o amenazas.

---

## Sumas de verificacion SHA-256

Verifique la integridad de los archivos descargados comprobando su hash SHA-256:

- NetDrop-Rust-Setup.exe:
  6f3f94eb0fbf03b938af39aac81a38898d9299852fcfd639895c33efbca88342

- NetDrop-Rust-Windows-x64.zip:
  010415d707fd9241cb2559b1b1635eaafa93536b18f708c2bc7accb76b5ffae7
