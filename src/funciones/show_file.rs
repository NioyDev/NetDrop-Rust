use chrono::{DateTime, Local};
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use serde::{Deserialize, Serialize};
use std::fs;
use std::time::SystemTime;

use crate::funciones::paths::upload_dir;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ArchivoInfo {
    pub nombre: String,
    pub ruta: String,
    pub tipo: String,
    pub fecha: String,
    pub tamano_bytes: u64,
    pub tamano_legible: String,
}

// Equivale a formatear_tamano de Show_File.py
pub fn formatear_tamano(mut tamano: f64) -> String {
    let unidades = ["B", "KB", "MB", "GB", "TB"];
    for unidad in unidades {
        if tamano < 1024.0 {
            let s = format!("{tamano:.1} {unidad}");
            return s.replace(".0 ", " ");
        }
        tamano /= 1024.0;
    }
    let s = format!("{tamano:.1} PB");
    s.replace(".0 ", " ")
}

// Equivale a Show_File de Show_File.py
pub fn show_file() -> Vec<ArchivoInfo> {
    let ruta = upload_dir();
    let mut archivos = Vec::new();

    let entries = match fs::read_dir(&ruta) {
        Ok(read_dir) => read_dir,
        Err(_) => return archivos,
    };

    let mut items = Vec::new();
    for entry in entries.flatten() {
        let nombre = entry.file_name().to_string_lossy().to_string();
        // Ignorar archivos que empiezan por '.' (.partials, .active_theme.json, .app_settings.json)
        if nombre.starts_with('.') {
            continue;
        }

        let path = entry.path();
        if path.is_file() {
            if let Ok(metadata) = entry.metadata() {
                let mtime = metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH);
                items.push((nombre, metadata.len(), mtime));
            }
        }
    }

    // Ordenar por fecha de modificación descendente (el más reciente primero)
    items.sort_by_key(|a| std::cmp::Reverse(a.2));

    for (nombre, tamano_bytes, mtime) in items {
        let dt: DateTime<Local> = mtime.into();
        let fecha_legible = dt.format("%d/%m/%Y %H:%M").to_string();
        let tamano_legible = formatear_tamano(tamano_bytes as f64);

        // Extensión en minúsculas sin punto, o cadena vacía si no tiene punto
        let tipo = if let Some(ext) = nombre.rsplit('.').next() {
            if nombre.contains('.') {
                ext.to_lowercase()
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        // Codificación URL del nombre para la ruta /archivo/<encoded>
        let encoded_nombre = utf8_percent_encode(&nombre, NON_ALPHANUMERIC).to_string();
        let ruta_archivo = format!("/archivo/{encoded_nombre}");

        archivos.push(ArchivoInfo {
            nombre,
            ruta: ruta_archivo,
            tipo,
            fecha: fecha_legible,
            tamano_bytes,
            tamano_legible,
        });
    }

    archivos
}
