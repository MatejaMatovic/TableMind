// pages/api/chat.js
import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import Reservation from "@/models/Reservation";

export default async function handler(req, res) {
  const { messages, restaurant } = req.body;
  if (!messages) return res.status(400).json({ error: "Nema poruka." });

  await dbConnect();
  const lastUser = messages[messages.length - 1].content.toLowerCase();

  const rest = restaurant?._id
    ? await Restaurant.findById(restaurant._id)
    : await Restaurant.findOne({ ownerEmail: restaurant?.ownerEmail });

  if (!rest) return res.status(404).json({ error: "Restoran nije pronađen." });

  // ako imaš OpenAI key u .env
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  try {
    const reservations = await Reservation.find({ restaurantId: rest._id });
    const summary = `
    Restoran: ${rest.name}
    Broj stolova: ${rest.tables.length}
    Broj konobara: ${rest.waiters.length}
    Broj rezervacija: ${reservations.length}
    Konobari: ${rest.waiters.map(w => `${w.name} (${w.onShift ? "u smeni" : "van smene"})`).join(", ")}
    `;

    // ako postoji OpenAI ključ — koristi pravi AI
    if (OPENAI_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `Ti si AI menadžer restorana TableMind. Imaš pristup sledećim podacima:\n${summary}\nOdgovaraj na srpskom jeziku i budi konkretan.` },
            ...messages,
          ],
          temperature: 0.6,
        }),
      });
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "AI nije odgovorio.";
      return res.status(200).json({ reply });
    }

    // fallback bez OpenAI-a: lokalni logički AI
    let reply = "Ne razumem pitanje. Možete li preciznije?";
    if (lastUser.includes("rezervacij"))
      reply = `Trenutno imate ${reservations.length} rezervacija.`;
    else if (lastUser.includes("konobar"))
      reply = `U smeni je ${rest.waiters.filter(w=>w.onShift).length} konobara.`;
    else if (lastUser.includes("sto"))
      reply = `Restoran ima ${rest.tables.length} stolova.`;
    else if (lastUser.includes("gužv"))
      reply = `Trenutno ${reservations.length < 3 ? "nema gužve" : "je gužva u toku"}.`;
    else if (lastUser.includes("najaktivnij"))
      reply = `Najaktivniji konobar je ${rest.waiters.sort((a,b)=>b.activeCount - a.activeCount)[0]?.name || "N/A"}.`;

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("AI error:", err);
    return res.status(500).json({ error: "Greška u AI obradi" });
  }
}
