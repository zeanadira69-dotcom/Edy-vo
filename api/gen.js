// POST /api/gen  { scenes: [{ i, narasi, layar, ulang? }] }  ->  { codes: { "<i>": "kode" } }
// API key dari header x-gemini-key. Opsional: GEMINI_TEXT_MODEL di Vercel untuk mengganti model.
const MODELS = [process.env.GEMINI_TEXT_MODEL, "gemini-3.5-flash", "gemini-2.5-flash"].filter(Boolean);
const hits = new Map();

const GUIDE = `Kamu pembuat animasi canvas 2D untuk video vertikal 720x1280. Untuk SETIAP adegan di bawah, tulis ISI fungsi JavaScript (tanpa pembungkus function) dengan parameter (g,t,W,H,P).
Aturan:
- g = CanvasRenderingContext2D. t = detik sejak adegan mulai (desimal). W=720, H=1280. P = {am:"#ffb347",bl:"#4cc9f0",tx:"#e8eff7",pk:"#f78ca2",gr:"#2a9d8f"}.
- Gambar HANYA di area x 40-680, y 60-580 (pusat 360,320). Jangan mengisi latar belakang.
- Gambarkan SUBJEK adegan secara visual dengan bentuk sederhana yang mudah dikenali (hewan, benda, grafik, simbol). Tanpa teks sama sekali.
- Animasi hanya boleh bergantung pada t: masuk halus dalam 0,6 detik pertama (skala atau transparansi), lalu bergerak terus (melayang, berdenyut, berputar, bergelombang).
- Hanya pakai g, t, W, H, P, dan Math. Tanpa gambar eksternal, tanpa fetch, tanpa async, loop maksimal 300 iterasi, tanpa komentar.
- Panjang 15 sampai 45 baris.
Format keluaran: untuk tiap adegan tulis satu baris "### N" (N = nomor adegan), lalu kodenya. Tanpa markdown, tanpa penjelasan.
Contoh isi kode yang benar:
const k=Math.min(1,t/0.6),e=1-Math.pow(1-k,3);g.save();g.translate(360,320+Math.sin(t*2)*10);g.scale(e,e);g.fillStyle=P.am;g.beginPath();g.arc(0,0,120,0,Math.PI*2);g.fill();g.fillStyle=P.bl;g.beginPath();g.arc(Math.cos(t*2)*160,Math.sin(t*2)*160,24,0,Math.PI*2);g.fill();g.restore();
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
  const prompt = GUIDE + "\nAdegan:\n" + list.map(s =>
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
