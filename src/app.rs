use axum::body::Body;
use axum::extract::{Multipart, Path as AxPath, State};
use axum::http::header::{
    ACCEPT_RANGES, CACHE_CONTROL, CONTENT_DISPOSITION, CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE,
};
use axum::http::{HeaderMap, HeaderValue, Request, Response, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{Html, IntoResponse, Json, Redirect};
use axum::routing::{get, post};
use axum::Router;
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::io::SeekFrom;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::SystemTime;
use tera::Tera;
use tokio::fs::{self, File, OpenOptions};
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt};
use tokio::sync::RwLock;
use tokio_util::io::ReaderStream;
use tower_http::compression::CompressionLayer;
use tower_http::trace::TraceLayer;
use tracing::{error, info};

use crate::funciones::configuracion::{ALLOWED_EXTENSIONS, MAX_FILE_SIZE};
use crate::funciones::ip::sacar_ip;
use crate::funciones::paths::{
    ensure_runtime_dirs, partials_dir, qr_path, settings_file_path, theme_file_path, upload_dir,
};
use crate::funciones::qr_generator::generar_qr;
use crate::funciones::show_file::show_file;

#[derive(RustEmbed)]
#[folder = "static"]
pub struct StaticAssets;

#[derive(RustEmbed)]
#[folder = "templates"]
pub struct TemplateAssets;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default)]
    pub background_mode: bool,
    #[serde(default = "default_true")]
    pub notifications_enabled: bool,
    #[serde(default = "default_true")]
    pub notification_sound: bool,
}

fn default_true() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            background_mode: false,
            notifications_enabled: true,
            notification_sound: true,
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub tera: Arc<Tera>,
    pub settings: Arc<RwLock<AppSettings>>,
    pub theme: Arc<RwLock<Option<Value>>>,
}

// Equivale a add_cache_headers de app.py
pub async fn add_cache_headers(req: Request<Body>, next: Next) -> Response<Body> {
    let path = req.uri().path().to_string();
    let mut response = next.run(req).await;

    if path.starts_with("/static/") {
        response.headers_mut().insert(
            CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=31536000, immutable"),
        );
    } else if path.starts_with("/api/") {
        response.headers_mut().insert(
            CACHE_CONTROL,
            HeaderValue::from_static("no-cache, must-revalidate"),
        );
    }

    response
}

// Equivale a allowed_file de app.py
pub fn allowed_file(filename: &str) -> bool {
    if !filename.contains('.') {
        return true;
    }
    if let Some(ext) = filename.rsplit('.').next() {
        ALLOWED_EXTENSIONS.contains(ext.to_lowercase().as_str())
    } else {
        false
    }
}

// Equivale a guardar_archivo_subido de app.py
pub async fn guardar_archivo_subido(
    file_bytes: &[u8],
    file_path: &Path,
) -> Result<(), std::io::Error> {
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(file_path)
        .await?;
    file.write_all(file_bytes).await?;
    file.flush().await?;
    Ok(())
}

// Equivale a cert_paths de app.py
pub fn cert_paths() -> (PathBuf, PathBuf) {
    let base = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    let cert = base.join("cert.crt");
    let key = base.join("cert.key");
    if cert.exists() && key.exists() {
        (cert, key)
    } else {
        (PathBuf::from("cert.crt"), PathBuf::from("cert.key"))
    }
}

// Equivale a es_https de app.py
pub fn es_https() -> bool {
    let (cert, key) = cert_paths();
    cert.exists() && key.exists()
}

// Equivale a get_app_settings de app.py
pub fn get_app_settings() -> AppSettings {
    let path = settings_file_path();
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
                return settings;
            }
        }
    }
    AppSettings::default()
}

// Equivale a save_app_settings de app.py
pub async fn save_app_settings(settings: &AppSettings) -> Result<(), std::io::Error> {
    let path = settings_file_path();
    save_json_atomic(&path, settings).await
}

