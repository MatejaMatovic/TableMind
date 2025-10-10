import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import Reservation from "@/models/Reservation";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    return res.status(200).send(req.query["hub.challenge"] || "OK");
  }

  try {
    const entry = req.body.entry?.[0];
    const message = entry?.changes?.[0]?.value?.messages?.[0]?.text?.body;
    const pageId = entry?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (!message || !pageId)
      return res.status(200).json({ ok: true, message: "No message data" });

    const restaurant = await Restaurant.findOne({ instagramPageId: pageId });
    if (!restaurant)
      return res.status(200).json({ ok: true, message: "Restaurant not linked" });

    // AI parsira poruku
    const prompt = `
Izvuci podatke iz ove poruke za rezervaciju.
Vrati JSON u formatu:
{name, phone, partySize, time}
Poruka: """${message}"""
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Ti si parser rezervacija." },
        { role: "user", content: prompt },
      ],
      max_tokens: 200,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    await Reservation.create({
      restaurantId: restaurant._id,
      customerName: parsed.name || "Gost",
      phone: parsed.phone || "Nepoznato",
      partySize: parsed.partySize || 2,
      time: new Date(parsed.time || Date.now()),
      source: "instagram",
      rawMessage: message,
    });

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}
