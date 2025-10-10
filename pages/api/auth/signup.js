export const config = {
  api: {
    bodyParser: true,
  },
};
// pages/api/auth/signup.js
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = await req.body;

    // Ako req.body nije JSON, pokušaj da ga parsiraš ručno
    let data;
    if (typeof body === "string") {
      try {
        data = JSON.parse(body);
      } catch (err) {
        console.error("❌ JSON parse error:", err);
        return res.status(400).json({ error: "Invalid JSON format" });
      }
    } else {
      data = body;
    }

    const { name, email, password } = data;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    await dbConnect();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Korisnik već postoji" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashed });
    await newUser.save();

    res.status(201).json({ message: "✅ Registracija uspešna", user: { name, email } });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: error.message || "Server error" });
  }
}