// Equivale a index de app.py
pub async fn index(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let files = show_file();
    let ip_local = sacar_ip();
    let protocolo = if es_https() { "https" } else { "http" };

    let mut ctx = tera::Context::new();
    ctx.insert("File", &files);
    ctx.insert("ip_local", &ip_local);
    ctx.insert("protocolo", &protocolo);
    ctx.insert("request", &json!({ "path": "/" }));

    match state.tera.render("index.html", &ctx) {
        Ok(html) => Html(html).into_response(),
        Err(err) => {
            error!("Error renderizando index.html: {err}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error interno del servidor",
            )
                .into_response()
        }
    }
}

// Equivale a settings de app.py
pub async fn settings(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let ip_local = sacar_ip();
    let protocolo = if es_https() { "https" } else { "http" };

    let mut ctx = tera::Context::new();
    ctx.insert("ip_local", &ip_local);
    ctx.insert("protocolo", &protocolo);
    ctx.insert("request", &json!({ "path": "/settings" }));

    match state.tera.render("settings.html", &ctx) {
        Ok(html) => Html(html).into_response(),
        Err(err) => {
            error!("Error renderizando settings.html: {err}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error interno del servidor",
            )
                .into_response()
        }
    }
}

// Equivale a sync_status de app.py
pub async fn sync_status() -> impl IntoResponse {
    let files = show_file();
    let count = files.len();
    let mut latest_mtime = 0.0f64;

    let dir = upload_dir();
    if let Ok(mut entries) = fs::read_dir(&dir).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let filename = entry.file_name().to_string_lossy().to_string();
            if filename.starts_with('.') {
                continue;
            }
            if let Ok(meta) = entry.metadata().await {
                if meta.is_file() {
                    if let Ok(modified) = meta.modified() {
                        if let Ok(dur) = modified.duration_since(SystemTime::UNIX_EPOCH) {
                            let secs = dur.as_secs_f64();
                            if secs > latest_mtime {
                                latest_mtime = secs;
                            }
                        }
                    }
                }
            }
        }
    }

    Json(json!({
        "ok": true,
        "count": count,
        "latest_mtime": latest_mtime
    }))
}

// Equivale a api_app_settings de app.py (GET)
pub async fn api_app_settings_get(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let current = state.settings.read().await.clone();
    Json(json!({
        "ok": true,
        "settings": current
    }))
}

// Equivale a api_app_settings de app.py (POST)
pub async fn api_app_settings_post(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let mut current = state.settings.write().await;

    if let Some(obj) = payload.as_object() {
        if let Some(bg) = obj.get("background_mode").and_then(|v| v.as_bool()) {
            current.background_mode = bg;
        }
        if let Some(notifs) = obj.get("notifications_enabled").and_then(|v| v.as_bool()) {
            current.notifications_enabled = notifs;
        }
        if let Some(sound) = obj.get("notification_sound").and_then(|v| v.as_bool()) {
            current.notification_sound = sound;
        }
    }

    let _ = save_app_settings(&current).await;

    Json(json!({
        "ok": true,
        "settings": *current
    }))
}

// Equivale a api_theme de app.py (GET)
pub async fn api_theme_get(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let current_theme = state.theme.read().await.clone();
    Json(json!({
        "ok": true,
        "theme": current_theme
    }))
}

// Equivale a api_theme de app.py (POST)
pub async fn api_theme_post(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let mut current = state.theme.write().await;
    *current = Some(payload.clone());

    let target_path = theme_file_path();
    let _ = save_json_atomic(&target_path, &payload).await;

    Json(json!({
        "ok": true,
        "theme": payload
    }))
}

// Equivale a archivo_demasiado_grande de app.py
pub fn archivo_demasiado_grande() -> impl IntoResponse {
    (
        StatusCode::PAYLOAD_TOO_LARGE,
        Json(json!({
            "ok": false,
            "error": "El archivo supera el límite permitido"
        })),
    )
}

