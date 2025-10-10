// pages/api/restaurants/byUser.js
import dbConnect from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.query;
  if (!email)
    return res.status(400).json({ error: "Nedostaje email parametar." });

  try {
    await dbConnect();

    const restaurant = await Restaurant.findOne({ ownerEmail: email });

    res.status(200).json({
      restaurantExists: !!restaurant,
      restaurant,
    });
  } catch (err) {
    console.error("❌ Greška prilikom provere restorana:", err);
    res.status(500).json({ error: "Greška na serveru." });
  }
}
