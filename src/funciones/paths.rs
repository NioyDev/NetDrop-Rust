use std::path::PathBuf;

pub const APP_NAME: &str = "NetDrop";

// Equivale a project_root de paths.py
pub fn project_root() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            return parent.to_path_buf();
        }
    }
    PathBuf::from(".")
}

// Equivale a resource_root de paths.py
pub fn resource_root() -> PathBuf {
    project_root()
}

// Equivale a data_root de paths.py
pub fn data_root() -> PathBuf {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local_app_data).join(APP_NAME)
    } else {
        let home = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(APP_NAME)
    }
}

// Equivale a upload_dir de paths.py
pub fn upload_dir() -> PathBuf {
    data_root().join("File")
}

// Equivale a qr_dir de paths.py
pub fn qr_dir() -> PathBuf {
    data_root().join("QR")
}

// Equivale a static_dir de paths.py
pub fn static_dir() -> PathBuf {
    resource_root().join("static")
}

// Equivale a templates_dir de paths.py
pub fn templates_dir() -> PathBuf {
    resource_root().join("templates")
}

// Equivale a logo_path de paths.py
pub fn logo_path() -> PathBuf {
    static_dir().join("Logo").join("icono.png")
}

// Equivale a qr_path de paths.py
pub fn qr_path() -> PathBuf {
    qr_dir().join("Qr.png")
}

// Equivale a ensure_runtime_dirs de paths.py
pub fn ensure_runtime_dirs() -> std::io::Result<(PathBuf, PathBuf)> {
    let u_dir = upload_dir();
    let q_dir = qr_dir();
    let p_dir = partials_dir();

    std::fs::create_dir_all(&u_dir)?;
    std::fs::create_dir_all(&q_dir)?;
    std::fs::create_dir_all(&p_dir)?;

    Ok((u_dir, q_dir))
}

/// Carpeta temporal de subidas parciales por chunks: <upload_dir>/.partials
pub fn partials_dir() -> PathBuf {
    upload_dir().join(".partials")
}

/// Ruta del archivo de configuración de la app: <upload_dir>/.app_settings.json
pub fn settings_file_path() -> PathBuf {
    upload_dir().join(".app_settings.json")
}

/// Ruta del archivo de tema activo: <upload_dir>/.active_theme.json
pub fn theme_file_path() -> PathBuf {
    upload_dir().join(".active_theme.json")
}
