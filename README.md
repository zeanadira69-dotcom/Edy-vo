# Edy VO

Teks jadi suara, gratis, tanpa akun.

## Mode

- **Kualitas tinggi (Gemini)**: memakai API key Gemini milik pengguna lewat fungsi `api/tts.js`. Kunci tidak disimpan di server.
- **Standar+ (di browser, Indonesia & Inggris)**: Supertonic 3 berjalan di browser lewat `supertonic.js`. Model (±400 MB) diunduh sekali dari Hugging Face lalu disimpan di Cache Storage.
- **Standar (di browser, hanya Inggris)**: Kokoro-82M.

Naskah panjang dipecah otomatis per bagian, dibuat satu per satu, lalu digabung jadi satu file MP3 (WAV bila pustaka MP3 gagal dimuat).
Jika Gemini gagal (limit/kuota), halaman beralih ke Standar+ bila modelnya sudah tersimpan.

## Struktur

```
index.html       halaman dan logika
api/tts.js       fungsi serverless Vercel (proxy ke Gemini TTS)
supertonic.js    pemuat model dan sintesis Supertonic 3
helper.js        dari Supertonic (MIT), tidak diubah selain komentar
```

Tidak ada langkah build. Cukup import repo ke Vercel.

## Lisensi dan atribusi

- `helper.js`: MIT, Copyright (c) 2025 Supertone Inc. (lihat `LICENSE-supertonic`).
- Model Supertonic 3: BigScience OpenRAIL-M. Hasil suara boleh dipakai komersial, tetapi lisensinya melarang penerbitan konten buatan mesin tanpa label yang jelas, dan membatasi penggunaan tertentu (mis. peniruan suara orang tanpa izin, informasi menyesatkan). Beri label "dibuat dengan AI" pada konten yang dipublikasikan.
