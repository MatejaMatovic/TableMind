// models/Restaurant.js
import mongoose from "mongoose";

const RestaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "TableMind Bistro"],
    },
    address: {
      type: String,
      required: [true, "Beograd, Knez Mihailova 10"],
    },
    capacity: {
      type: Number,
      required: [true, "50"],
    },
  },
  { timestamps: true }
);

// Ako model već postoji, koristi ga umesto ponovnog kreiranja (sprečava grešku kod hot-reloada)
export default mongoose.models.Restaurant || mongoose.model("Restaurant", RestaurantSchema);
