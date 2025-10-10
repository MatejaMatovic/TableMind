// models/Reservation.js
import mongoose from "mongoose";

const ReservationSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  customerName: { type: String },
  phone: { type: String },
  partySize: { type: Number, default: 1 },
  time: { type: Date },
  source: { type: String, default: "manual" },
  rawMessage: { type: String, default: null },
  assignedWaiterId: { type: String, default: null },
  tableId: { type: String, default: null },
  status: { type: String, default: "confirmed" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Reservation || mongoose.model("Reservation", ReservationSchema);
