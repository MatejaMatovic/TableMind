// pages/api/statistics.js
import dbConnect from "@/lib/mongodb";
import Reservation from "@/models/Reservation";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const { restaurantId } = req.query;
  if (!restaurantId)
    return res.status(400).json({ error: "Nedostaje restaurantId" });

  try {
    await dbConnect();

    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    const reservations = await Reservation.find({
      restaurantId,
      time: { $gte: start, $lte: end },
    });

    const guests = reservations.reduce((acc, r) => acc + (r.partySize || 0), 0);
    const occupancy = Math.min((guests / 100) * 100, 100); // možeš promeniti 100 = max kapacitet
    const upcoming = reservations.filter((r) => new Date(r.time) > new Date()).length;

    return res.status(200).json({
      occupancy: Math.round(occupancy),
      guests,
      upcoming,
    });
  } catch (err) {
    console.error("❌ Greška u statistici:", err);
    return res.status(500).json({ error: "Greška na serveru." });
  }
}
