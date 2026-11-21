# Script de compilación para Android App Bundle (.aab) oficial de Google Play (Modo Lanzamiento / Release)
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
$Bundletool = "$SdkPath\bundletool.jar"

$AppDir = "$PSScriptRoot\app"
$SrcDir = "$AppDir\src\main"
$ResDir = "$SrcDir\res"
$AssetsDir = "$SrcDir\assets"
$Manifest = "$SrcDir\AndroidManifest.xml"
$JavaSrc = "$SrcDir\java"

$WorkDir = "$PSScriptRoot\build_aab_temp"
if (Test-Path $WorkDir) { Remove-Item -Recurse -Force $WorkDir }
New-Item -ItemType Directory -Force -Path "$WorkDir\compiled_res", "$WorkDir\gen", "$WorkDir\classes", "$WorkDir\dex", "$WorkDir\base", "$WorkDir\base\manifest", "$WorkDir\base\dex" | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Host "==> 1. Compilando recursos con aapt2..." -ForegroundColor Cyan
& "$BuildTools\aapt2.exe" compile --dir "$ResDir" -o "$WorkDir\compiled_res.zip"

Write-Host "==> 2. Generando R.java y enlazando recursos proto para AAB..." -ForegroundColor Cyan
# Enlace estándar para R.java
& "$BuildTools\aapt2.exe" link `
    -I "$AndroidJar" `
    --manifest "$Manifest" `
    --min-sdk-version 24 `
    --target-sdk-version 36 `
    --version-code 5 `
    --version-name "0.3.0" `
    --java "$WorkDir\gen" `
    --custom-package "com.nioydev.netdrop" `
    --auto-add-overlay `
    "$WorkDir\compiled_res.zip" `
    -o "$WorkDir\dummy.apk"

# Enlace en formato proto (requerido para AAB)
& "$BuildTools\aapt2.exe" link `
    -I "$AndroidJar" `
    --manifest "$Manifest" `
    --min-sdk-version 24 `
    --target-sdk-version 36 `
    --version-code 5 `
    --version-name "0.3.0" `
    --proto-format `
    --auto-add-overlay `
    "$WorkDir\compiled_res.zip" `
    -o "$WorkDir\base_linked.zip"

Write-Host "==> 3. Compilando código Java con javac (JDK 17)..." -ForegroundColor Cyan
$Sources = Get-ChildItem -Path "$WorkDir\gen", "$JavaSrc" -Filter "*.java" -Recurse | Select-Object -ExpandProperty FullName
& "$JavaBin\javac.exe" -encoding UTF-8 -cp "$AndroidJar" -d "$WorkDir\classes" $Sources

Write-Host "==> 4. Generando bytecode Dalvik (classes.dex) con d8..." -ForegroundColor Cyan
$ClassFiles = Get-ChildItem -Path "$WorkDir\classes" -Filter "*.class" -Recurse | Select-Object -ExpandProperty FullName
$env:JAVA_HOME = "$SdkPath\jdk-17"
$env:PATH = "$JavaBin;$env:PATH"
& "$BuildTools\d8.bat" --lib "$AndroidJar" --output "$WorkDir\dex" $ClassFiles

Write-Host "==> 5. Estructurando módulo base para bundletool..." -ForegroundColor Cyan
Expand-Archive -Path "$WorkDir\base_linked.zip" -DestinationPath "$WorkDir\base_extracted" -Force

# Manifest en manifest/AndroidManifest.xml
Move-Item -Path "$WorkDir\base_extracted\AndroidManifest.xml" -Destination "$WorkDir\base\manifest\AndroidManifest.xml" -Force

# Tabla de recursos y archivos de recursos
if (Test-Path "$WorkDir\base_extracted\resources.pb") {
    Move-Item -Path "$WorkDir\base_extracted\resources.pb" -Destination "$WorkDir\base\resources.pb" -Force
}
if (Test-Path "$WorkDir\base_extracted\res") {
    Move-Item -Path "$WorkDir\base_extracted\res" -Destination "$WorkDir\base\res" -Force
}

# Dex en dex/classes.dex
Copy-Item -Path "$WorkDir\dex\classes.dex" -Destination "$WorkDir\base\dex\classes.dex" -Force

# Assets en assets/
if (Test-Path $AssetsDir) {
    Copy-Item -Path $AssetsDir -Destination "$WorkDir\base\assets" -Recurse -Force
}

# Empaquetar base.zip usando jar
Set-Location "$WorkDir\base"
& "$JavaBin\jar.exe" -cMf "$WorkDir\base.zip" *
Set-Location $PSScriptRoot

Write-Host "==> 6. Construyendo Android App Bundle (.aab) con bundletool..." -ForegroundColor Cyan
$UnsignedAab = "$WorkDir\NetDrop-unsigned.aab"
& "$JavaBin\java.exe" -jar "$Bundletool" build-bundle --modules="$WorkDir\base.zip" --output="$UnsignedAab"

Write-Host "==> 7. Firmando AAB en Modo Lanzamiento (Release) con jarsigner..." -ForegroundColor Cyan
$FinalAab = "$OutputDir\NetDrop-Android.aab"
if (Test-Path $FinalAab) { Remove-Item -Force $FinalAab }
Copy-Item -Path $UnsignedAab -Destination $FinalAab -Force

& "$JavaBin\jarsigner.exe" -keystore "$Keystore" -storepass "$KeyPass" -keypass "$KeyPass" `
    -sigalg SHA256withRSA -digestalg SHA-256 `
    "$FinalAab" "$KeyAlias"

Write-Host "==> 8. Verificando AAB con bundletool validate..." -ForegroundColor Cyan
& "$JavaBin\java.exe" -jar "$Bundletool" validate --bundle="$FinalAab"

# Limpieza
Remove-Item -Recurse -Force $WorkDir

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [OK] Android App Bundle (.aab) creado exitosamente:" -ForegroundColor Green
Write-Host "      $FinalAab" -ForegroundColor Green
$hash = (Get-FileHash -Algorithm SHA256 $FinalAab).Hash
$size = [math]::Round(((Get-Item $FinalAab).Length / 1MB), 2)
Write-Host " Tamaño: $size MB | SHA256: $hash" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