// Equivale a upload de app.py
pub async fn upload(mut multipart: Multipart) -> impl IntoResponse {
    let _ = ensure_runtime_dirs();
    let destino_dir = upload_dir();

    while let Ok(Some(mut field)) = multipart.next_field().await {
        let field_name = field.name().unwrap_or("").to_string();
        if field_name != "UPFile" {
            continue;
        }

        let raw_filename = field.file_name().unwrap_or("").to_string();
        if raw_filename.is_empty() {
            return Redirect::to("/update").into_response();
        }

        let filename = crate::funciones::configuracion::secure_filename(&raw_filename);
        if filename.is_empty() || !allowed_file(&filename) {
            return Redirect::to("/update").into_response();
        }

        let file_path = destino_dir.join(&filename);
        let mut outfile = match OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&file_path)
            .await
        {
            Ok(file) => file,
            Err(_) => return Redirect::to("/update").into_response(),
        };

        let mut total_written: u64 = 0;
        let mut error_ocurrido = false;

        while let Ok(Some(chunk)) = field.chunk().await {
            total_written += chunk.len() as u64;
            if total_written > MAX_FILE_SIZE {
                error_ocurrido = true;
                break;
            }

            if outfile.write_all(&chunk).await.is_err() {
                error_ocurrido = true;
                break;
            }
        }

        let _ = outfile.flush().await;

        if error_ocurrido {
            let _ = fs::remove_file(&file_path).await;
            return Redirect::to("/update").into_response();
        }

        info!("✓ Archivo subido exitosamente: {filename} ({total_written} bytes)");
        return Redirect::to("/").into_response();
    }

    Redirect::to("/update").into_response()
}

// Equivale a upload_chunk de app.py
pub async fn upload_chunk(mut multipart: Multipart) -> impl IntoResponse {
    let _ = ensure_runtime_dirs();
    let partial_carpet = partials_dir();
    let files_carpet = upload_dir();

    let mut chunk_bytes: Option<Vec<u8>> = None;
    let mut original_name = String::new();
    let mut chunk_index_str = String::new();
    let mut total_chunks_str = String::new();
    let mut total_size_str = String::new();
    let mut raw_upload_id = String::new();

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "file_chunk" | "UPFile" => {
                if let Ok(bytes) = field.bytes().await {
                    chunk_bytes = Some(bytes.to_vec());
                }
            }
            "filename" => {
                if let Ok(text) = field.text().await {
                    original_name = text;
                }
            }
            "chunk_index" => {
                if let Ok(text) = field.text().await {
                    chunk_index_str = text;
                }
            }
            "total_chunks" => {
                if let Ok(text) = field.text().await {
                    total_chunks_str = text;
                }
            }
            "total_size" => {
                if let Ok(text) = field.text().await {
                    total_size_str = text;
                }
            }
            "upload_id" => {
                if let Ok(text) = field.text().await {
                    raw_upload_id = text;
                }
            }
            _ => {}
        }
    }

    let chunk_data = match chunk_bytes {
        Some(b) => b,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "ok": false, "error": "No se recibió el bloque" })),
            )
                .into_response();
        }
    };

    let filename = crate::funciones::configuracion::secure_filename(&original_name);
    if filename.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "Nombre de archivo inválido" })),
        )
            .into_response();
    }

    if !allowed_file(&filename) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "Tipo de archivo no permitido" })),
        )
            .into_response();
    }

    let upload_id = crate::funciones::configuracion::secure_filename(&raw_upload_id);
    if upload_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "ok": false, "error": "upload_id inválido" })),
        )
            .into_response();
    }

    let chunk_index: usize = chunk_index_str.parse().unwrap_or(0);
    let total_chunks: usize = total_chunks_str.parse().unwrap_or(1);
    let total_size: u64 = total_size_str.parse().unwrap_or(0);

    if total_size > MAX_FILE_SIZE {
        return (
            StatusCode::PAYLOAD_TOO_LARGE,
            Json(json!({ "ok": false, "error": "El archivo supera el límite permitido" })),
        )
            .into_response();
    }

    let partial_path = partial_carpet.join(format!("{upload_id}.part"));

    if chunk_index == 0 && partial_path.exists() {
        let _ = fs::remove_file(&partial_path).await;
    }

    let mut part_file = match OpenOptions::new()
        .create(true)
        .append(true)
        .open(&partial_path)
        .await
    {
        Ok(f) => f,
        Err(e) => {
            error!("Error abriendo partial file: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "ok": false, "error": "Error interno al escribir bloque" })),
            )
                .into_response();
        }
    };

    if let Err(e) = part_file.write_all(&chunk_data).await {
        error!("Error escribiendo datos en partial file: {e}");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "ok": false, "error": "Error guardando el fragmento" })),
        )
            .into_response();
    }

    let _ = part_file.flush().await;
    drop(part_file);

    if chunk_index + 1 >= total_chunks {
        let final_path = files_carpet.join(&filename);
        if let Err(e) = fs::rename(&partial_path, &final_path).await {
            error!("Error renombrando partial final: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "ok": false, "error": "Error finalizando el archivo" })),
            )
                .into_response();
        }

        info!("✓ Subida por chunks completada con éxito: {filename}");
        (
            StatusCode::OK,
            Json(json!({ "ok": true, "complete": true })),
        )
            .into_response()
    } else {
        (
            StatusCode::OK,
            Json(json!({ "ok": true, "complete": false })),
        )
            .into_response()
    }
}

