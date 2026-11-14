use crate::funciones::ip::sacar_ip;
use std::path::Path;

// Equivale a abrir_navegador de abrirNavegador.py
pub fn abrir_navegador() {
    let ip = sacar_ip();
    let es_https = Path::new("cert.crt").exists() && Path::new("cert.key").exists();
    let protocolo = if es_https { "https" } else { "http" };
    let url = format!("{protocolo}://{ip}:5000/");
    let _ = open::that(url);
}
