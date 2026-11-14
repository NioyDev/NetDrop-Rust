use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, Rgba};
use qrcode::QrCode;
use tracing::warn;

use crate::funciones::ip::sacar_ip;
use crate::funciones::paths::{ensure_runtime_dirs, qr_path};
use std::path::Path;

// Icono embebido por defecto para asegurar funcionamiento 100% portable y autónomo
const ICONO_EMBEBIDO: &[u8] = include_bytes!("../../static/Logo/icono.png");

// Equivale a Generar_QR de Qr_Generator.py
pub fn generar_qr() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let _ = ensure_runtime_dirs();
    let salida = qr_path();

    let ip = sacar_ip();
    let es_https = Path::new("cert.crt").exists() && Path::new("cert.key").exists();
    let protocolo = if es_https { "https" } else { "http" };
    let url = format!("{protocolo}://{ip}:5000/");

    let qr = QrCode::new(url.as_bytes())?;

    // Generar imagen del QR en memoria (escala para alta nitidez)
    let qr_image = qr
        .render::<Rgba<u8>>()
        .max_dimensions(800, 800)
        .min_dimensions(400, 400)
        .build();

    let mut final_image = DynamicImage::ImageRgba8(qr_image);

    // Intentar superponer el logo en el centro
    match image::load_from_memory(ICONO_EMBEBIDO) {
        Ok(logo) => {
            let (qr_w, qr_h) = final_image.dimensions();
            let logo_size = qr_w / 4;
            let resized_logo = logo.resize_exact(logo_size, logo_size, FilterType::Lanczos3);

            let x = (qr_w - logo_size) / 2;
            let y = (qr_h - logo_size) / 2;

            image::imageops::overlay(&mut final_image, &resized_logo, x as i64, y as i64);
        }
        Err(e) => {
            warn!("Advertencia: No se pudo insertar el logo en el QR: {e}");
        }
    }

    final_image.save(&salida)?;
    Ok(())
}
