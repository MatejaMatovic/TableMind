// pages/api/layouts/index.js
import dbConnect from "../../../lib/mongodb";
import Layout from "../../../models/Layout";
import Restaurant from "../../../models/Restaurant";
import User from "../../../models/User";
import jwt from "jsonwebtoken";

function getUserFromReq(req) {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload; // { userId, email }
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    const { restaurantId } = req.query;
    if (!restaurantId) return res.status(400).json({ error: "restaurantId is required" });
    const layout = await Layout.findOne({ restaurantId });
    return res.status(200).json(layout || { tables: [] });
  }

  if (req.method === "POST") {
    const user = getUserFromReq(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const { restaurantId: reqRestaurantId, tables } = req.body;
    if (!tables) return res.status(400).json({ error: "tables required" });

    // Ako nije prosleđen restaurantId, koristimo korisnikov restaurantId ako već ima
    let restaurantId = reqRestaurantId || (await User.findById(user.userId))?.restaurantId;

    // Ako i dalje nema restaurantId - napravimo novi restoran automatski
    if (!restaurantId) {
      // kreiraj restoran (minimalno)
      const baseName = (user.email || "restaurant").split("@")[0];
      const newRest = await Restaurant.create({
        name: `${baseName}-restaurant`,
        address: "",
        capacity: 0,
      });
      restaurantId = String(newRest._id);
      // povežemo korisnika sa ovim restoranom
      await User.findByIdAndUpdate(user.userId, { restaurantId });
    }

    // sačuvaj layout
    const layout = await Layout.findOneAndUpdate(
      { restaurantId },
      { tables },
      { upsert: true, new: true }
    );

    return res.status(200).json({ ok: true, layout, restaurantId });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
