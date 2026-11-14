use std::collections::HashSet;
use std::sync::LazyLock;

pub const MAX_FILE_SIZE: u64 = 1000 * 1024 * 1024; // 1000 MB (1 GB)

pub static DOCUMENTS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "txt", "pdf", "doc", "docx", "docm", "dot", "dotx", "odt", "ott", "rtf", "md", "markdown",
        "tex", "log", "wpd", "wps", "pages", "xps", "oxps", "djvu", "epub", "mobi", "azw", "azw3",
        "fb2", "cbz", "cbr", "pub", "vsd", "vsdx", "one", "rst", "nfo", "text",
    ]
    .into_iter()
    .collect()
});

pub static SPREADSHEETS_PRESENTATIONS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "xls", "xlsx", "xlsm", "xlsb", "xlt", "xltx", "ods", "ots", "csv", "tsv", "numbers", "ppt",
        "pptx", "pptm", "pps", "ppsx", "pot", "potx", "odp", "otp", "key",
    ]
    .into_iter()
    .collect()
});

pub static IMAGES: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "png", "jpg", "jpeg", "jpe", "jfif", "gif", "webp", "heic", "heif", "avif", "bmp", "dib",
        "tiff", "tif", "svg", "svgz", "ico", "icns", "cur", "tga", "pcx", "ppm", "pgm", "pbm",
        "psd", "psb", "ai", "eps", "indd", "xcf", "kra", "sketch", "fig", "xd", "afdesign",
        "afphoto", "cdr", "jp2", "j2k", "jxl", "exr", "hdr", "apng", // RAW de cámaras
        "raw", "cr2", "cr3", "crw", "nef", "nrw", "arw", "srf", "sr2", "dng", "orf", "rw2", "raf",
        "pef", "srw", "3fr", "x3f", "rwl", "mrw",
    ]
    .into_iter()
    .collect()
});

pub static AUDIO: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "mp3", "wav", "aac", "m4a", "m4b", "opus", "ogg", "oga", "flac", "wma", "aiff", "aif",
        "aifc", "amr", "awb", "mid", "midi", "ape", "wv", "ac3", "dts", "mka", "ra", "caf", "au",
        "snd", "3ga", "weba", "m3u", "m3u8", "pls", "cue", "mod", "xm", "it", "s3m",
    ]
    .into_iter()
    .collect()
});

pub static VIDEO: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "f4v", "m4v", "mpg", "mpeg", "mpe",
        "3gp", "3g2", "ts", "mts", "m2ts", "vob", "ogv", "asf", "rm", "rmvb", "divx", "qt", "mxf",
        "dv", "swf",
    ]
    .into_iter()
    .collect()
});

pub static SUBTITLES: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    ["srt", "vtt", "ass", "ssa", "sub", "sbv", "idx", "lrc"]
        .into_iter()
        .collect()
});

pub static ARCHIVES: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "tbz2", "xz", "txz", "lz", "lzma", "z",
        "zst", "cab", "arj", "lzh", "iso", "img", "dmg", "vhd", "vhdx", "vmdk",
    ]
    .into_iter()
    .collect()
});

pub static CODE: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "py",
        "pyw",
        "ipynb",
        "js",
        "mjs",
        "cjs",
        "jsx",
        "ts",
        "tsx",
        "html",
        "htm",
        "xhtml",
        "css",
        "scss",
        "sass",
        "less",
        "vue",
        "svelte",
        "astro",
        "java",
        "class",
        "kt",
        "kts",
        "scala",
        "groovy",
        "gradle",
        "c",
        "h",
        "cpp",
        "cc",
        "cxx",
        "hpp",
        "hh",
        "cs",
        "vb",
        "fs",
        "go",
        "rs",
        "swift",
        "m",
        "mm",
        "php",
        "rb",
        "pl",
        "pm",
        "lua",
        "r",
        "jl",
        "dart",
        "ex",
        "exs",
        "erl",
        "hs",
        "clj",
        "cljs",
        "lisp",
        "el",
        "ml",
        "nim",
        "zig",
        "v",
        "asm",
        "s",
        "f",
        "f90",
        "cob",
        "pas",
        "d",
        "sql",
        "sqlite",
        "db",
        "mdb",
        "accdb",
        "psql",
        "sh",
        "bash",
        "zsh",
        "fish",
        "ps1",
        "psm1",
        "bat",
        "cmd",
        "makefile",
        "cmake",
        "dockerfile",
        "tf",
        "proto",
        "graphql",
        "gql",
        "sol",
        "wasm",
    ]
    .into_iter()
    .collect()
});

