# Script de compilación local para NetDrop Android APK
param (
    [string]$SdkPath = "C:\Users\migue\AndroidSDK",
    [string]$OutputDir = "$PSScriptRoot\..\dist",
    [string]$Keystore = "$PSScriptRoot\netdrop-release.keystore",
    [string]$KeyAlias = "netdrop",
    [string]$KeyPass = "NetDrop2026!"
)

$ErrorActionPreference = "Stop"

$BuildTools = "$SdkPath\build-tools\34.0.0"
$AndroidJar = if (Test-Path "$SdkPath\platforms\android-36\android.jar") { "$SdkPath\platforms\android-36\android.jar" } else { "$SdkPath\platforms\android-34\android.jar" }
$JavaBin = "$SdkPath\jdk-17\bin"
if (-not (Test-Path $Keystore)) {
    if (Test-Path "$SdkPath\netdrop-release.keystore") {
        $Keystore = "$SdkPath\netdrop-release.keystore"
    } else {
        $Keystore = "$SdkPath\debug.keystore"
        $KeyAlias = "androiddebugkey"
        $KeyPass = "android"
    }
}

$AppDir = "$PSScriptRoot\app"
$SrcDir = "$AppDir\src\main"
$ResDir = "$SrcDir\res"
$AssetsDir = "$SrcDir\assets"
$Manifest = "$SrcDir\AndroidManifest.xml"
$JavaSrc = "$SrcDir\java"

$WorkDir = "$PSScriptRoot\build_temp"
if (Test-Path $WorkDir) { Remove-Item -Recurse -Force $WorkDir }
New-Item -ItemType Directory -Force -Path "$WorkDir\compiled_res", "$WorkDir\gen", "$WorkDir\classes", "$WorkDir\dex" | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Host "==> 1. Compilando recursos con aapt2..." -ForegroundColor Cyan
& "$BuildTools\aapt2.exe" compile --dir "$ResDir" -o "$WorkDir\compiled_res.zip"

Write-Host "==> 2. Enlazando paquete con aapt2..." -ForegroundColor Cyan
& "$BuildTools\aapt2.exe" link `
    -I "$AndroidJar" `
    --manifest "$Manifest" `
    --min-sdk-version 24 `
    --target-sdk-version 36 `
    --version-code 3 `
    --version-name "0.2.0" `
    --java "$WorkDir\gen" `
    --custom-package "com.nioydev.netdrop" `
    -o "$WorkDir\app-unaligned.apk" `
    --auto-add-overlay `
    "$WorkDir\compiled_res.zip"

Write-Host "==> 3. Compilando código Java con javac (JDK 17)..." -ForegroundColor Cyan
$Sources = Get-ChildItem -Path "$WorkDir\gen", "$JavaSrc" -Filter "*.java" -Recurse | Select-Object -ExpandProperty FullName
& "$JavaBin\javac.exe" -encoding UTF-8 -cp "$AndroidJar" -d "$WorkDir\classes" $Sources

Write-Host "==> 4. Generando bytecode Dalvik (classes.dex) con d8..." -ForegroundColor Cyan
$ClassFiles = Get-ChildItem -Path "$WorkDir\classes" -Filter "*.class" -Recurse | Select-Object -ExpandProperty FullName
$env:JAVA_HOME = "$SdkPath\jdk-17"
$env:PATH = "$JavaBin;$env:PATH"
& "$BuildTools\d8.bat" --lib "$AndroidJar" --output "$WorkDir\dex" $ClassFiles

Write-Host "==> 5. Incorporando classes.dex y assets al APK..." -ForegroundColor Cyan
# Usar jar para agregar classes.dex y assets con separadores de ruta estándar
Set-Location "$WorkDir\dex"
& "$JavaBin\jar.exe" -uf "$WorkDir\app-unaligned.apk" classes.dex
Set-Location "$AppDir\src\main"
& "$JavaBin\jar.exe" -uf "$WorkDir\app-unaligned.apk" assets
Set-Location $PSScriptRoot

Write-Host "==> 6. Alineando APK con zipalign (4 bytes)..." -ForegroundColor Cyan
& "$BuildTools\zipalign.exe" -p -f 4 "$WorkDir\app-unaligned.apk" "$WorkDir\app-aligned.apk"

Write-Host "==> 7. Firmando APK en Modo Lanzamiento (Release) con apksigner (V1 + V2 + V3)..." -ForegroundColor Cyan
$FinalApk = "$OutputDir\NetDrop-Android.apk"
if (Test-Path $FinalApk) { Remove-Item -Force $FinalApk }

& "$BuildTools\apksigner.bat" sign `
    --ks "$Keystore" `
    --ks-pass "pass:$KeyPass" `
    --ks-key-alias "$KeyAlias" `
    --key-pass "pass:$KeyPass" `
    --out "$FinalApk" `
    "$WorkDir\app-aligned.apk"

Write-Host "==> 8. Verificando firma del APK..." -ForegroundColor Cyan
& "$BuildTools\apksigner.bat" verify --verbose "$FinalApk"

# Limpieza
Remove-Item -Recurse -Force $WorkDir

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [OK] APK compilado exitosamente: $FinalApk" -ForegroundColor Green
$hash = (Get-FileHash -Algorithm SHA256 $FinalApk).Hash
$size = [math]::Round(((Get-Item $FinalApk).Length / 1MB), 2)
Write-Host " Tamaño: $size MB | SHA256: $hash" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
