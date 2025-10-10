// models/Restaurant.js
import mongoose from "mongoose";

// 🪑 Stolovi
const TableSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, default: "" },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  w: { type: Number, default: 120 },
  h: { type: Number, default: 70 },
  rotation: { type: Number, default: 0 },
  seats: { type: Number, default: 4 },
  label: { type: String, default: "" },
});

// 👨‍🍳 Konobari
const WaiterSchema = new mongoose.Schema({
  id: { type: String },
  name: { type: String, required: true },
  onShift: { type: Boolean, default: false },
  activeCount: { type: Number, default: 0 },
  lastShiftStart: { type: Date, default: null },
});

// 🍽️ Restoran
const RestaurantSchema = new mongoose.Schema({
  // 🔹 Osnovni podaci
  name: { type: String, required: true },
  ownerEmail: { type: String, required: true },

  // 🔹 Glavni broj telefona (AI recepcioner koristi ovaj)
  phoneNumber: { type: String, default: null },

  // 🔹 Dodatni brojevi (npr. fiksni, dodatne linije)
  phoneNumbers: [{ type: String }],

  // 🔹 Integracije
  instagramPageId: { type: String, default: null },
  instagramAccessToken: { type: String, default: null },

  // 🔹 Layout i osoblje
  tables: [TableSchema],
  waiters: [WaiterSchema],

  // 🔹 Automatska evidencija
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Restaurant ||
  mongoose.model("Restaurant", RestaurantSchema);
