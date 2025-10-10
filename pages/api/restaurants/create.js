// pages/api/restaurants/create.js
import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
import User from "@/models/User";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { name, email, phoneNumber, waiters = [] } = req.body;

  if (!email || !name || !phoneNumber)
    return res
      .status(400)
      .json({ error: "Nedostaju podaci (ime, email ili telefon)." });

  try {
    await dbConnect();

    // 🔍 Proveri korisnika
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ error: "Korisnik nije pronađen." });

    // 🚫 Spreči duplikate
    const existingRestaurant = await Restaurant.findOne({ ownerEmail: email });
    if (existingRestaurant)
      return res
        .status(409)
        .json({ error: "Već imate registrovan restoran." });

    // ✅ Kreiraj restoran
    const cleanPhone = String(phoneNumber).trim();

    const restaurant = await Restaurant.create({
      name: name.trim(),
      ownerEmail: email,
      phoneNumber: cleanPhone, // 🔹 Glavni broj
      phoneNumbers: [cleanPhone], // 🔹 Upisuje se i u listu
      waiters: waiters.map((w, i) => ({
        id: `w${i}_${w}`,
        name: w,
        onShift: false,
        activeCount: 0,
      })),
      tables: [],
      createdAt: new Date(),
    });

    console.log("✅ Restoran kreiran:", restaurant);

    res.status(201).json({
      message: "✅ Restoran uspešno kreiran",
      restaurant,
    });
  } catch (err) {
    console.error("❌ Greška:", err);
    res.status(500).json({ error: "Greška na serveru: " + err.message });
  }
}
