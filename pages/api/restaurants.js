// pages/api/restaurants.js
import dbConnect from "../../lib/mongodb";
import Restaurant from "../../models/Restaurant";

export default async function handler(req, res) {
  await dbConnect();

  switch (req.method) {
    case "GET":
      try {
        const restaurants = await Restaurant.find({});
        res.status(200).json(restaurants);
      } catch (error) {
        res.status(500).json({ message: "❌ Greška pri dohvatanju restorana", error });
      }
      break;

    case "POST":
      try {
        const restaurant = await Restaurant.create(req.body);
        res.status(201).json({ message: "✅ Restoran dodat uspešno", restaurant });
      } catch (error) {
        res.status(400).json({ message: "❌ Greška pri dodavanju restorana", error });
      }
      break;

    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`❌ Method ${req.method} not allowed`);
  }
}