// Equivale a archivo de app.py
pub async fn archivo(
    AxPath(raw_filename): AxPath<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let filename = crate::funciones::configuracion::secure_filename(&raw_filename);
    if filename.is_empty() {
        return (StatusCode::BAD_REQUEST, "Nombre de archivo inválido").into_response();
    }

    let file_path = upload_dir().join(&filename);
    if !file_path.exists() {
        return (StatusCode::NOT_FOUND, "Archivo no encontrado").into_response();
    }

    let meta = match tokio::fs::metadata(&file_path).await {
        Ok(m) => m,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Error de archivo").into_response(),
    };
    let total_size = meta.len();

    let mut file = match File::open(&file_path).await {
        Ok(f) => f,
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, "Error al abrir archivo").into_response()
        }
    };

    let mime_type = mime_guess::from_path(&filename)
        .first_or_octet_stream()
        .to_string();

    if let Some(range_header) = headers.get("range").and_then(|h| h.to_str().ok()) {
        if let Some(range_val) = range_header.strip_prefix("bytes=") {
            let parts: Vec<&str> = range_val.split('-').collect();
            let start: u64 = parts[0].parse().unwrap_or(0);
            let end: u64 = if parts.len() > 1 && !parts[1].is_empty() {
                parts[1].parse().unwrap_or(total_size - 1)
            } else {
                total_size - 1
            };

            if start <= end && end < total_size {
                let chunk_len = end - start + 1;
                if file.seek(SeekFrom::Start(start)).await.is_ok() {
                    let stream = ReaderStream::new(file.take(chunk_len));
                    let body = Body::from_stream(stream);

                    return Response::builder()
                        .status(StatusCode::PARTIAL_CONTENT)
                        .header(CONTENT_TYPE, mime_type)
                        .header(ACCEPT_RANGES, "bytes")
                        .header(CONTENT_RANGE, format!("bytes {start}-{end}/{total_size}"))
                        .header(CONTENT_LENGTH, chunk_len.to_string())
                        .body(body)
                        .unwrap_or_else(|_| (StatusCode::INTERNAL_SERVER_ERROR).into_response());
                }
            }
        }
    }

    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, mime_type)
        .header(ACCEPT_RANGES, "bytes")
        .header(CONTENT_LENGTH, total_size.to_string())
        .header(CONTENT_DISPOSITION, "inline")
        .body(body)
        .unwrap_or_else(|_| (StatusCode::INTERNAL_SERVER_ERROR).into_response())
}

