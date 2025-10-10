// pages/api/ai/sms-webhook.js
import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import Reservation from "@/models/Reservation";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  api: {
    bodyParser: false, // Twilio šalje form-data, ne JSON
  },
};

import { parse } from "querystring";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).send("Method not allowed");

  let body = "";
  req.on("data", (chunk) => (body += chunk.toString()));
  req.on("end", async () => {
    const data = parse(body);
    const from = data.From || "";
    const to = data.To || "";
    const message = (data.Body || "").trim();

    console.log("📩 SMS primljen:", { from, to, message });

    try {
      await dbConnect();

      // pronađi restoran po broju telefona
      const restaurant = await Restaurant.findOne({
        phoneNumbers: { $in: [to] },
      });

      if (!restaurant) {
        console.warn("❌ Nema restorana za broj:", to);
        return res.status(200).send("<Response><Message>Broj nije povezan s restoranom.</Message></Response>");
      }

      // obradi poruku sa AI-jem
      const prompt = `
Ti si digitalni recepcioner restorana ${restaurant.name}.
Gosti ti šalju SMS poruke sa zahtevima za rezervaciju.
Iz poruke izvuci podatke u JSON formatu:
{
  "intent": "create_reservation" | "cancel_reservation" | "question",
  "customerName": "ime gosta ako ga ima",
  "partySize": "broj osoba (broj)",
  "time": "vreme rezervacije u ISO formatu ako se može zaključiti"
}

Ako nema dovoljno informacija, popuni vrednost sa null.
Tekst: """${message}"""
`;

      const aiRes = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(aiRes.choices[0].message.content || "{}");
      console.log("🤖 AI parsed:", parsed);

      // napravi rezervaciju ako ima dovoljno podataka
      if (parsed.intent === "create_reservation" && parsed.time && parsed.partySize) {
        const reservation = await Reservation.create({
          restaurant: restaurant._id,
          name: parsed.customerName || "Gost",
          phone: from,
          partySize: parsed.partySize,
          time: parsed.time,
        });

        console.log("✅ Rezervacija sačuvana:", reservation._id);

        const twiml = `
          <Response>
            <Message>✅ Hvala ${parsed.customerName || ""}! Rezervacija u ${restaurant.name} je zabeležena za ${new Date(parsed.time).toLocaleString()}.</Message>
          </Response>
        `;
        res.setHeader("Content-Type", "text/xml");
        return res.status(200).send(twiml);
      }

      // ako nije prepoznata rezervacija
      const reply = `
        <Response>
          <Message>👋 Hvala na poruci! Molimo Vas napišite datum, vreme i broj osoba da zabeležimo rezervaciju.</Message>
        </Response>
      `;
      res.setHeader("Content-Type", "text/xml");
      return res.status(200).send(reply);
    } catch (err) {
      console.error("❌ SMS webhook error:", err);
      res.status(500).send("<Response><Message>Greška u sistemu.</Message></Response>");
    }
  });
}
