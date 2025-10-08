// models/Reservation.js
import mongoose from "mongoose";

const ReservationSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Ime gosta je obavezno"],
    },
    phone: {
      type: String,
      required: [true, "Broj telefona je obavezan"],
    },
    email: {
      type: String,
    },
    partySize: {
      type: Number,
      required: [true, "Broj osoba je obavezan"],
    },
    time: {
      type: Date,
      required: [true, "Vreme rezervacije je obavezno"],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Reservation || mongoose.model("Reservation", ReservationSchema);