// Equivale a descarga de app.py
pub async fn descarga(AxPath(raw_filename): AxPath<String>) -> impl IntoResponse {
    let filename = crate::funciones::configuracion::secure_filename(&raw_filename);
    if filename.is_empty() {
        return Redirect::to("/").into_response();
    }

    let file_path = upload_dir().join(&filename);
    if !file_path.exists() {
        return Redirect::to("/").into_response();
    }

    let meta = match tokio::fs::metadata(&file_path).await {
        Ok(m) => m,
        Err(_) => return Redirect::to("/").into_response(),
    };
    let total_size = meta.len();

    let file = match File::open(&file_path).await {
        Ok(f) => f,
        Err(_) => return Redirect::to("/").into_response(),
    };

    let mime_type = mime_guess::from_path(&filename)
        .first_or_octet_stream()
        .to_string();

    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    let disposition = format!("attachment; filename=\"{filename}\"");

    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, mime_type)
        .header(CONTENT_DISPOSITION, disposition)
        .header(CONTENT_LENGTH, total_size.to_string())
        .body(body)
        .unwrap_or_else(|_| Redirect::to("/").into_response())
}

// Equivale a eliminar de app.py
pub async fn eliminar(AxPath(raw_filename): AxPath<String>) -> impl IntoResponse {
    let filename = crate::funciones::configuracion::secure_filename(&raw_filename);
    if !filename.is_empty() {
        let file_path = upload_dir().join(&filename);
        if file_path.exists() {
            let _ = fs::remove_file(&file_path).await;
            info!("🗑️ Archivo eliminado: {filename}");
        }
    }
    Redirect::to("/")
}

// Equivale a update de app.py
pub async fn update(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut ctx = tera::Context::new();
    ctx.insert("request", &json!({ "path": "/update" }));

    match state.tera.render("Up_Data.html", &ctx) {
        Ok(html) => Html(html).into_response(),
        Err(err) => {
            error!("Error renderizando Up_Data.html: {err}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error interno del servidor",
            )
                .into_response()
        }
    }
}

// Equivale a QR_Generador_Vista de app.py
pub async fn qr_generador_vista(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut ctx = tera::Context::new();
    ctx.insert("request", &json!({ "path": "/qrgenerator" }));

    match state.tera.render("Qr_Generator.html", &ctx) {
        Ok(html) => Html(html).into_response(),
        Err(err) => {
            error!("Error renderizando Qr_Generator.html: {err}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error interno del servidor",
            )
                .into_response()
        }
    }
}

// Equivale a qr_image de app.py
pub async fn qr_image() -> impl IntoResponse {
    let path = qr_path();

    if !path.exists() {
        if let Err(e) = generar_qr() {
            error!("Error generando código QR en /qr-image: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Error generando QR").into_response();
        }
    }

    let meta = match tokio::fs::metadata(&path).await {
        Ok(m) => m,
        Err(_) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, "Error leyendo imagen QR").into_response()
        }
    };

    let file = match File::open(&path).await {
        Ok(f) => f,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error abriendo imagen QR",
            )
                .into_response()
        }
    };

    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    Response::builder()
        .status(StatusCode::OK)
        .header(CONTENT_TYPE, "image/png")
        .header(CONTENT_LENGTH, meta.len().to_string())
        .body(body)
        .unwrap_or_else(|_| (StatusCode::INTERNAL_SERVER_ERROR).into_response())
}

// Equivale a qr de app.py
pub async fn qr() -> impl IntoResponse {
    if let Err(e) = generar_qr() {
        error!("Error regenerando código QR: {e}");
    }
    Redirect::to("/qrgenerator")
}

