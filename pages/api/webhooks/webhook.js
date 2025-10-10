// pages/api/sms/webhook.js
import { Vonage } from "@vonage/server-sdk";
import OpenAI from "openai";

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { msisdn, text, to } = req.body;

    console.log("📩 Nova poruka:", { from: msisdn, text });

    if (!text || !msisdn)
      return res.status(400).json({ error: "Nedostaju podaci iz webhooka." });

    // 🧠 Pošalji poruku GPT-u
    const prompt = `
    Ti si AI recepcioner restorana TableMind.
    Ljubazno i jasno odgovori gostima putem SMS-a.
    Poruka gosta: "${text}"
    `;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const reply = aiResponse.choices[0]?.message?.content || "Hvala na poruci!";

    console.log("🤖 AI odgovor:", reply);

    // 📤 Pošalji odgovor gostu
    await vonage.sms.send({
      to: msisdn,
      from: process.env.VONAGE_VIRTUAL_NUMBER,
      text: reply.replace(/[ćčžšđ]/g, c => ({
        "ć":"c", "č":"c", "ž":"z", "š":"s", "đ":"dj"
      }[c] || c)), // zamena naših slova
    });

    res.status(200).json({ message: "OK" });
  } catch (err) {
    console.error("❌ Greška u webhooku:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
}
