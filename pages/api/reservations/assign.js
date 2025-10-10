// pages/api/reservations/assign.js
import dbConnect from "@/lib/mongodb";
import Reservation from "@/models/Reservation";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { reservationId, waiterId } = req.body;
  if (!reservationId || !waiterId)
    return res.status(400).json({ error: "Nedostaju reservationId ili waiterId" });

  await dbConnect();

  const updated = await Reservation.findByIdAndUpdate(
    reservationId,
    { assignedWaiterId: waiterId },
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: "Rezervacija nije pronađena" });

  return res.status(200).json({ message: "Rezervacija ažurirana", reservation: updated });
}
