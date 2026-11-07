# Política de seguridad

## Modelo de seguridad

NetDrop-Rust está pensado para usarse **únicamente en redes locales de confianza**
(tu casa, tu oficina). No está diseñado para exponerse a internet.

- No envía datos a servidores externos.
- Los archivos se guardan en tu computadora y solo son accesibles desde tu red local.
- Mientras no esté implementado el acceso con PIN, cualquier dispositivo con acceso
  a tu red puede llegar a la aplicación. Úsala solo en redes que controles.

## Versiones con soporte

Este proyecto está en desarrollo temprano. Solo recibe correcciones de seguridad
la **última versión publicada**.

| Versión | Soporte |
|---|---|
| Última versión (`main` y última release) | ✅ |
| Versiones anteriores | ❌ |

## Cómo reportar una vulnerabilidad

**Por favor, no abras un issue público** para reportar una vulnerabilidad.

1. Ve a la pestaña **Security** del repositorio.
2. Pulsa **Report a vulnerability** (reporte privado de GitHub).
3. Describe el problema con el mayor detalle posible.

Incluye, si puedes:
- Qué versión usas y en qué sistema operativo.
- Pasos para reproducirlo.
- Qué impacto crees que tiene.
- Una propuesta de solución, si la tienes.

## Qué puedes esperar

Este es un proyecto personal mantenido por una sola persona, así que los plazos
son de mejor esfuerzo:

- Intentaré confirmar la recepción del reporte en pocos días.
- Te mantendré informado de si se confirma el problema y cómo se resolverá.
- Cuando haya una corrección, se publicará una nueva versión y se mencionará en el
  [CHANGELOG](CHANGELOG.md). Si lo deseas, te daré el crédito por el hallazgo.

## Qué se considera una vulnerabilidad

Ejemplos que me interesa conocer:
- Acceder, modificar o borrar archivos fuera de la carpeta de subidas
  (por ejemplo, mediante nombres de archivo manipulados).
- Ejecutar código o comandos en el equipo anfitrión.
- Saltarse el límite de tamaño o las restricciones de extensión.
- Acceder a la aplicación saltándose el PIN, cuando exista.
- Fugas de datos hacia fuera de la red local.

Fuera de alcance:
- Que la aplicación no tenga autenticación mientras esa función no exista.
- Ataques que requieran acceso físico o control previo del equipo.
- Problemas causados por exponer la aplicación a internet contra lo recomendado.
- Vulnerabilidades en dependencias ya conocidas y sin parche disponible
  (revisa también el repositorio original de cada una).

## Buenas prácticas para usuarios

- Úsala solo en redes Wi-Fi que controles; evita redes públicas o de invitados.
- No abras el puerto en tu router hacia internet.
- Cierra la aplicación cuando no la estés usando.
- Mantén NetDrop-Rust actualizada.