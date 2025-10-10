// models/Layout.js
import mongoose from "mongoose";

const TableSchema = new mongoose.Schema({
  id: { type: String, required: true },
  x: Number,
  y: Number,
  rotation: Number,
  seats: Number,
  width: Number,
  height: Number,
});

const LayoutSchema = new mongoose.Schema({
  restaurantId: { type: String, required: true, unique: true },
  tables: [TableSchema],
});

export default mongoose.models.Layout || mongoose.model("Layout", LayoutSchema);
