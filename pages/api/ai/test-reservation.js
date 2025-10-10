import dbConnect from "@/lib/mongodb";
import Reservation from "@/models/Reservation";
import Restaurant from "@/models/Restaurant";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    await dbConnect();

    const { message, restaurantId } = req.body;

    if (!message || !restaurantId) {
      return res.status(400).json({ error: "Nedostaju podaci (message ili restaurantId)" });
    }

    // 🔍 Pronađi restoran
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: "Restoran nije pronađen" });
    }

    // 🧠 Parsiranje AI poruke (ovde je samo simulacija)
    // U praksi ovde možeš koristiti OpenAI API da izvučeš ime, broj osoba, vreme itd.
    const parsed = parseMessage(message);

    // 💾 Kreiraj rezervaciju u bazi
    const reservation = await Reservation.create({
      restaurant: restaurant._id, // povezivanje sa restoranom
      name: parsed.name || "Gost",
      phone: parsed.phone || "Nepoznato",
      partySize: parsed.partySize || 2,
      time: new Date(parsed.time || Date.now()),
      source: "AI",
      rawMessage: message,
    });

    return res.status(201).json({ success: true, reservation });
  } catch (error) {
    console.error("Greška u /api/ai/test-reservation:", error);
    return res.status(500).json({ error: error.message });
  }
}

// 🧩 Pomoćna funkcija koja "parsira" tekstualnu poruku
function parseMessage(message) {
  const lower = message.toLowerCase();
  const result = {};

  // Ime
  const imeMatch = message.match(/ime\s+([A-ZŠĐČĆŽ][a-zšđčćž]+(?:\s+[A-ZŠĐČĆŽ][a-zšđčćž]+)?)/);
  if (imeMatch) result.name = imeMatch[1];

  // Broj telefona
  const phoneMatch = message.match(/\b\d{6,12}\b/);
  if (phoneMatch) result.phone = phoneMatch[0];

  // Broj osoba
  const partyMatch = lower.match(/(\d+)\s*(osob|ljud|sto)/);
  if (partyMatch) result.partySize = parseInt(partyMatch[1]);

  // Vreme
  const timeMatch = lower.match(/(\d{1,2})([:h]\d{0,2})?\s*(h|časova|sati)?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2].replace(/[:h]/, "")) || 0 : 0;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    result.time = date;
  }

  return result;
}

