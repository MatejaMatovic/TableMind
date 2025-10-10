// pages/api/sms/incoming.js
import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    await dbConnect();

    const { msisdn, text, to } = req.body; 
    // Vonage šalje:
    // msisdn = broj pošiljaoca (gost)
    // text = sadržaj poruke
    // to = broj restorana

    console.log("📩 Nova SMS poruka:", { from: msisdn, to, text });

    // 🔍 Pronađi restoran kome pripada ovaj broj
    const restaurant = await Restaurant.findOne({ phoneNumbers: to });
    if (!restaurant) {
      console.warn("⚠️ Broj ne pripada nijednom restoranu:", to);
      return res.status(404).json({ error: "Restaurant not found for this number" });
    }

    // 🧠 Pošalji poruku AI-u (ljubazni recepcioner)
    const prompt = `
Ti si ljubazni AI recepcioner restorana "${restaurant.name}".
Odgovaraj kratko i profesionalno.
Gost je poslao: "${text}".
Ako pita za rezervaciju, pitaj za broj osoba, vreme i ime gosta.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const aiResponse = completion.choices[0].message.content.trim();
    console.log("🤖 AI odgovor:", aiResponse);

    // 💬 Pošalji odgovor nazad korisniku (preko Vonage)
    const sendRes = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.VONAGE_API_KEY,
        api_secret: process.env.VONAGE_API_SECRET,
        to: msisdn,
        from: to,
        text: aiResponse,
      }),
    });

    const result = await sendRes.json();
    console.log("📤 Poslato korisniku:", result);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Greška u incoming webhooku:", err);
    res.status(500).json({ error: err.message });
  }
}
