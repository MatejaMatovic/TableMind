// pages/api/restaurants.js
import dbConnect from "../../lib/mongodb";
import Restaurant from "../../models/Restaurant";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      const { name, address, capacity } = req.body;
      const restaurant = await Restaurant.create({ name, address, capacity });
      res.status(201).json({ message: "✅ Restoran dodat uspešno", restaurant });
    } catch (error) {
      res.status(400).json({ message: "❌ Greška pri dodavanju restorana", error: error.message });
    }
  } else if (req.method === "GET") {
    try {
      const restaurants = await Restaurant.find({});
      res.status(200).json(restaurants);
    } catch (error) {
      res.status(500).json({ message: "❌ Greška pri učitavanju", error: error.message });
    }
  } else {
    res.status(405).json({ message: "❌ Metoda nije dozvoljena" });
  }
}

