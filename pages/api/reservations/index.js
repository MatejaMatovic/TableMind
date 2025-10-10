// pages/api/reservations/index.js
import dbConnect from "@/lib/mongodb";
import Reservation from "@/models/Reservation";
import Restaurant from "@/models/Restaurant";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    const { restaurantId } = req.query;
    if (!restaurantId)
      return res.status(400).json({ error: "Nedostaje restaurantId" });

    const reservations = await Reservation.find({ restaurantId }).sort({ time: 1 });
    return res.status(200).json(reservations);
  }

  if (req.method === "POST") {
    const { restaurantId, customerName, phone, email, partySize, time, source, rawMessage } = req.body;

    if (!restaurantId || !customerName || !phone || !partySize || !time) {
      return res.status(400).json({ error: "Nedostaju obavezna polja" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant)
      return res.status(404).json({ error: "Restoran nije pronađen" });

    const reservation = await Reservation.create({
      restaurantId,
      customerName,
      phone,
      email,
      partySize: Number(partySize),
      time: new Date(time),
      source: source || "manual",
      rawMessage: rawMessage || null,
      status: "confirmed",
    });

    return res.status(201).json({ message: "Rezervacija kreirana", reservation });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Nedostaje id rezervacije" });

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ error: "Rezervacija nije pronađena" });

    await reservation.deleteOne();
    return res.status(200).json({ message: "Rezervacija obrisana" });
  }

  return res.status(405).json({ error: "Metoda nije dozvoljena" });
}
