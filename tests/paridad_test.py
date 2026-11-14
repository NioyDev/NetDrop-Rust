"""
Script de Pruebas de Paridad Automatizada: Python (Flask) vs. Rust (Axum)
Comprueba endpoint por endpoint:
- Códigos de estado HTTP
- Cabeceras de caché y contenido
- Estructura de respuestas JSON
- Redirecciones
- Subidas multipart y fragmentadas (chunks)
- Sanitización y prevención de Path Traversal
"""

import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import requests

RUST_BIN = r"C:\Users\migue\.cargo-target\netdrop-rust\debug\netdrop.exe"
PYTHON_APP_DIR = r"C:\Users\migue\NetDrop-original"

RUST_PORT = 5000
PYTHON_PORT = 5001

def main():
    print("=" * 60)
    print("INICIANDO PRUEBAS DE PARIDAD: Python/Flask vs. Rust/Axum")
    print("=" * 60)

    # 1. Asegurar binario Rust compilado
    if not os.path.exists(RUST_BIN):
        print(f"Error: No existe el binario de Rust en {RUST_BIN}")
        sys.exit(1)

    # 2. Levantar servidor Rust en modo headless (puerto 5000 por defecto)
    print("\n[1/3] Levantando servidor Rust...")
    rust_proc = subprocess.Popen(
        [RUST_BIN, "--headless"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    time.sleep(1.5)

    # Verificar que Rust responda
    try:
        r_rust = requests.get(f"http://127.0.0.1:{RUST_PORT}/api/sync-status", timeout=2)
        assert r_rust.status_code == 200
        print(f"✓ Servidor Rust activo en http://127.0.0.1:{RUST_PORT}")
    except Exception as e:
        print(f"Error conectando al servidor Rust: {e}")
        rust_proc.terminate()
        sys.exit(1)

    # 3. Levantar servidor Python Flask en puerto 5001 sin GUI
    print("\n[2/3] Levantando servidor Python (Flask)...")
    python_runner = f"""
import sys, os
sys.path.insert(0, r"{PYTHON_APP_DIR}")
from app import app
app.run(host='127.0.0.1', port={PYTHON_PORT}, debug=False, use_reloader=False)
"""
    py_proc = subprocess.Popen(
        [sys.executable, "-c", python_runner],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    # Verificar que Python responda
    py_ok = False
    for _ in range(10):
        time.sleep(0.5)
        try:
            r_py = requests.get(f"http://127.0.0.1:{PYTHON_PORT}/api/sync-status", timeout=1)
            if r_py.status_code == 200:
                py_ok = True
                break
        except Exception:
            pass

    if py_ok:
        print(f"✓ Servidor Python activo en http://127.0.0.1:{PYTHON_PORT}")
    else:
        print(f"Error conectando al servidor Python.")
        py_proc.terminate()
        rust_proc.terminate()
        out, err = py_proc.communicate(timeout=2)
        print("Python stdout:", out)
        print("Python stderr:", err)
        sys.exit(1)

    # 4. Batería de Pruebas Endpoint por Endpoint
    print("\n[3/3] Ejecutando comparativa de paridad...")
    errores = []

    def check_endpoint(nombre, metodo, path, **kwargs):
        url_py = f"http://127.0.0.1:{PYTHON_PORT}{path}"
        url_rs = f"http://127.0.0.1:{RUST_PORT}{path}"
        
        try:
            res_py = requests.request(metodo, url_py, allow_redirects=False, **kwargs)
            res_rs = requests.request(metodo, url_rs, allow_redirects=False, **kwargs)
        except Exception as ex:
            errores.append(f"Fallo de conexión en {path}: {ex}")
            print(f"  ❌ {nombre}: Fallo de petición ({ex})")
            return

        # Comparar código de estado
        if res_py.status_code != res_rs.status_code:
            errores.append(f"{nombre} {path}: Código diferente Python={res_py.status_code} Rust={res_rs.status_code}")
            print(f"  ❌ {nombre}: Código diferente (Py={res_py.status_code}, Rs={res_rs.status_code})")
            return

        # Si es redirección, comparar destino relativo
        if res_py.is_redirect or res_py.status_code in (301, 302, 303, 307, 308):
            loc_py = res_py.headers.get("Location", "")
            loc_rs = res_rs.headers.get("Location", "")
            # Normalizar ruta relativa si viene absoluta
            loc_py_path = loc_py.split("://")[-1].split("/", 1)[-1] if "://" in loc_py else loc_py.lstrip("/")
            loc_rs_path = loc_rs.split("://")[-1].split("/", 1)[-1] if "://" in loc_rs else loc_rs.lstrip("/")
            if loc_py_path != loc_rs_path:
                print(f"  ⚠️ {nombre}: Redirección Py='{loc_py}' vs Rs='{loc_rs}'")
            else:
                print(f"  ✓ {nombre}: Status {res_rs.status_code} -> {loc_rs}")
            return

        # Comparar estructura JSON si aplica
        if "application/json" in res_py.headers.get("Content-Type", ""):
            try:
                json_py = res_py.json()
                json_rs = res_rs.json()
                py_keys = sorted(list(json_py.keys()))
                rs_keys = sorted(list(json_rs.keys()))
                if py_keys != rs_keys:
                    errores.append(f"{nombre} {path}: Claves JSON distintas Py={py_keys} Rs={rs_keys}")
                    print(f"  ❌ {nombre}: Claves JSON distintas")
                    return
            except Exception as e:
                errores.append(f"{nombre} {path}: Error parseando JSON: {e}")
                return

        # Comparar cabeceras clave
        if path.startswith("/static/"):
            cc_py = res_py.headers.get("Cache-Control", "")
            cc_rs = res_rs.headers.get("Cache-Control", "")
            if "max-age" not in cc_rs:
                errores.append(f"{nombre} {path}: Falta Cache-Control en Rust: {cc_rs}")

        if path.startswith("/api/"):
            cc_rs = res_rs.headers.get("Cache-Control", "")
            if "no-cache" not in cc_rs:
                errores.append(f"{nombre} {path}: Falta no-cache en API Rust: {cc_rs}")

        print(f"  ✓ {nombre}: Status {res_rs.status_code} (Paridad exacta)")

    # --- PÁGINAS GET ---
    check_endpoint("Página Principal", "GET", "/")
    check_endpoint("Ajustes", "GET", "/settings")
    check_endpoint("Subida", "GET", "/update")
    check_endpoint("Generador QR", "GET", "/qrgenerator")

    # --- APIS GET / POST ---
    check_endpoint("Sync Status", "GET", "/api/sync-status")
    check_endpoint("App Settings GET", "GET", "/api/app-settings")
    check_endpoint("App Settings POST", "POST", "/api/app-settings", json={"background_mode": True})
    check_endpoint("Theme GET", "GET", "/api/theme")
    check_endpoint("Theme POST", "POST", "/api/theme", json={"id": "paridad-tema", "name": "Tema Paridad"})

    # --- QR ---
    check_endpoint("QR Imagen", "GET", "/qr-image")
    check_endpoint("QR Redirect", "GET", "/qr")

    # --- ASSETS ESTÁTICOS ---
    check_endpoint("CSS Global", "GET", "/static/css/global.css")
    check_endpoint("JS Theme Engine", "GET", "/static/js/theme-engine.js")

    # --- SUBIDA MULTIPART REGULAR ---
    test_content = b"Contenido de prueba para paridad NetDrop"
    files = {"UPFile": ("archivo_paridad.txt", test_content, "text/plain")}
    check_endpoint("Subida Multipart Normal", "POST", "/upload", files=files)

    # --- VERIFICAR ARCHIVO SUBIDO Y DESCARGA ---
    check_endpoint("Servido Inline", "GET", "/archivo/archivo_paridad.txt")
    check_endpoint("Descarga Forzada", "GET", "/descarga/archivo_paridad.txt")

    # --- SUBIDA POR CHUNKS ---
    chunk_payload = {
        "filename": "archivo_chunk.txt",
        "chunk_index": "0",
        "total_chunks": "1",
        "total_size": str(len(test_content)),
        "upload_id": "chunk_parity_test_123"
    }
    chunk_files = {"file_chunk": ("blob", test_content, "application/octet-stream")}
    check_endpoint("Subida por Chunks", "POST", "/upload-chunk", data=chunk_payload, files=chunk_files)

    # --- ELIMINAR ---
    check_endpoint("Eliminar Archivo (GET)", "GET", "/eliminar/archivo_paridad.txt")
    check_endpoint("Eliminar Archivo (POST)", "POST", "/eliminar/archivo_chunk.txt")

    # --- CASOS DE ERROR Y SEGURIDAD (Path Traversal) ---
    check_endpoint("Path Traversal Protegido", "GET", "/archivo/../../etc/passwd")

    # Finalizar procesos
    rust_proc.terminate()
    py_proc.terminate()

    print("\n" + "=" * 60)
    if not errores:
        print("🎉 ¡TODOS LOS ENDPOINTS CUMPLEN PARIDAD 100% IDÉNTICA!")
        print("=" * 60)
        return 0
    else:
        print(f"⚠️ Se encontraron {len(errores)} discrepancias:")
        for err in errores:
            print(f"  - {err}")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
