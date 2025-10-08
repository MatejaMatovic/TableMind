// pages/api/chat.js
import OpenAI from "openai";
import dbConnect from "../../lib/mongodb";
import Restaurant from "../../models/Restaurant";
import Reservation from "../../models/Reservation";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const restaurantName = req.query.restaurant || "TableMind Bistro";
  const { messages } = req.body;

  try {
    const systemPrompt = `
Ti si ljubazan i profesionalan asistent restorana "${restaurantName}".
Predstavljaš se u ime restorana i komuniciraš toplo i prirodno.
Tvoj zadatak je da pomogneš korisnicima da naprave rezervaciju.

🎯 Pravila ponašanja:
- Uvek koristi ton profesionalnog, ali srdačnog konobara.
- Uvek se obrati pristojno ("naravno", "rado ću pomoći", "odlično, hvala na informaciji" itd.).
- Radiš SAMO za restoran "${restaurantName}" — nijedan drugi restoran ne postoji.
- Kada korisnik želi rezervaciju, uvek postavi dodatna pitanja ako fali nešto od sledećeg:
  1. ime korisnika
  2. broj telefona
  3. broj osoba
  4. tačno vreme (nikada ne pretpostavljaj — ako piše "večeras", "sutra", "kasnije", traži tačno vreme)
- Odgovor uvek treba da bude na srpskom jeziku i na kraju JSON objekat u formatu:

{
  "name": "ime korisnika ili null",
  "phone": "broj telefona ili null",
  "partySize": broj ili null,
  "time": "ISO vreme ili null"
}

Ako neki podatak nedostaje, stavi null i u tekstu to pristojno pitaj.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.4,
    });

    const aiText = response.choices[0].message.content.trim();

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    let data = {};
    if (jsonMatch) {
      try {
        data = JSON.parse(jsonMatch[0]);
      } catch {
        data = {};
      }
    }

    const required = ["name", "phone", "partySize", "time"];
    const missing = required.filter((key) => !data[key]);

    if (missing.length > 0) {
      const srpski = {
        name: "ime",
        phone: "broj telefona",
        partySize: "broj osoba",
        time: "vreme",
      };
      const missingText = missing.map((m) => srpski[m]).join(", ");
      return res.status(200).json({
        reply: `${aiText}\n\n😊 Da bih završio rezervaciju, potrebno mi je još: ${missingText}.`,
      });
    }

    const restaurant = await Restaurant.findOne({ name: restaurantName });
    if (!restaurant) {
      return res.status(200).json({
        reply: `Izvinite, restoran "${restaurantName}" trenutno nije dostupan u bazi.`,
      });
    }

    const existing = await Reservation.find({
      restaurant: restaurant._id,
      time: {
        $gte: new Date(new Date(data.time).getTime() - 60 * 60 * 1000),
        $lte: new Date(new Date(data.time).getTime() + 60 * 60 * 1000),
      },
    });

    const total = existing.reduce((sum, r) => sum + r.partySize, 0);
    if (total + data.partySize > restaurant.capacity) {
      return res.status(200).json({
        reply: `Nažalost, u restoranu ${restaurant.name} nema dovoljno mesta za ${data.partySize} osoba u to vreme 😞. Da li želite da proverimo drugi termin?`,
      });
    }

    const newReservation = await Reservation.create({
      restaurant: restaurant._id,
      name: data.name,
      phone: data.phone,
      email: data.email || "",
      partySize: data.partySize,
      time: data.time,
    });

    return res.status(200).json({
      reply: `🎉 Odlično, ${data.name}! Vaša rezervacija u restoranu ${restaurant.name} je potvrđena.\n🕒 Vreme: ${new Date(
        data.time
      ).toLocaleString()}\n👥 Broj osoba: ${data.partySize}\n📞 Kontakt: ${data.phone}\n\nHvala što ste izabrali ${restaurant.name}!`,
    });
  } catch (error) {
    console.error("AI error:", error);
    res
      .status(500)
      .json({ reply: "❌ Došlo je do greške pri komunikaciji sa AI-jem." });
  }
}
