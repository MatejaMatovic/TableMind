// pages/api/reservations.js
import dbConnect from "../../lib/mongodb";
import Reservation from "../../models/Reservation";
import Restaurant from "../../models/Restaurant";

export default async function handler(req, res) {
  await dbConnect();

  switch (req.method) {
    case "GET":
      try {
        const reservations = await Reservation.find().populate("restaurant");
        res.status(200).json(reservations);
      } catch (error) {
        res.status(500).json({ message: "❌ Greška pri dohvatanju rezervacija", error });
      }
      break;

    case "POST":
      try {
        const reservation = await Reservation.create(req.body);
        res.status(201).json({
          message: "✅ Rezervacija uspešno napravljena",
          reservation,
        });
      } catch (error) {
        res.status(400).json({ message: "❌ Greška pri kreiranju rezervacije", error });
      }
      break;

    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`❌ Method ${req.method} not allowed`);
  }
}
