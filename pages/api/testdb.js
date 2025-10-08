// pages/api/testdb.js
import dbConnect from "../../lib/mongodb";

export default async function handler(req, res) {
  try {
    await dbConnect();
    res.status(200).json({ message: "✅ Konekcija sa bazom uspešna!" });
  } catch (error) {
    console.error("❌ Greška pri konekciji:", error);
    res.status(500).json({ message: "❌ Greška pri konekciji sa bazom", error: error.message });
  }
}
