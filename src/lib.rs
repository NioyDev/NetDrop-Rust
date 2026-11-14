pub mod app;
pub mod funciones;

#[cfg(test)]
mod tests {
    use crate::app::{crear_router, init_tera, AppSettings, AppState};
    use crate::funciones::configuracion::{allowed_file, secure_filename};
    use crate::funciones::paths::{data_root, ensure_runtime_dirs, qr_dir, upload_dir};
    use crate::funciones::show_file::formatear_tamano;
    use axum::body::Body;
    use axum::http::{header, Request, StatusCode};
    use http_body_util::BodyExt;
    use serde_json::{json, Value};
    use std::sync::Arc;
    use tokio::sync::RwLock;
    use tower::ServiceExt;

    // --- PRUEBAS UNITARIAS ---

    #[test]
    fn test_secure_filename_traversal() {
        assert_eq!(secure_filename("test.txt"), "test.txt");
        assert_eq!(secure_filename("../../../etc/passwd"), "passwd");
        assert_eq!(
            secure_filename("..\\..\\Windows\\System32\\calc.exe"),
            "calc.exe"
        );
        assert_eq!(secure_filename(".env"), "env");
        assert_eq!(secure_filename("...config.ini"), "config.ini");
        assert_eq!(
            secure_filename("mi archivo de prueba.pdf"),
            "mi_archivo_de_prueba.pdf"
        );
        assert_eq!(secure_filename(""), "");
        assert_eq!(secure_filename(".."), "");
    }

    #[test]
    fn test_formatear_tamano() {
        assert_eq!(formatear_tamano(500.0), "500 B");
        assert_eq!(formatear_tamano(1024.0), "1 KB");
        assert_eq!(formatear_tamano(1536.0), "1.5 KB");
        assert_eq!(formatear_tamano(1024.0 * 1024.0), "1 MB");
        assert_eq!(formatear_tamano(1024.0 * 1024.0 * 1024.0), "1 GB");
    }

    #[test]
    fn test_allowed_file() {
        assert!(allowed_file("documento.pdf"));
        assert!(allowed_file("FOTO.PNG"));
        assert!(allowed_file("video.mp4"));
        assert!(allowed_file("cancion.mp3"));
        assert!(allowed_file("codigo.rs"));
        assert!(allowed_file("archivo_sin_extension"));
        assert!(!allowed_file("archivo.extension_inexistente_12345"));
    }

    #[test]
    fn test_rutas_datos() {
        let (u_dir, q_dir) = ensure_runtime_dirs().expect("No se pudieron crear directorios");
        assert!(u_dir.exists());
        assert!(q_dir.exists());
        assert_eq!(u_dir, upload_dir());
        assert_eq!(q_dir, qr_dir());
        assert!(data_root().exists());
    }

    #[test]
    fn test_tera_templates_compilation() {
        let tera = init_tera().expect("Error al compilar plantillas embebidas Tera");
        let template_names: Vec<&str> = tera.get_template_names().collect();
        assert!(template_names.contains(&"index.html"));
        assert!(template_names.contains(&"layout.html"));
        assert!(template_names.contains(&"settings.html"));
        assert!(template_names.contains(&"Up_Data.html"));
        assert!(template_names.contains(&"Qr_Generator.html"));
    }

    // --- PRUEBAS DE INTEGRACIÓN DE ENDPOINTS ---

    fn setup_test_app() -> axum::Router {
        let _ = ensure_runtime_dirs();
        let tera = Arc::new(init_tera().expect("Error inicializando plantillas"));
        let settings = Arc::new(RwLock::new(AppSettings::default()));
        let theme = Arc::new(RwLock::new(None));

        let app_state = Arc::new(AppState {
            tera,
            settings,
            theme,
        });

        crear_router(app_state)
    }

    #[tokio::test]
    async fn test_get_index() {
        let app = setup_test_app();
        let req = Request::builder().uri("/").body(Body::empty()).unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_get_settings() {
        let app = setup_test_app();
        let req = Request::builder()
            .uri("/settings")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_get_update() {
        let app = setup_test_app();
        let req = Request::builder()
            .uri("/update")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_get_qrgenerator() {
        let app = setup_test_app();
        let req = Request::builder()
            .uri("/qrgenerator")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_api_sync_status() {
        let app = setup_test_app();
        let req = Request::builder()
            .uri("/api/sync-status")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        // Verificar cabecera de caché en /api/
        assert_eq!(
            res.headers().get(header::CACHE_CONTROL).unwrap(),
            "no-cache, must-revalidate"
        );

        let body = res.into_body().collect().await.unwrap().to_bytes();
        let val: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(val["ok"], true);
        assert!(val.get("count").is_some());
        assert!(val.get("latest_mtime").is_some());
    }

    #[tokio::test]
    async fn test_api_app_settings_get_and_post() {
        let app = setup_test_app();

        // GET
        let req = Request::builder()
            .uri("/api/app-settings")
            .body(Body::empty())
            .unwrap();
        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body = res.into_body().collect().await.unwrap().to_bytes();
        let val: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(val["ok"], true);
        assert_eq!(val["settings"]["background_mode"], false);

        // POST
        let payload = json!({
            "background_mode": true
        });
        let req = Request::builder()
            .method("POST")
            .uri("/api/app-settings")
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(serde_json::to_vec(&payload).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body = res.into_body().collect().await.unwrap().to_bytes();
        let val: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(val["ok"], true);
        assert_eq!(val["settings"]["background_mode"], true);
    }

    #[tokio::test]
    async fn test_api_theme_get_and_post() {
        let app = setup_test_app();

        // POST tema
        let payload = json!({
            "id": "test-theme",
            "name": "Tema de prueba",
            "bgBase": "#000000",
            "accent": "#ff0000"
        });
        let req = Request::builder()
            .method("POST")
            .uri("/api/theme")
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(serde_json::to_vec(&payload).unwrap()))
            .unwrap();
        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        // GET tema
        let req = Request::builder()
            .uri("/api/theme")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);

        let body = res.into_body().collect().await.unwrap().to_bytes();
        let val: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(val["ok"], true);
        assert_eq!(val["theme"]["id"], "test-theme");
    }

    #[tokio::test]
    async fn test_static_assets_headers() {
        let app = setup_test_app();
        let req = Request::builder()
            .uri("/static/css/global.css")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(
            res.headers().get(header::CACHE_CONTROL).unwrap(),
            "public, max-age=31536000, immutable"
        );
    }

    #[tokio::test]
    async fn test_qr_endpoints() {
        let app = setup_test_app();

        // GET /qr-image
        let req = Request::builder()
            .uri("/qr-image")
            .body(Body::empty())
            .unwrap();
        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(
            res.headers().get(header::CONTENT_TYPE).unwrap(),
            "image/png"
        );

        // GET /qr (redirect)
        let req = Request::builder().uri("/qr").body(Body::empty()).unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert!(res.status().is_redirection());
    }
}
