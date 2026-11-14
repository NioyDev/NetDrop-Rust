use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::warn;

use netdrop::app::{
    cert_paths, crear_router, es_https, init_tera, load_initial_settings, load_initial_theme,
    AppState,
};
use netdrop::funciones::abrir_navegador::abrir_navegador;
use netdrop::funciones::close::esta_cerrado;
use netdrop::funciones::ip::sacar_ip;
use netdrop::funciones::paths::ensure_runtime_dirs;
use netdrop::funciones::qr_generator::generar_qr;

// Equivale a arrancar_webview de app.py
#[cfg(feature = "desktop")]
pub fn arrancar_webview(proto: &str, shared_state: Arc<AppState>) {
    use tao::dpi::LogicalSize;
    use tao::event::{Event, WindowEvent};
    use tao::event_loop::{ControlFlow, EventLoop};
    use tao::window::WindowBuilder;
    use wry::WebViewBuilder;

    let event_loop = EventLoop::new();
    let window = match WindowBuilder::new()
        .with_title("NetDrop Desktop")
        .with_inner_size(LogicalSize::new(850.0, 650.0))
        .with_min_inner_size(LogicalSize::new(850.0, 650.0))
        .with_resizable(true)
        .build(&event_loop)
    {
        Ok(w) => w,
        Err(e) => {
            warn!("No se pudo inicializar la ventana nativa: {e}. Abriendo navegador...");
            abrir_navegador();
            return;
        }
    };

    let url = format!("{proto}://127.0.0.1:5000");
    let _webview = match WebViewBuilder::new(&window).with_url(&url).build() {
        Ok(wv) => wv,
        Err(e) => {
            warn!("No se pudo crear el WebView: {e}. Abriendo navegador...");
            abrir_navegador();
            return;
        }
    };

    // on_window_closed de arrancar_webview en app.py
    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            let bg_mode = {
                if let Ok(guard) = shared_state.settings.try_read() {
                    guard.background_mode
                } else {
                    false
                }
            };

            if !bg_mode {
                println!("🛑 Modo segundo plano desactivado. Cerrando NetDrop por completo.");
                std::process::exit(0);
            } else {
                println!("🌙 Modo segundo plano activado. Servidor NetDrop continúa activo.");
                *control_flow = ControlFlow::Exit;
            }
        }
    });
}

// Equivale a arrancar_webview de app.py (Fallback nativo en Windows modo App / navegador sin feature desktop)
#[cfg(not(feature = "desktop"))]
pub fn arrancar_webview(proto: &str, shared_state: Arc<AppState>) {
    let url = format!("{proto}://127.0.0.1:5000");

    let browser_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ];

    let mut launched = false;
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".into());
    let user_data = format!("--user-data-dir={local_app_data}\\NetDrop\\WebViewProfile");

    for path in &browser_paths {
        if std::path::Path::new(path).exists() {
            let app_arg = format!("--app={url}");
            let size_arg = "--window-size=850,650";

            if let Ok(mut child) = std::process::Command::new(path)
                .args([&app_arg, size_arg, &user_data])
                .spawn()
            {
                launched = true;
                // on_window_closed de arrancar_webview en app.py
                let _ = child.wait();

                let bg_mode = {
                    if let Ok(guard) = shared_state.settings.try_read() {
                        guard.background_mode
                    } else {
                        false
                    }
                };

                if !bg_mode {
                    println!("🛑 Modo segundo plano desactivado. Cerrando NetDrop por completo.");
                    std::process::exit(0);
                } else {
                    println!("🌙 Modo segundo plano activado. Servidor NetDrop continúa activo.");
                }
                break;
            }
        }
    }

    if !launched {
        println!("Abriendo NetDrop en tu navegador...");
        abrir_navegador();
    }
}

// Equivale a ejecutar_servidor de app.py
pub fn ejecutar_servidor(state_for_server: Arc<AppState>) -> std::thread::JoinHandle<()> {
    std::thread::spawn(move || {
        let rt = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("Error creando Tokio runtime");

        rt.block_on(async move {
            let app = crear_router(state_for_server);
            let addr = SocketAddr::from(([0, 0, 0, 0], 5000));

            #[cfg(feature = "tls")]
            if es_https() {
                let (cert, key) = cert_paths();
                if let Ok(config) =
                    axum_server::tls_rustls::RustlsConfig::from_pem_file(&cert, &key).await
                {
                    println!("🔒 Servidor seguro HTTPS activado con certificados SSL");
                    if let Err(e) = axum_server::bind_rustls(addr, config)
                        .serve(app.into_make_service())
                        .await
                    {
                        eprintln!("Error en servidor TLS: {e}");
                    }
                    return;
                }
            }

            let listener = match tokio::net::TcpListener::bind(addr).await {
                Ok(l) => l,
                Err(e) => {
                    eprintln!("Error enlazando puerto 5000: {e}");
                    return;
                }
            };

            if let Err(e) = axum::serve(listener, app.into_make_service()).await {
                eprintln!("Error ejecutando servidor HTTP: {e}");
            }
        });
    })
}

// Equivale a __main__ de app.py
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .try_init();

    // Comprobar si ya existe una instancia activa (esta_cerrado)
    if !esta_cerrado() {
        println!("\n========================================");
        println!("⚠️  NETDROP YA ESTÁ EN EJECUCIÓN");
        println!("🔗 Abriendo pestaña en: http://{}:5000", sacar_ip());
        println!("========================================\n");
        abrir_navegador();
        return Ok(());
    }

    let _ = ensure_runtime_dirs();
    let ip_local = sacar_ip();
    let proto = if es_https() { "https" } else { "http" };

    println!("🚀 Iniciando NetDrop en: {proto}://{ip_local}:5000");

    // Generar el código QR
    if let Err(e) = generar_qr() {
        warn!("Aviso: no se pudo pre-generar el QR: {e}");
    }

    // Inicializar estado compartido
    let tera = match init_tera() {
        Ok(t) => Arc::new(t),
        Err(e) => {
            eprintln!("Error cargando plantillas Tera: {e}");
            return Err(e.into());
        }
    };

    let settings = Arc::new(RwLock::new(load_initial_settings()));
    let theme = Arc::new(RwLock::new(load_initial_theme()));

    let app_state = Arc::new(AppState {
        tera,
        settings,
        theme,
    });

    // 1. Lanzamos el servidor en segundo plano (ejecutar_servidor)
    let server_handle = ejecutar_servidor(Arc::clone(&app_state));

    std::thread::sleep(std::time::Duration::from_millis(150));

    let args: Vec<String> = std::env::args().collect();
    let headless = args.iter().any(|a| a == "--headless" || a == "-h");

    if !headless {
        // 2. Levantamos la ventana de escritorio (arrancar_webview)
        arrancar_webview(proto, Arc::clone(&app_state));
    } else {
        println!(
            "Modo headless activado. Servidor activo en http://{}:5000 (Ctrl+C para salir).",
            ip_local
        );
    }

    let _ = server_handle.join();
    Ok(())
}
