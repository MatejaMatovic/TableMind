// pages/api/reservations/[id].js
import dbConnect from "../../../lib/mongodb";
import Reservation from "../../../models/Reservation";

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  if (req.method === "DELETE") {
    try {
      const deleted = await Reservation.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ message: "Rezervacija nije pronađena" });
      }
      res.status(200).json({ message: "Rezervacija obrisana" });
    } catch (error) {
      res.status(500).json({ message: "Greška pri brisanju" });
    }
  } else {
    res.status(405).json({ message: "Metoda nije dozvoljena" });
  }
}
