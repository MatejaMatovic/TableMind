// pages/api/auth/signup.js
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  console.log("📩 API signup called, method:", req.method);

  if (req.method !== "POST") {
    console.warn("❌ Method not allowed:", req.method);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    await dbConnect();
    console.log("✅ MongoDB connected");

    // Ako nema body
    if (!req.body) {
      console.error("❌ Empty request body");
      return res.status(400).json({ success: false, error: "Empty request body" });
    }

    const { name, email, password } = req.body;
    console.log("📦 Received data:", { name, email });

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email i lozinka su obavezni" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn("⚠️ User already exists:", email);
      return res.status(400).json({ success: false, error: "Korisnik već postoji" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    console.log("✅ New user registered:", email);

    return res.status(201).json({
      success: true,
      message: "Registracija uspešna",
      user: { name, email },
    });
  } catch (error) {
    console.error(" Signup API error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Greška na serveru",
    });
  }
}
