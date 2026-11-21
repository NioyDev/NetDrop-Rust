# Reglas de optimización y ofuscación R8 para NetDrop
-allowaccessmodification
-repackageclasses 'com.nioydev.netdrop.internal'

# Preservar atributos de depuracion y trazado de pila para Play Console
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod

# Preservar clase principal MainActivity y metodos de ciclo de vida
-keep public class com.nioydev.netdrop.MainActivity {
    public *;
}

# Preservar metodos llamados desde Javascript en WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preservar servidor y utilidades necesarias
-keep class com.nioydev.netdrop.NetDropServer {
    public *;
}
-keep class com.nioydev.netdrop.BitBuffer { public *; }
-keep class com.nioydev.netdrop.QrCode { public *; }
-keep class com.nioydev.netdrop.QrSegment { public *; }
-keep class com.nioydev.netdrop.QrUtil { public *; }

# Preservar constructores de vistas de Android
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
}
