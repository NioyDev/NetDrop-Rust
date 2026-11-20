package com.nioydev.netdrop;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.wifi.WifiManager;
import android.os.Environment;
import android.text.format.Formatter;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class NetDropServer {

    public static final int DEFAULT_PORT = 5000;
    private final Context context;
    private final SharedPreferences prefs;
    private ServerSocket serverSocket;
    private ExecutorService threadPool;
    private boolean isRunning = false;
    private int port = DEFAULT_PORT;
    private File storageDir;

    public NetDropServer(Context context) {
        this.context = context;
        this.prefs = context.getSharedPreferences("NetDropPrefs", Context.MODE_PRIVATE);
        this.storageDir = initStorageDir();
    }

    private File initStorageDir() {
        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "NetDrop");
        if (!dir.exists()) {
            dir.mkdirs();
        }
        if (!dir.canWrite()) {
            dir = new File(context.getExternalFilesDir(null), "NetDrop");
            if (!dir.exists()) dir.mkdirs();
        }
        return dir;
    }

    public File getStorageDir() {
        if (!storageDir.exists()) {
            storageDir.mkdirs();
        }
        return storageDir;
    }

    public synchronized void start() {
        if (isRunning) return;

        try {
            serverSocket = new ServerSocket(port);
        } catch (IOException e) {
            try {
                port = 5050;
                serverSocket = new ServerSocket(port);
            } catch (IOException e2) {
                return;
            }
        }

        isRunning = true;
        threadPool = Executors.newFixedThreadPool(12);

        new Thread(new Runnable() {
            @Override
            public void run() {
                while (isRunning && serverSocket != null && !serverSocket.isClosed()) {
                    try {
                        Socket clientSocket = serverSocket.accept();
                        threadPool.execute(new ClientHandler(clientSocket));
                    } catch (IOException e) {
                        if (!isRunning) break;
                    }
                }
            }
        }, "NetDrop-ServerThread").start();
    }

    public synchronized void stop() {
        isRunning = false;
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {}
            serverSocket = null;
        }
        if (threadPool != null) {
            threadPool.shutdownNow();
            threadPool = null;
        }
    }

    public int getPort() {
        return port;
    }

    public String getDeviceIp() {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            if (interfaces != null) {
                while (interfaces.hasMoreElements()) {
                    NetworkInterface iface = interfaces.nextElement();
                    if (iface.isLoopback() || !iface.isUp()) continue;
                    Enumeration<InetAddress> addrs = iface.getInetAddresses();
                    while (addrs.hasMoreElements()) {
                        InetAddress addr = addrs.nextElement();
                        if (!addr.isLoopbackAddress() && addr.getAddress().length == 4) {
                            String host = addr.getHostAddress();
                            if (host != null && !host.startsWith("127.") && !host.startsWith("169.254")) {
                                return host;
                            }
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        try {
            WifiManager wm = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null && wm.getConnectionInfo() != null) {
                int ipInt = wm.getConnectionInfo().getIpAddress();
                if (ipInt != 0) {
                    return Formatter.formatIpAddress(ipInt);
                }
            }
        } catch (Exception ignored) {}

        return "127.0.0.1";
    }

    public String getServerUrl() {
        return "http://" + getDeviceIp() + ":" + port;
    }

    private class ClientHandler implements Runnable {
        private final Socket socket;

        ClientHandler(Socket socket) {
            this.socket = socket;
        }

        @Override
        public void run() {
            try {
                socket.setSoTimeout(30000);
                InputStream in = new BufferedInputStream(socket.getInputStream());
                OutputStream out = new BufferedOutputStream(socket.getOutputStream());

                // Leer encabezados HTTP
                ByteArrayOutputStream headerBuf = new ByteArrayOutputStream();
                int b;
                int crlfState = 0;
                while ((b = in.read()) != -1) {
                    headerBuf.write(b);
                    if ((crlfState == 0 || crlfState == 2) && b == '\r') {
                        crlfState++;
                    } else if ((crlfState == 1 || crlfState == 3) && b == '\n') {
                        crlfState++;
                        if (crlfState == 4) break; // Fin de encabezados HTTP (\r\n\r\n)
                    } else {
                        crlfState = 0;
                    }
                }

                String headerStr = new String(headerBuf.toByteArray(), StandardCharsets.UTF_8);
                String[] lines = headerStr.split("\r\n");
                if (lines.length == 0 || lines[0].isEmpty()) {
                    socket.close();
                    return;
                }

                String[] reqLineParts = lines[0].split(" ");
                if (reqLineParts.length < 2) {
                    socket.close();
                    return;
                }

                String method = reqLineParts[0].toUpperCase(Locale.US);
                String fullPath = reqLineParts[1];
                String rawPath = fullPath.contains("?") ? fullPath.substring(0, fullPath.indexOf("?")) : fullPath;
                String path = URLDecoder.decode(rawPath, "UTF-8");

                Map<String, String> headers = new HashMap<>();
                for (int i = 1; i < lines.length; i++) {
                    int colon = lines[i].indexOf(':');
                    if (colon > 0) {
                        String k = lines[i].substring(0, colon).trim().toLowerCase(Locale.US);
                        String v = lines[i].substring(colon + 1).trim();
                        headers.put(k, v);
                    }
                }

                handleRequest(method, path, headers, in, out);
                out.flush();
            } catch (Exception ignored) {
            } finally {
                try {
                    socket.close();
                } catch (IOException ignored) {}
            }
        }

        private void handleRequest(String method, String path, Map<String, String> headers, InputStream in, OutputStream out) throws Exception {
            // Rutas estáticas (/static/*)
            if (path.startsWith("/static/")) {
                serveAsset(path.substring(1), out);
                return;
            }

            // Código QR
            if (path.equals("/qr-image") || path.equals("/Qr")) {
                serveQrImage(out);
                return;
            }

            // API de Tema
            if (path.equals("/api/theme")) {
                if ("POST".equals(method)) {
                    handleThemePost(headers, in, out);
                } else {
                    String current = prefs.getString("current_theme", "oceano");
                    sendJsonResponse(out, 200, "{\"theme\":\"" + current + "\"}");
                }
                return;
            }

            // API de Estado de Sincronización
            if (path.equals("/api/sync-status")) {
                handleSyncStatus(out);
                return;
            }

            // API de Ajustes de la App
            if (path.equals("/api/app-settings")) {
                sendJsonResponse(out, 200, "{\"background_mode\":true,\"dark_mode\":false}");
                return;
            }

            // Eliminación de Archivos (/delete/*)
            if (path.startsWith("/delete/")) {
                String filename = path.substring(8);
                handleDeleteFile(filename, out);
                return;
            }

            // Fijar Archivos (/pin/*)
            if (path.startsWith("/pin/")) {
                String filename = path.substring(5);
                handlePinFile(filename, out);
                return;
            }

            // Descarga de Archivos (/download/*)
            if (path.startsWith("/download/")) {
                String filename = path.substring(10);
                serveDownload(filename, true, out);
                return;
            }

            // Visualización directa de Archivos (/view/*)
            if (path.startsWith("/view/")) {
                String filename = path.substring(6);
                serveDownload(filename, false, out);
                return;
            }

            // Subida de Archivos (/upload, /upload-chunk, POST /)
            if ("POST".equals(method) && (path.equals("/") || path.equals("/upload") || path.equals("/upload-chunk"))) {
                handleUpload(headers, in, out);
                return;
            }

            // Vistas HTML
            if ("GET".equals(method)) {
                if (path.equals("/") || path.equals("/index.html")) {
                    serveHomeHtml(out);
                    return;
                } else if (path.equals("/update") || path.equals("/Up_Data")) {
                    serveTemplatePage("templates/Up_Data.html", "/update", out);
                    return;
                } else if (path.equals("/settings")) {
                    serveTemplatePage("templates/settings.html", "/settings", out);
                    return;
                } else if (path.equals("/Qr_Generator")) {
                    serveQrGeneratorPage(out);
                    return;
                }
            }

            // Fallback 404
            sendResponse(out, 404, "text/plain", "404 Not Found".getBytes(StandardCharsets.UTF_8));
        }

        private void serveHomeHtml(OutputStream out) throws Exception {
            String layout = readAssetString("templates/layout.html");
            String indexTemplate = readAssetString("templates/index.html");

            // Extraer bloques content y scripts de index.html
            String contentBlock = extractBlock(indexTemplate, "content");
            String scriptsBlock = extractBlock(indexTemplate, "scripts");

            // Generar tarjetas de archivos
            File dir = getStorageDir();
            File[] files = dir.listFiles();
            List<File> fileList = new ArrayList<>();
            if (files != null) {
                for (File f : files) {
                    if (f.isFile() && !f.getName().startsWith(".")) {
                        fileList.add(f);
                    }
                }
            }

            // Ordenar: fijados primero, luego por fecha más reciente
            final Set<String> pinned = getPinnedFiles();
            Collections.sort(fileList, (a, b) -> {
                boolean pa = pinned.contains(a.getName());
                boolean pb = pinned.contains(b.getName());
                if (pa && !pb) return -1;
                if (!pa && pb) return 1;
                return Long.compare(b.lastModified(), a.lastModified());
            });

            String fileListHtml;
            if (fileList.isEmpty()) {
                fileListHtml = "<div class=\"empty-state-card\">\n"
                        + "    <div class=\"empty-icon-circle\">\n"
                        + "        <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"/><polyline points=\"13 2 13 9 20 9\"/></svg>\n"
                        + "    </div>\n"
                        + "    <h3 class=\"empty-title\">No hay archivos compartidos aún</h3>\n"
                        + "    <p class=\"empty-text\">Arrastra un archivo en el recuadro superior o pulsa el botón flotante para compartir el primero desde tu teléfono o PC.</p>\n"
                        + "</div>\n";
            } else {
                StringBuilder sb = new StringBuilder();
                sb.append("<div class=\"file-list-container\" id=\"FileListContainer\">\n");
                sb.append("    <div class=\"file-list-header\">\n");
                sb.append("        <span class=\"file-count-label\">").append(fileList.size())
                        .append(fileList.size() == 1 ? " archivo disponible" : " archivos disponibles").append("</span>\n");
                sb.append("        <span class=\"file-mobile-hint\">\n");
                sb.append("            <span class=\"hint-pill hint-pill-delete\">➔ Deslizar para Borrar</span>\n");
                sb.append("            <span class=\"hint-pill hint-pill-pin\">⬅ Deslizar para Fijar</span>\n");
                sb.append("        </span>\n");
                sb.append("    </div>\n");
                sb.append("    <div class=\"file-list-body\" id=\"FileListBody\">\n");

                for (File f : fileList) {
                    sb.append(renderFileCard(f, pinned.contains(f.getName())));
                }

                sb.append("    </div>\n");
                sb.append("</div>\n");
                fileListHtml = sb.toString();
            }

            // Reemplazar la sección dinámica de File (desde {% if File %} hasta el último {% endif %})
            int ifFileIdx = contentBlock.indexOf("{% if File %}");
            int skeletonsIdx = contentBlock.indexOf("<!-- Skeletons");
            int endIfIdx = (skeletonsIdx > 0) ? contentBlock.lastIndexOf("{% endif %}", skeletonsIdx) : contentBlock.lastIndexOf("{% endif %}");
            if (ifFileIdx >= 0 && endIfIdx > ifFileIdx) {
                contentBlock = contentBlock.substring(0, ifFileIdx) + fileListHtml + contentBlock.substring(endIfIdx + 11);
            }

            String fullPage = mergeLayout(layout, contentBlock, scriptsBlock, "/");
            sendResponse(out, 200, "text/html; charset=UTF-8", fullPage.getBytes(StandardCharsets.UTF_8));
        }

        private String renderFileCard(File f, boolean isPinned) {
            String name = f.getName();
            String nameLower = name.toLowerCase(Locale.ROOT);
            int dot = name.lastIndexOf('.');
            String ext = dot > 0 ? name.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
            String extUpper = ext.isEmpty() ? "ARCHIVO" : ext.toUpperCase(Locale.ROOT);
            String sizeStr = formatFileSize(f.length());
            String dateStr = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(new Date(f.lastModified()));
            String encName;
            try {
                encName = URLEncoder.encode(name, "UTF-8").replace("+", "%20");
            } catch (Exception e) {
                encName = name;
            }

            String iconSvg = getIconSvgForExt(ext);
            String pinnedStyle = isPinned ? "" : "display: none;";

            return "<div class=\"file-item-wrapper\" data-touch-swipe=\"true\" data-name=\"" + escapeHtml(nameLower) + "\" data-type=\"" + ext + "\" data-filename=\"" + escapeHtml(name) + "\">\n"
                    + "    <div class=\"file-swipe-actions-bg\" aria-hidden=\"true\">\n"
                    + "        <div class=\"swipe-reveal-action swipe-reveal-delete\">\n"
                    + "            <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/></svg>\n"
                    + "            <span>Borrar</span>\n"
                    + "        </div>\n"
                    + "        <div class=\"swipe-reveal-action swipe-reveal-pin\">\n"
                    + "            <span class=\"pin-label-text\">" + (isPinned ? "Desfijar" : "Fijar") + "</span>\n"
                    + "            <svg class=\"pin-svg-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"17\" x2=\"12\" y2=\"22\"/><path d=\"M5 17h14v-2l-2-2V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v8l-2 2v2z\"/></svg>\n"
                    + "        </div>\n"
                    + "    </div>\n"
                    + "    <div class=\"file-item-card\" data-name=\"" + escapeHtml(nameLower) + "\" data-type=\"" + ext + "\">\n"
                    + "        <div class=\"file-item-main\" data-action=\"preview\" data-filename=\"" + escapeHtml(name) + "\" data-type=\"" + ext + "\">\n"
                    + "            <div class=\"file-icon-box type-" + ext + "\">" + iconSvg + "</div>\n"
                    + "            <div class=\"file-info\">\n"
                    + "                <div class=\"file-title-row\">\n"
                    + "                    <span class=\"file-title-text\" title=\"" + escapeHtml(name) + "\">" + escapeHtml(name) + "</span>\n"
                    + "                    <span class=\"pinned-badge\" title=\"Archivo fijado al inicio\" style=\"" + pinnedStyle + "\">\n"
                    + "                        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"12\" y1=\"17\" x2=\"12\" y2=\"22\"/><path d=\"M5 17h14v-2l-2-2V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v8l-2 2v2z\"/></svg>\n"
                    + "                        <span>Fijado</span>\n"
                    + "                    </span>\n"
                    + "                </div>\n"
                    + "                <div class=\"file-meta-subtext\">\n"
                    + "                    <span class=\"meta-tag\">" + extUpper + "</span>\n"
                    + "                    <span class=\"meta-dot\">•</span>\n"
                    + "                    <span class=\"meta-size\">" + sizeStr + "</span>\n"
                    + "                    <span class=\"meta-dot\">•</span>\n"
                    + "                    <span class=\"meta-date\">" + dateStr + "</span>\n"
                    + "                </div>\n"
                    + "            </div>\n"
                    + "        </div>\n"
                    + "        <div class=\"file-item-actions\">\n"
                    + "            <button type=\"button\" class=\"btn-action btn-preview\" data-action=\"preview\" data-filename=\"" + escapeHtml(name) + "\" data-type=\"" + ext + "\" title=\"Previsualizar\">\n"
                    + "                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>\n"
                    + "                <span>Ver</span>\n"
                    + "            </button>\n"
                    + "            <button type=\"button\" class=\"btn-action btn-copy\" data-action=\"copy-link\" data-url=\"/download/" + encName + "\" title=\"Copiar enlace de descarga\">\n"
                    + "                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"/><path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"/></svg>\n"
                    + "                <span>Copiar</span>\n"
                    + "            </button>\n"
                    + "            <a href=\"/download/" + encName + "\" class=\"btn-action btn-download\" download title=\"Descargar a este dispositivo\">\n"
                    + "                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg>\n"
                    + "                <span>Bajar</span>\n"
                    + "            </a>\n"
                    + "            <button type=\"button\" class=\"btn-action btn-delete\" data-action=\"open-delete\" data-filename=\"" + escapeHtml(name) + "\" title=\"Eliminar archivo\">\n"
                    + "                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/></svg>\n"
                    + "            </button>\n"
                    + "        </div>\n"
                    + "    </div>\n"
                    + "</div>\n";
        }

        private void serveTemplatePage(String templatePath, String reqPath, OutputStream out) throws Exception {
            String layout = readAssetString("templates/layout.html");
            String page = readAssetString(templatePath);
            String content = extractBlock(page, "content");
            String scripts = extractBlock(page, "scripts");
            String fullPage = mergeLayout(layout, content, scripts, reqPath);
            sendResponse(out, 200, "text/html; charset=UTF-8", fullPage.getBytes(StandardCharsets.UTF_8));
        }

        private void serveQrGeneratorPage(OutputStream out) throws Exception {
            String layout = readAssetString("templates/layout.html");
            String qrPage = readAssetString("templates/Qr_Generator.html");
            String content = extractBlock(qrPage, "content");
            String scripts = extractBlock(qrPage, "scripts");

            String fullPage = mergeLayout(layout, content, scripts, "/Qr_Generator");
            sendResponse(out, 200, "text/html; charset=UTF-8", fullPage.getBytes(StandardCharsets.UTF_8));
        }

        private void serveQrImage(OutputStream out) throws Exception {
            byte[] png = QrUtil.generatePng(getServerUrl(), 8, 4);
            sendResponse(out, 200, "image/png", png);
        }

        private void serveAsset(String assetPath, OutputStream out) throws Exception {
            try {
                InputStream is = context.getAssets().open(assetPath);
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] temp = new byte[8192];
                int read;
                while ((read = is.read(temp)) != -1) {
                    buffer.write(temp, 0, read);
                }
                is.close();
                String mime = getMimeType(assetPath);
                sendResponse(out, 200, mime, buffer.toByteArray());
            } catch (IOException e) {
                sendResponse(out, 404, "text/plain", "Asset no encontrado".getBytes(StandardCharsets.UTF_8));
            }
        }

        private void serveDownload(String filename, boolean asAttachment, OutputStream out) throws Exception {
            File file = new File(getStorageDir(), filename);
            if (!file.exists() || !file.isFile()) {
                sendResponse(out, 404, "text/plain", "Archivo no encontrado".getBytes(StandardCharsets.UTF_8));
                return;
            }

            String mime = getMimeType(filename);
            String encName = URLEncoder.encode(filename, "UTF-8").replace("+", "%20");

            StringBuilder headers = new StringBuilder();
            headers.append("HTTP/1.1 200 OK\r\n");
            headers.append("Content-Type: ").append(mime).append("\r\n");
            headers.append("Content-Length: ").append(file.length()).append("\r\n");
            if (asAttachment) {
                headers.append("Content-Disposition: attachment; filename=\"").append(filename).append("\"; filename*=UTF-8''").append(encName).append("\r\n");
            } else {
                headers.append("Content-Disposition: inline; filename=\"").append(filename).append("\"\r\n");
            }
            headers.append("Connection: close\r\n\r\n");

            out.write(headers.toString().getBytes(StandardCharsets.UTF_8));

            InputStream fis = new BufferedInputStream(new FileInputStream(file));
            byte[] buf = new byte[16384];
            int read;
            while ((read = fis.read(buf)) != -1) {
                out.write(buf, 0, read);
            }
            fis.close();
        }

        private void handleDeleteFile(String filename, OutputStream out) throws Exception {
            File f = new File(getStorageDir(), filename);
            boolean ok = false;
            if (f.exists() && f.isFile()) {
                ok = f.delete();
            }
            sendJsonResponse(out, 200, "{\"success\":" + ok + "}");
        }

        private void handlePinFile(String filename, OutputStream out) throws Exception {
            Set<String> pinned = getPinnedFiles();
            boolean newState;
            if (pinned.contains(filename)) {
                pinned.remove(filename);
                newState = false;
            } else {
                pinned.add(filename);
                newState = true;
            }
            savePinnedFiles(pinned);
            sendJsonResponse(out, 200, "{\"success\":true,\"pinned\":" + newState + "}");
        }

        private void handleSyncStatus(OutputStream out) throws Exception {
            File[] files = getStorageDir().listFiles();
            int count = 0;
            long latestMtime = 0;
            if (files != null) {
                for (File f : files) {
                    if (f.isFile() && !f.getName().startsWith(".")) {
                        count++;
                        if (f.lastModified() > latestMtime) {
                            latestMtime = f.lastModified();
                        }
                    }
                }
            }
            sendJsonResponse(out, 200, "{\"count\":" + count + ",\"latest_mtime\":" + latestMtime + "}");
        }

        private void handleThemePost(Map<String, String> headers, InputStream in, OutputStream out) throws Exception {
            int len = 0;
            try {
                len = Integer.parseInt(headers.get("content-length"));
            } catch (Exception ignored) {}

            byte[] bodyBytes = readExact(in, len);
            String body = new String(bodyBytes, StandardCharsets.UTF_8);

            // Extraer "theme": "..."
            int idx = body.indexOf("\"theme\":");
            if (idx >= 0) {
                int startQuote = body.indexOf('\"', idx + 8);
                int endQuote = body.indexOf('\"', startQuote + 1);
                if (startQuote > 0 && endQuote > startQuote) {
                    String theme = body.substring(startQuote + 1, endQuote);
                    prefs.edit().putString("current_theme", theme).apply();
                }
            }
            sendJsonResponse(out, 200, "{\"success\":true}");
        }

        private void handleUpload(Map<String, String> headers, InputStream in, OutputStream out) throws Exception {
            String ctype = headers.get("content-type");
            int len = 0;
            try {
                len = Integer.parseInt(headers.get("content-length"));
            } catch (Exception ignored) {}

            if (ctype != null && ctype.contains("multipart/form-data")) {
                parseAndSaveMultipart(ctype, in, len);
            } else {
                // Chunk upload directo o cabecera x-filename
                String filename = headers.get("x-filename");
                if (filename == null) filename = "archivo_" + System.currentTimeMillis() + ".bin";
                filename = URLDecoder.decode(filename, "UTF-8");

                File target = new File(getStorageDir(), sanitizeFilename(filename));
                FileOutputStream fos = new FileOutputStream(target);
                byte[] buf = new byte[8192];
                int remaining = len;
                while (remaining > 0) {
                    int r = in.read(buf, 0, Math.min(buf.length, remaining));
                    if (r <= 0) break;
                    fos.write(buf, 0, r);
                    remaining -= r;
                }
                fos.close();
            }

            sendJsonResponse(out, 200, "{\"success\":true,\"message\":\"Subido correctamente\"}");
        }

        private void parseAndSaveMultipart(String contentType, InputStream in, int totalLength) throws Exception {
            String boundaryMarker = "boundary=";
            int bIdx = contentType.indexOf(boundaryMarker);
            if (bIdx < 0) return;
            String boundary = "--" + contentType.substring(bIdx + boundaryMarker.length()).trim();
            byte[] boundaryBytes = boundary.getBytes(StandardCharsets.UTF_8);

            // Leer flujo multipart
            byte[] data = readExact(in, totalLength);
            int pos = 0;

            while (pos < data.length) {
                int partStart = indexOf(data, boundaryBytes, pos);
                if (partStart < 0) break;
                partStart += boundaryBytes.length;

                // Fin de headers de parte (\r\n\r\n)
                byte[] headerSep = "\r\n\r\n".getBytes(StandardCharsets.UTF_8);
                int hEnd = indexOf(data, headerSep, partStart);
                if (hEnd < 0) break;

                String partHeader = new String(data, partStart, hEnd - partStart, StandardCharsets.UTF_8);
                int bodyStart = hEnd + headerSep.length;

                int nextBoundary = indexOf(data, boundaryBytes, bodyStart);
                if (nextBoundary < 0) break;

                int bodyEnd = nextBoundary - 2; // Descartar \r\n anterior

                if (partHeader.contains("filename=")) {
                    String fnMarker = "filename=\"";
                    int fStart = partHeader.indexOf(fnMarker);
                    if (fStart >= 0) {
                        fStart += fnMarker.length();
                        int fEnd = partHeader.indexOf("\"", fStart);
                        if (fEnd > fStart) {
                            String filename = partHeader.substring(fStart, fEnd);
                            if (!filename.isEmpty()) {
                                File outFile = new File(getStorageDir(), sanitizeFilename(filename));
                                FileOutputStream fos = new FileOutputStream(outFile);
                                fos.write(data, bodyStart, bodyEnd - bodyStart);
                                fos.close();
                            }
                        }
                    }
                }
                pos = nextBoundary;
            }
        }

        private int indexOf(byte[] src, byte[] target, int start) {
            for (int i = start; i <= src.length - target.length; i++) {
                boolean match = true;
                for (int j = 0; j < target.length; j++) {
                    if (src[i + j] != target[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) return i;
            }
            return -1;
        }

        private byte[] readExact(InputStream in, int len) throws IOException {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int remaining = len;
            while (remaining > 0) {
                int r = in.read(buf, 0, Math.min(buf.length, remaining));
                if (r <= 0) break;
                baos.write(buf, 0, r);
                remaining -= r;
            }
            return baos.toByteArray();
        }

        private String extractBlock(String template, String blockName) {
            String startMarker = "{% block " + blockName + " %}";
            String endMarker = "{% endblock %}";
            int s = template.indexOf(startMarker);
            if (s < 0) return "";
            int e = template.indexOf(endMarker, s + startMarker.length());
            if (e > s) {
                return template.substring(s + startMarker.length(), e).trim();
            }
            return "";
        }

        private String mergeLayout(String layout, String content, String scripts, String activePath) {
            String ip = getDeviceIp();
            String combined = layout.replace("{% block content %}\n        {% endblock %}", content)
                                    .replace("{% block content %}{% endblock %}", content)
                                    .replace("{% block content %}", content)
                                    .replace("{% block scripts %}{% endblock %}", scripts)
                                    .replace("{% block scripts %}\n    {% endblock %}", scripts)
                                    .replace("{% block scripts %}", scripts);

            // Reemplazar IP y protocolo dinámicos
            combined = combined.replace("{{ protocolo | default(value=\"http\") }}", "http")
                               .replace("{{ ip_local | default(value=\"127.0.0.1\") }}", ip);

            // Marcar enlaces activos
            combined = combined.replace("{% if request.path == '/' %}active{% endif %}", "/".equals(activePath) ? "active" : "")
                               .replace("{% if request.path == '/update' %}active{% endif %}", "/update".equals(activePath) ? "active" : "")
                               .replace("{% if request.path == '/settings' %}active{% endif %}", "/settings".equals(activePath) ? "active" : "");

            return combined;
        }

        private void sendJsonResponse(OutputStream out, int status, String json) throws IOException {
            sendResponse(out, status, "application/json; charset=UTF-8", json.getBytes(StandardCharsets.UTF_8));
        }

        private void sendResponse(OutputStream out, int status, String mime, byte[] body) throws IOException {
            String statusText = (status == 200) ? "OK" : (status == 404 ? "Not Found" : "Internal Server Error");
            StringBuilder sb = new StringBuilder();
            sb.append("HTTP/1.1 ").append(status).append(" ").append(statusText).append("\r\n");
            sb.append("Content-Type: ").append(mime).append("\r\n");
            sb.append("Content-Length: ").append(body.length).append("\r\n");
            sb.append("Access-Control-Allow-Origin: *\r\n");
            sb.append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");
            sb.append("Connection: close\r\n\r\n");

            out.write(sb.toString().getBytes(StandardCharsets.UTF_8));
            out.write(body);
        }

        private String readAssetString(String path) throws IOException {
            InputStream is = context.getAssets().open(path);
            BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            reader.close();
            return sb.toString();
        }

        private String sanitizeFilename(String filename) {
            return filename.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        }

        private String escapeHtml(String text) {
            return text.replace("&", "&amp;")
                       .replace("<", "&lt;")
                       .replace(">", "&gt;")
                       .replace("\"", "&quot;");
        }

        private String formatFileSize(long bytes) {
            if (bytes < 1024) return bytes + " B";
            int exp = (int) (Math.log(bytes) / Math.log(1024));
            char pre = "KMGTPE".charAt(exp - 1);
            return String.format(Locale.US, "%.1f %cB", bytes / Math.pow(1024, exp), pre);
        }

        private String getMimeType(String name) {
            String lower = name.toLowerCase(Locale.ROOT);
            if (lower.endsWith(".html")) return "text/html; charset=UTF-8";
            if (lower.endsWith(".css")) return "text/css; charset=UTF-8";
            if (lower.endsWith(".js")) return "application/javascript; charset=UTF-8";
            if (lower.endsWith(".json")) return "application/json; charset=UTF-8";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".gif")) return "image/gif";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            if (lower.endsWith(".ico")) return "image/x-icon";
            if (lower.endsWith(".mp4")) return "video/mp4";
            if (lower.endsWith(".mp3")) return "audio/mpeg";
            if (lower.endsWith(".pdf")) return "application/pdf";
            if (lower.endsWith(".zip")) return "application/zip";
            return "application/octet-stream";
        }

        private String getIconSvgForExt(String ext) {
            if (Arrays.asList("jpg", "jpeg", "png", "gif", "webp", "svg", "heic").contains(ext)) {
                return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" ry=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><polyline points=\"21 15 16 10 5 21\"/></svg>";
            } else if (Arrays.asList("mp4", "webm", "ogg", "mov", "avi", "mkv").contains(ext)) {
                return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polygon points=\"23 7 16 12 23 17 23 7\"/><rect x=\"1\" y=\"5\" width=\"15\" height=\"14\" rx=\"2\" ry=\"2\"/></svg>";
            } else if (Arrays.asList("mp3", "wav", "aac", "flac", "m4a", "opus").contains(ext)) {
                return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 18V5l12-2v13\"/><circle cx=\"6\" cy=\"18\" r=\"3\"/><circle cx=\"18\" cy=\"16\" r=\"3\"/></svg>";
            } else if (Arrays.asList("zip", "rar", "7z", "tar", "gz").contains(ext)) {
                return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\"/><polyline points=\"3.27 6.96 12 12.01 20.73 6.96\"/><line x1=\"12\" y1=\"22.08\" x2=\"12\" y2=\"12\"/></svg>";
            } else {
                return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z\"/><polyline points=\"14 2 14 8 20 8\"/></svg>";
            }
        }
    }

    private Set<String> getPinnedFiles() {
        return new HashSet<>(prefs.getStringSet("pinned_files", Collections.<String>emptySet()));
    }

    private void savePinnedFiles(Set<String> pinned) {
        prefs.edit().putStringSet("pinned_files", pinned).apply();
    }
}
