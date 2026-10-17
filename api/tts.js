// Vercel serverless function: POST /api/tts
// API key dikirim dari landing page lewat header x-gemini-key (tidak disimpan di server).
// Opsional: GEMINI_TTS_MODEL di Vercel > Settings > Environment Variables untuk mengganti model.
const MODELS = [process.env.GEMINI_TTS_MODEL, "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"].filter(Boolean);
const VOICES = [
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede", "Callirrhoe", "Autonoe",
  "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar",
  "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi", "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat"
];
const STYLES = {
  normal: "",
  hangat: "Say in a warm, friendly tone: ",
  semangat: "Say with excitement and energy: ",
  tenang: "Say in a calm, soothing tone: "
};
const MAX_CHARS = 1000; // jaga hasil WAV di bawah batas respons 4,5 MB Vercel
const RATE_PER_MENIT = 20; // naskah panjang dikirim per bagian, jadi lebih longgar dari sebelumnya
const hits = new Map();

function toWav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// Ambil saran jeda dari respons error Gemini (RetryInfo.retryDelay, mis. "23s")
function ambilRetryAfter(j) {
  try {
    const d = (j && j.error && j.error.details) || [];
    const info = d.find(x => x && /RetryInfo/.test(x["@type"] || ""));
    const detik = info && parseFloat(info.retryDelay);
    return detik > 0 ? Math.ceil(detik) : null;
  } catch (e) { return null; }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Gunakan metode POST" });
  const key = String(req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY || "").trim();
  if (!key || key.length < 20 || /\s/.test(key)) return res.status(401).json({ error: "API key belum diisi atau formatnya salah" });

  const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (recent.length >= RATE_PER_MENIT) return res.status(429).json({ error: "Terlalu cepat, tunggu sebentar", code: "RATE", retryAfter: 15 });
  recent.push(now); hits.set(ip, recent);

  const body = req.body || {};
  const text = String(body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Teks kosong" });
  if (text.length > MAX_CHARS) return res.status(400).json({ error: "Maksimal " + MAX_CHARS + " karakter" });
  const voice = VOICES.includes(body.voice) ? body.voice : "Kore";
  const prompt = (STYLES[body.style] || "") + text;

  let lastErr = "Gagal membuat suara";
  for (const model of MODELS) {
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
          }
        })
      });
      let j = {};
      try { j = await r.json(); } catch (e) {}
      if (r.status === 429) {
        return res.status(429).json({
          error: "Kuota atau limit API key ini habis. Tunggu sebentar atau ganti key di Pengaturan",
          code: "QUOTA", retryAfter: ambilRetryAfter(j)
        });
      }
      if (!r.ok) {
        const em = (j.error && j.error.message) || "";
        if (r.status === 401 || r.status === 403 || (r.status === 400 && /api key/i.test(em))) {
          return res.status(401).json({ error: "API key tidak valid. Periksa atau ganti kunci" });
        }
        lastErr = em || lastErr;
        continue;
      }
      const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
      const part = parts.find(p => p.inlineData);
      if (!part) { lastErr = "Respons tanpa audio"; continue; }
      const m = /rate=(\d+)/.exec(part.inlineData.mimeType || "");
      const wav = toWav(Buffer.from(part.inlineData.data, "base64"), m ? Number(m[1]) : 24000);
      res.setHeader("Content-Type", "audio/wav");
      return res.status(200).send(wav);
    } catch (e) {
      lastErr = "Tidak bisa menghubungi Gemini";
    }
  }
  return res.status(502).json({ error: lastErr });
};
