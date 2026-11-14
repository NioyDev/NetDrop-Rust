use netdrop::funciones::abrir_navegador::abrir_navegador;

// Equivale a clase MiApp de Lanzador/main.py
pub struct MiApp {
    pub ancho: u32,
    pub alto: u32,
    pub titulo: String,
}

impl MiApp {
    pub fn new() -> Self {
        let mut app = Self {
            ancho: 350,
            alto: 250,
            titulo: "NetDrop".to_string(),
        };
        app.establecer_icono();
        app.cargar_estilos();
        app
    }

    pub fn establecer_icono(&mut self) {
        // En Windows el icono se vincula con el recurso del ejecutable
    }

    pub fn cargar_estilos(&self) -> &'static str {
        // Equivale a estilos.qss de Lanzador/
        r#"
        body {
            background-color: #FAF8F5;
            font-family: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
            color: #1A1A1A;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 20px;
            padding: 40px;
        }
        #btn_abrir {
            background-color: #C85A32;
            color: #FFFFFF;
            font-weight: 600;
            border: none;
        }
        #btn_abrir:hover {
            background-color: #B04923;
        }
        #btn_cerrar {
            background-color: #FFFFFF;
            color: #666360;
            font-weight: 500;
            border: 1px solid #E6E2DC;
        }
        #btn_cerrar:hover {
            background-color: #F3EFE9;
            color: #111111;
            border-color: #C5C0B8;
        }
        "#
    }

    pub fn ejecutar(&self) {
        #[cfg(feature = "desktop")]
        {
            use tao::dpi::LogicalSize;
            use tao::event::{Event, WindowEvent};
            use tao::event_loop::{ControlFlow, EventLoop};
            use tao::window::WindowBuilder;
            use wry::WebViewBuilder;

            let event_loop = EventLoop::new();
            let window = WindowBuilder::new()
                .with_title(&self.titulo)
                .with_inner_size(LogicalSize::new(self.ancho as f64, self.alto as f64))
                .with_min_inner_size(LogicalSize::new(self.ancho as f64, self.alto as f64))
                .with_max_inner_size(LogicalSize::new(self.ancho as f64, self.alto as f64))
                .with_resizable(false)
                .build(&event_loop)
                .expect("Error creando ventana del lanzador");

            let estilos = self.cargar_estilos();
            let html = format!(
                r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; user-select: none; }}
        button {{
            width: 100%;
            min-width: 160px;
            min-height: 44px;
            padding: 10px;
            font-size: 14px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
            outline: none;
        }}
        {estilos}
    </style>
</head>
<body>
    <button id="btn_abrir" onclick="window.ipc.postMessage('open')">Abrir NetDrop</button>
    <button id="btn_cerrar" onclick="window.ipc.postMessage('close')">Cerrar NetDrop</button>
</body>
</html>"#
            );

            let _webview = WebViewBuilder::new(&window)
                .with_html(html)
                .with_ipc_handler(|msg| match msg.as_str() {
                    "open" => {
                        abrir_navegador();
                    }
                    "close" => {
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .build()
                .expect("Error inicializando WebView del lanzador");

            event_loop.run(move |event, _, control_flow| {
                *control_flow = ControlFlow::Wait;
                if let Event::WindowEvent {
                    event: WindowEvent::CloseRequested,
                    ..
                } = event
                {
                    *control_flow = ControlFlow::Exit;
                }
            });
        }

        #[cfg(not(feature = "desktop"))]
        {
            println!("Lanzador NetDrop:");
            println!("1. Abriendo NetDrop en tu navegador...");
            abrir_navegador();
        }
    }
}

// Equivale a Iniciador de Lanzador/main.py
pub fn iniciador() {
    let app = MiApp::new();
    app.ejecutar();
}

fn main() {
    iniciador();
}