pub static DATA_CONFIG: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "json",
        "jsonl",
        "ndjson",
        "xml",
        "xsd",
        "xsl",
        "xslt",
        "yaml",
        "yml",
        "toml",
        "ini",
        "cfg",
        "conf",
        "env",
        "properties",
        "plist",
        "reg",
        "parquet",
        "avro",
        "orc",
        "feather",
        "pkl",
        "pickle",
        "npy",
        "npz",
        "h5",
        "hdf5",
        "mat",
        "sav",
        "dta",
        "rdata",
        "rds",
        "geojson",
        "kml",
        "kmz",
        "gpx",
        "shp",
        "shx",
        "dbf",
        "bib",
        "ris",
        "tmx",
        "po",
        "pot",
        "mo",
        "lock",
        "map",
        "pem",
        "crt",
        "cer",
        "key",
    ]
    .into_iter()
    .collect()
});

pub static FONTS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    ["ttf", "otf", "woff", "woff2", "eot", "ttc", "fon", "pfb"]
        .into_iter()
        .collect()
});

pub static MODELS_3D_CAD: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "obj", "stl", "fbx", "glb", "gltf", "3ds", "dae", "blend", "max", "ma", "mb", "c4d", "ply",
        "usd", "usdz", "3mf", "step", "stp", "iges", "igs", "dwg", "dxf", "skp", "gcode", "sldprt",
        "sldasm", "ipt", "iam", "rvt", "ifc",
    ]
    .into_iter()
    .collect()
});

pub static MISC: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "vcf", "ics", "ical", "eml", "msg", "mbox", "emlx", "torrent", "url", "webloc", "lnk",
        "ass", "sav", "save", "rom", "nes", "smc", "gba", "nds", "bak", "tmp", "old", "bin", "dat",
    ]
    .into_iter()
    .collect()
});

pub static RISKY: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    [
        "exe", "msi", "apk", "xapk", "aab", "ipa", "deb", "rpm", "pkg", "appimage", "snap",
        "flatpak", "jar", "war", "com", "scr", "dll", "sys", "so", "dylib", "vbs", "vbe", "wsf",
        "jse", "hta", "msp", "msc", "gadget", "app", "run", "bundle", "crx", "xpi", "cpl", "inf",
        "pif",
    ]
    .into_iter()
    .collect()
});

pub static ALLOWED_EXTENSIONS: LazyLock<HashSet<&'static str>> = LazyLock::new(|| {
    let mut all = HashSet::new();
    all.extend(DOCUMENTS.iter().copied());
    all.extend(SPREADSHEETS_PRESENTATIONS.iter().copied());
    all.extend(IMAGES.iter().copied());
    all.extend(AUDIO.iter().copied());
    all.extend(VIDEO.iter().copied());
    all.extend(SUBTITLES.iter().copied());
    all.extend(ARCHIVES.iter().copied());
    all.extend(CODE.iter().copied());
    all.extend(DATA_CONFIG.iter().copied());
    all.extend(FONTS.iter().copied());
    all.extend(MODELS_3D_CAD.iter().copied());
    all.extend(MISC.iter().copied());
    all.extend(RISKY.iter().copied());
    all
});

/// Valida si el archivo tiene una extensión permitida o si no tiene extensión
pub fn allowed_file(filename: &str) -> bool {
    if !filename.contains('.') {
        // Se permiten archivos sin extensión (ej. binarios de Linux)
        return true;
    }
    if let Some(ext) = filename.rsplit('.').next() {
        ALLOWED_EXTENSIONS.contains(ext.to_lowercase().as_str())
    } else {
        false
    }
}

/// Sanitiza un nombre de archivo siguiendo la especificación de werkzeug.secure_filename
/// Eliminando separadores de ruta, puntos iniciales y caracteres no seguros.
pub fn secure_filename(filename: &str) -> String {
    // 1. Extraer solo el nombre base descartando directorios (/ y \)
    let base = filename
        .replace('\\', "/")
        .rsplit('/')
        .next()
        .unwrap_or("")
        .to_string();

    // 2. Normalizar espacios a guiones bajos y filtrar caracteres permitidos: [a-zA-Z0-9_.-]
    let mut cleaned = String::with_capacity(base.len());
    for ch in base.chars() {
        if ch.is_ascii_alphanumeric() || ch == '.' || ch == '-' || ch == '_' {
            cleaned.push(ch);
        } else if ch.is_whitespace() {
            cleaned.push('_');
        }
    }

    // 3. Eliminar puntos y espacios al inicio y al final (evita archivos ocultos y traversal tipo ..)
    let trimmed = cleaned.trim_start_matches('.').trim();

    // 4. Si tras la limpieza está vacío o solo contiene caracteres no permitidos
    trimmed.to_string()
}
