// POST /api/gen  { scenes: [{ i, narasi, layar, ulang? }] }  ->  { codes: { "<i>": "kode" } }
// API key dari header x-gemini-key. Opsional: GEMINI_TEXT_MODEL di Vercel untuk mengganti model.
const MODELS = [process.env.GEMINI_TEXT_MODEL, "gemini-3.5-flash", "gemini-2.5-flash"].filter(Boolean);
const hits = new Map();

const GUIDE = `Kamu pembuat animasi canvas 2D untuk SATU kartu visual di video vertikal 720x1280 bergaya motion graphic gelap dengan aksen oranye. Untuk SETIAP adegan di bawah, tulis ISI fungsi JavaScript (tanpa pembungkus function) dengan parameter (g,t,W,H,P,K,D).
Aturan:
- g = CanvasRenderingContext2D. t = detik sejak adegan mulai (desimal). D = durasi adegan (detik). W=720, H=1280. P = {am:"#e8764f",bl:"#4cc9f0",tx:"#f2efe9",pk:"#f78ca2",gr:"#2a9d8f",bg:"#121212",mu:"#8d8a84"}. Warna utama P.am di atas latar gelap, aksen P.bl/P.pk/P.gr secukupnya.
- Kartu visual berada di kotak x 60-660, y 450-890 (pusat 360,670). Gambar HANYA di dalam kotak itu. Jangan mengisi latar belakang (latar kartu sudah gelap).
- Helper K: K.e(x) easing 0-1, K.eb(x) easing memantul, K.cl(x) batas 0-1, K.rr(g,x,y,w,h,r) membuat path kotak bulat (lalu g.fill() atau g.stroke()), K.txt(g,teks,x,y,ukuran,warna,"l"|"c"|"r") menulis teks, K.glow(g,x,y,radius,warna,alpha), K.parts(g,t,jumlah,warna,seed) partikel melayang, K.count(nilai,t,t0,durasi) angka menghitung naik.
- Pilih gaya sesuai isi adegan:
  * antarmuka, aplikasi, chat, prompt: jendela UI sederhana (kotak bulat, kolom input, teks pendek yang mengetik huruf demi huruf lewat slice berdasarkan t, kursor berkedip, tombol oranye).
  * proses atau alur: kotak bernomor dihubungkan panah, muncul bergantian sesuai t.
  * angka atau statistik: grafik batang atau garis yang tumbuh, angka naik dengan K.count.
  * benda, hewan, konsep: ilustrasi datar dari bentuk dasar yang mudah dikenali.
- Teks di dalam visual maksimal 4 kata per elemen, bahasa Indonesia, ukuran minimal 26.
- Animasi hanya bergantung pada t: masuk halus dalam 0,6 detik pertama (skala atau transparansi), lalu bergerak terus (melayang, berdenyut, berputar, bergelombang).
- Hanya pakai g, t, W, H, P, K, D dan Math. Tanpa gambar eksternal, tanpa fetch, tanpa async, loop maksimal 300 iterasi, tanpa komentar. Panjang 20 sampai 60 baris.
Format keluaran: untuk tiap adegan tulis satu baris "### N" (N = nomor adegan), lalu kodenya. Tanpa markdown, tanpa penjelasan.
Contoh isi kode yang benar:
const e=K.e(t/0.6);g.save();g.translate(360,670);g.scale(e,e);g.fillStyle="#1f1e1c";K.rr(g,-240,-120,480,240,24);g.fill();g.strokeStyle=P.am;g.lineWidth=3;g.stroke();const s="Buat video 30 detik",n=Math.min(s.length,Math.floor(Math.max(0,t-0.6)*12));K.txt(g,s.slice(0,n)+(Math.floor(t*2)%2?"|":""),-210,10,34,P.tx,"l");g.fillStyle=P.am;K.rr(g,130,60,90,44,22);g.fill();g.restore();
`;

