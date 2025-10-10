// ✅ pages/api/auth/signup.js
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await connectDB();

    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email i lozinka su obavezni." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Korisnik sa tim emailom već postoji." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name || "Novi korisnik",
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "✅ Registracija uspešna",
      user: { name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    console.error("❌ Signup error:", error);
    return res.status(500).json({
      success: false,
      error: "Greška na serveru: " + error.message,
    });
  }
}
