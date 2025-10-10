import dbConnect from "@/lib/dbConnect";
import Restaurant from "@/models/Restaurant";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await dbConnect();
    const { email, updates } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    if (updates.tables) restaurant.tables = updates.tables;
    if (updates.waiters) restaurant.waiters = updates.waiters;

    await restaurant.save();

    return res.status(200).json({ success: true, restaurant });
  } catch (err) {
    console.error("Save layout error:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