const GUIDE_D = `Kamu animator diagram teknik untuk video vertikal. Untuk SETIAP adegan di bawah, tulis ISI fungsi JavaScript (tanpa pembungkus function) dengan parameter (d,t,D) yang menggambar SATU diagram skema penuh layar tentang topiknya, bergaya garis putih tipis di atas hitam seperti gambar teknik.
Aturan:
- Kanvas logis 360x640 (x 0-360, y 0-640). Latar sudah hitam. Gambar HANYA di y 90-470 (bawah dipakai subtitle). Judul kecil di kiri atas: d.txt("JUDUL",24,52,{size:9,sp:3,c:"#7d7d7d"}).
- t = detik sejak adegan mulai, D = durasi. Seluruh gerak hanya bergantung pada t. Bangun diagram bertahap: bagian demi bagian muncul (alpha lewat d.ramp) dalam 3 detik pertama, lalu bergerak terus berulang (periode 4-6 detik, mis. Math.sin(t*1.2)).
- Alat d (semua opsi o = {a:alpha 0-1, w:tebal garis, c:warna, dash:[4,5], fill:alpha isi putih}):
  d.line(x1,y1,x2,y2,o) d.rect(x,y,w,h,o) d.poly([[x,y],...],o) d.bar(x1,y1,x2,y2,lebar,o) batang berarah, d.circ(x,y,r,o) d.arc(cx,cy,r,deg0,deg1,o) d.arrow(x1,y1,x2,y2,o) d.arcArrow(cx,cy,r,deg0,deg1,o) d.dot(x,y,{hollow:1}) d.gear(x,y,r,jumlahGigi,rotRad,o) d.cyl(x1,y1,x2,y2,panjangLaras,o) silinder hidrolik, d.label("TEKS",titikX,titikY,teksX,teksY,alpha) garis acuan + teks, d.txt("TEKS",x,y,{size:9,sp:2.5,al:"c"|"l"|"r",a:alpha,c:warna}) huruf besar bahasa Indonesia, d.soil(x,y,w,h,offset) arsiran tanah, d.tf(x,y,skala) ... d.end() untuk transformasi.
- Easing: d.ramp(t,awal,akhir) 0-1, d.eo(p), d.eio(p). Warna hanya putih dan abu (#8a8a8a, #7d7d7d, #5a5a5a). Tanpa gambar eksternal, tanpa fetch, tanpa async, loop maksimal 300 iterasi, tanpa komentar.
- Gambar mekanismenya benar-benar (bagian mesin, gaya, aliran, putaran), bukan teks. Beri 3 sampai 5 label pendek (maks 3 kata) yang muncul bergantian dengan d.ramp. Panjang 40 sampai 90 baris.
Format keluaran: untuk tiap adegan tulis satu baris "### N" (N = nomor adegan), lalu kodenya. Tanpa markdown, tanpa penjelasan.
Contoh isi kode yang benar (roda gigi berputar):
const f=d.eo(d.ramp(t,0,.8));d.txt("RODA GIGI",24,52,{size:9,sp:3,c:"#7d7d7d",a:f});const r=Math.max(0,t-.4)*d.eio(d.ramp(t,.4,1.6));d.gear(120,260,54,18,r,{a:f});d.gear(120+84*.91,260,30,10,Math.PI-r*1.8-.1*Math.PI/5,{a:f});const l=d.ramp(t,2,2.6);d.arcArrow(120,260,68,-150,-100,{a:l});d.label("PENGGERAK",120,206,80,150,l);
`;

function bersihkan(code) {
  let c = String(code || "").replace(/```[a-z]*\n?/gi, "").trim();
  const m = c.match(/^(?:function\s*\w*\s*\([^)]*\)\s*\{|\([^)]*\)\s*=>\s*\{)([\s\S]*)\}\s*;?\s*$/);
  if (m) c = m[1].trim();
  return c.slice(0, 6000);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan metode POST" });
  const key = String(req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY || "").trim();
  if (!key || key.length < 20 || /\s/.test(key)) return res.status(401).json({ error: "API key belum diisi atau formatnya salah" });

  const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (recent.length >= 5) return res.status(429).json({ error: "Terlalu cepat, tunggu sebentar" });
  recent.push(now); hits.set(ip, recent);

  const list = Array.isArray((req.body || {}).scenes) ? req.body.scenes.slice(0, 12) : [];
  if (!list.length) return res.status(400).json({ error: "Tidak ada adegan" });
  const ulang = list.some(s => s && s.ulang);
  const prompt = (list[0] && list[0].m === "d" ? GUIDE_D : GUIDE) + "\nAdegan:\n" + list.map(s =>
    "Adegan " + Number(s.i) + ": " + String(s.narasi || "").slice(0, 300) + " (judul layar: " + String(s.layar || "").slice(0, 60) + ")"
  ).join("\n") + (ulang ? "\nBuat gaya yang berbeda dari biasanya." : "");

  let lastErr = "Gagal membuat visual";
  for (const model of MODELS) {
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: ulang ? 1.1 : 0.8, maxOutputTokens: 8192 }
        })
      });
      if (r.status === 429) return res.status(429).json({ error: "Kuota model teks habis. Coba lagi nanti" });
      const j = await r.json();
      if (!r.ok) {
        const em = (j.error && j.error.message) || "";
        if (r.status === 401 || r.status === 403 || (r.status === 400 && /api key/i.test(em))) {
          return res.status(401).json({ error: "API key tidak valid. Periksa atau ganti kunci" });
        }
        lastErr = em || lastErr;
        continue;
      }
      const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
      const text = parts.map(p => p.text || "").join("");
      const seg = text.split(/^###\s*(\d+)\s*$/m);
      const codes = {};
      for (let k = 1; k < seg.length; k += 2) {
        const c = bersihkan(seg[k + 1]);
        if (c) codes[seg[k]] = c;
      }
      if (!Object.keys(codes).length) { lastErr = "Respons tanpa kode"; continue; }
      return res.status(200).json({ codes });
    } catch (e) {
      lastErr = "Tidak bisa menghubungi Gemini";
    }
  }
  return res.status(502).json({ error: lastErr });
};
