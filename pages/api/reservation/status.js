// pages/api/reservations/status.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("tablemind");
    const collection = db.collection("reservations");

    const body = JSON.parse(req.body || "{}");
    const { reservationId, status, arrivedAt, departedAt, billAmount } = body;

    if (!reservationId || !status) {
      return res.status(400).json({ error: "Missing reservationId or status" });
    }

    const filter = ObjectId.isValid(reservationId)
      ? { _id: new ObjectId(reservationId) }
      : { _id: reservationId };

    const update = { $set: { status } };

    if (status === "arrived" && arrivedAt) update.$set.arrivedAt = arrivedAt;
    if (status === "departed") {
      update.$set.departedAt = departedAt || new Date().toISOString();
      update.$set.billAmount = Number(billAmount || 0);
    }

    const result = await collection.updateOne(filter, update);

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Reservation not found" });
    }

    return res.status(200).json({ success: true, status });
  } catch (error) {
    console.error("Error in /api/reservations/status:", error);
    return res.status(500).json({ error: error.message });
  }
}
