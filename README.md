# Orbit Universal Remote

Prototype mobile-first untuk remote TV, AC, CCTV, dan perangkat custom.

## Penting: batasan browser
Browser web standar tidak memiliki API umum untuk mengakses IR blaster Android. Jadi UI ini berjalan penuh di browser, tetapi pengiriman IR asli membutuhkan wrapper Android/WebView (atau Capacitor/Cordova/custom native bridge) yang memanggil `ConsumerIrManager`.

File `AndroidIRBridge.kt` menunjukkan jembatan minimal. JavaScript akan otomatis mendeteksi `window.AndroidIR`.

## Jalankan cepat

```bash
python3 -m http.server 8080
```
Lalu buka `http://localhost:8080`.

## Struktur
- `index.html` — layout aplikasi
- `styles.css` — UI mobile-first modern
- `app.js` — state, remote, simulasi IR, hook native bridge
- `manifest.json` + `sw.js` — dasar PWA/offline
- `AndroidIRBridge.kt` — contoh bridge IR Android

## Yang perlu ditambahkan untuk produksi
1. Database kode IR legal/berlisensi atau library kode sendiri per brand/model.
2. Wizard pairing: brand -> model -> tes power -> simpan profil.
3. Android wrapper + permission/config WebView yang aman.
4. Untuk CCTV: integrasi ONVIF/vendor/NVR dan gateway RTSP -> HLS/WebRTC.
5. Autentikasi, enkripsi credential, dan pembatasan akses jaringan lokal.
6. Rate-limit command dan validasi pola IR sebelum masuk native bridge.

## Catatan CCTV
CCTV bukan perangkat IR pada umumnya. Kontrol PTZ/stream biasanya lewat jaringan lokal, ONVIF, API vendor, atau NVR. Jangan hard-code username/password kamera ke JavaScript frontend.
