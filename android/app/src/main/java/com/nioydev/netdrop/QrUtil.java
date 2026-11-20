package com.nioydev.netdrop;

import android.graphics.Bitmap;
import android.graphics.Color;
import java.io.ByteArrayOutputStream;

public class QrUtil {

    public static String generateSvg(String text, int border) {
        QrCode qr = QrCode.encodeText(text, QrCode.Ecc.MEDIUM);
        int size = qr.size + border * 2;
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ")
          .append(size).append(" ").append(size).append("\" stroke=\"none\">\n");
        sb.append("<rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>\n");
        sb.append("<path d=\"");
        for (int y = 0; y < qr.size; y++) {
            for (int x = 0; x < qr.size; x++) {
                if (qr.getModule(x, y)) {
                    sb.append("M").append(x + border).append(",").append(y + border).append("h1v1h-1z ");
                }
            }
        }
        sb.append("\" fill=\"#000000\"/>\n");
        sb.append("</svg>");
        return sb.toString();
    }

    public static byte[] generatePng(String text, int scale, int border) {
        QrCode qr = QrCode.encodeText(text, QrCode.Ecc.MEDIUM);
        int qrSize = qr.size;
        int imgSize = (qrSize + border * 2) * scale;
        Bitmap bitmap = Bitmap.createBitmap(imgSize, imgSize, Bitmap.Config.ARGB_8888);
        bitmap.eraseColor(Color.WHITE);

        for (int y = 0; y < qrSize; y++) {
            for (int x = 0; x < qrSize; x++) {
                if (qr.getModule(x, y)) {
                    for (int dy = 0; dy < scale; dy++) {
                        for (int dx = 0; dx < scale; dx++) {
                            bitmap.setPixel((x + border) * scale + dx, (y + border) * scale + dy, Color.BLACK);
                        }
                    }
                }
            }
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos);
        return baos.toByteArray();
    }
}
