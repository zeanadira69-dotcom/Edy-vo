# Edy VO

Teks jadi suara, gratis, tanpa akun.

## Mode

- **Kualitas tinggi (Gemini)**: memakai API key Gemini milik pengguna lewat fungsi `api/tts.js`. Kunci tidak disimpan di server.
- **Standar+ (di browser, Indonesia & Inggris)**: Supertonic 3 berjalan di browser lewat `supertonic.js`. Model (±400 MB) diunduh sekali dari Hugging Face lalu disimpan di Cache Storage.
- **Standar (di browser, hanya Inggris)**: Kokoro-82M.

Naskah panjang dipecah otomatis per bagian, dibuat satu per satu, lalu digabung jadi satu file MP3 (WAV bila pustaka MP3 gagal dimuat).
Jika Gemini gagal (limit/kuota), halaman beralih ke Standar+ bila modelnya sudah tersimpan.

## Gabung video (`video.html`)

Audio VO + klip video/gambar + naskah (opsional, untuk subtitle) digabung jadi satu video. Semua di browser, tanpa server dan tanpa API key.
Klip dipakai berurutan dan diulang sampai menutup durasi audio. Subtitle dibagi menurut panjang karakter (perkiraan, bukan sinkron per kata). Hasil MP4 bila browser mendukung, kalau tidak WebM. File .srt juga bisa diunduh.
Render berjalan real-time (lama proses = lama audio), jadi layar harus tetap menyala.

## Studio (`studio.html`)

Naskah jadi video vertikal 9:16 bergaya motion graphic: HUD, chip langkah, judul kinetik, kartu visual animasi buatan Gemini, dan subtitle karaoke. Suara dari `api/tts.js`, visual dari `api/gen.js`. Adegan pertama jadi hook, terakhir jadi penutup; jenis tiap adegan bisa diubah. Hanya jenis "visual/langkah/demo" yang memanggil Gemini untuk membuat animasi kartu.

**Diagram teknik (`diagram.js`)**: adegan penuh layar bergaya gambar teknik (garis putih di atas hitam, panah, label), bergerak. Ada lima gambar siap pakai tanpa Gemini: ekskavator, hidrolik (Pascal), roda gigi, roda timba, TBM. Dipilih otomatis bila narasi menyebut kata kuncinya (lihat `PRESET_KATA`), atau pilih manual per adegan. Untuk topik lain, pilih "AI Gemini" dan Gemini menggambar diagram memakai alat `d` yang sama (prompt di `api/gen.js`). Menambah gambar baru: tulis `PRESET.nama = function(d,t,D){...}` di `diagram.js`.

## Struktur

```
index.html       halaman dan logika VO
video.html       gabung VO + klip + subtitle jadi video
studio.html      naskah jadi video motion graphic 9:16
diagram.js       pustaka gambar teknik dan adegan diagram siap pakai
api/gen.js       fungsi serverless pembuat animasi visual (Gemini)
api/tts.js       fungsi serverless Vercel (proxy ke Gemini TTS)
supertonic.js    pemuat model dan sintesis Supertonic 3
helper.js        dari Supertonic (MIT), tidak diubah selain komentar
```

Tidak ada langkah build. Cukup import repo ke Vercel.

## Lisensi dan atribusi

- `helper.js`: MIT, Copyright (c) 2025 Supertone Inc. (lihat `LICENSE-supertonic`).
- Model Supertonic 3: BigScience OpenRAIL-M. Hasil suara boleh dipakai komersial, tetapi lisensinya melarang penerbitan konten buatan mesin tanpa label yang jelas, dan membatasi penggunaan tertentu (mis. peniruan suara orang tanpa izin, informasi menyesatkan). Beri label "dibuat dengan AI" pada konten yang dipublikasikan.