pub async fn save_json_atomic<T: Serialize>(path: &Path, data: &T) -> Result<(), std::io::Error> {
    let tmp_path = path.with_extension("tmp");
    let content = serde_json::to_string_pretty(data)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    let mut file = fs::OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&tmp_path)
        .await?;

    file.write_all(content.as_bytes()).await?;
    file.flush().await?;
    drop(file);

    fs::rename(&tmp_path, path).await?;
    Ok(())
}

pub fn load_initial_settings() -> AppSettings {
    get_app_settings()
}

pub fn load_initial_theme() -> Option<Value> {
    let path = theme_file_path();
    if path.exists() {
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(val) = serde_json::from_str::<Value>(&content) {
                return Some(val);
            }
        }
    }
    None
}

pub fn init_tera() -> Result<Tera, tera::Error> {
    let mut tera = Tera::default();
    let mut raw_templates = Vec::new();

    for file in TemplateAssets::iter() {
        let file_str = file.as_ref();
        if let Some(embedded_file) = TemplateAssets::get(file_str) {
            let content = std::str::from_utf8(embedded_file.data.as_ref())
                .map_err(|e| tera::Error::msg(format!("Template {file_str} not UTF-8: {e}")))?;
            raw_templates.push((file_str.to_string(), content.to_string()));
        }
    }

    tera.add_raw_templates(raw_templates.iter().map(|(n, c)| (n.as_str(), c.as_str())))?;

    tera.register_function(
        "url_for",
        move |args: &HashMap<String, Value>| -> tera::Result<Value> {
            let endpoint = args.get("endpoint").and_then(|v| v.as_str()).unwrap_or("");

            match endpoint {
                "static" => {
                    let filename = args.get("filename").and_then(|v| v.as_str()).unwrap_or("");
                    let clean_filename = filename.trim_start_matches('/');
                    Ok(Value::String(format!("/static/{clean_filename}")))
                }
                "qr_image" => Ok(Value::String("/qr-image".to_string())),
                "qr" => Ok(Value::String("/qr".to_string())),
                "index" => Ok(Value::String("/".to_string())),
                "settings" => Ok(Value::String("/settings".to_string())),
                "update" => Ok(Value::String("/update".to_string())),
                _ => Ok(Value::String(format!("/{endpoint}"))),
            }
        },
    );

    Ok(tera)
}

pub async fn static_handler(AxPath(path): AxPath<String>) -> impl IntoResponse {
    let clean_path = path.trim_start_matches('/');
    if let Some(content) = StaticAssets::get(clean_path) {
        let mime = mime_guess::from_path(clean_path)
            .first_or_octet_stream()
            .to_string();

        Response::builder()
            .status(StatusCode::OK)
            .header(CONTENT_TYPE, mime)
            .body(Body::from(content.data))
            .unwrap_or_else(|_| (StatusCode::INTERNAL_SERVER_ERROR).into_response())
    } else {
        (StatusCode::NOT_FOUND, "Recurso estático no encontrado").into_response()
    }
}

pub fn crear_router(app_state: Arc<AppState>) -> Router {
    Router::new()
        .route("/", get(index))
        .route("/settings", get(settings))
        .route("/update", get(update))
        .route("/qrgenerator", get(qr_generador_vista))
        .route("/api/sync-status", get(sync_status))
        .route(
            "/api/app-settings",
            get(api_app_settings_get).post(api_app_settings_post),
        )
        .route("/api/theme", get(api_theme_get).post(api_theme_post))
        .route("/upload", post(upload))
        .route("/upload-chunk", post(upload_chunk))
        .route("/archivo/:raw_filename", get(archivo))
        .route("/descarga/:raw_filename", get(descarga))
        .route("/eliminar/:raw_filename", get(eliminar).post(eliminar))
        .route("/qr-image", get(qr_image))
        .route("/qr", get(qr))
        .route("/static/*path", get(static_handler))
        .layer(middleware::from_fn(add_cache_headers))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(app_state)
}
