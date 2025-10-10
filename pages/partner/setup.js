// pages/partner/setup.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";

export default function PartnerSetup() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantPhone, setRestaurantPhone] = useState("");
  const [numWaiters, setNumWaiters] = useState(2);
  const [waiters, setWaiters] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ako korisnik nije prijavljen
  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) return router.push("/auth/login");

    // ako restoran već postoji, preusmeri na dashboard
    const checkExistingRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants/byUser?email=${email}`);
        const data = await res.json();
        if (data.restaurantExists) router.push("/partner/dashboard");
      } catch (err) {
        console.warn("Greška pri proveri postojećeg restorana:", err);
      }
    };
    checkExistingRestaurant();
  }, []);

  // dinamički broj inputa za konobare
  useEffect(() => {
    setWaiters((prev) => {
      const copy = [...prev];
      while (copy.length < numWaiters) copy.push("");
      while (copy.length > numWaiters) copy.pop();
      return copy;
    });
  }, [numWaiters]);

  const handleWaiterChange = (index, value) => {
    setWaiters((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const email = localStorage.getItem("userEmail");
    if (!email) return alert("Niste prijavljeni.");

    if (!restaurantName.trim()) return setError("Unesite ime restorana.");
    if (!restaurantPhone.trim()) return setError("Unesite broj telefona.");
    if (waiters.some((w) => !w || !w.trim()))
      return setError("Unesite imena svih konobara.");

    setLoading(true);
    try {
      // kreiranje restorana u bazi
      const res = await fetch("/api/restaurants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: restaurantName.trim(),
          email,
          phoneNumber: restaurantPhone.trim(),
          waiters,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška pri kreiranju.");

      // ✅ snimi ceo restoran lokalno
      if (data.restaurant) {
        localStorage.setItem("restaurant", JSON.stringify(data.restaurant));
        localStorage.setItem("restaurantId", data.restaurant._id);
        localStorage.setItem("restaurantName", data.restaurant.name);
      }

      // snimi email ako već nije
      if (!localStorage.getItem("userEmail")) {
        localStorage.setItem("userEmail", email);
      }

      // ✅ preusmeri tek kada je sve snimljeno
      router.push("/partner/dashboard");
    } catch (err) {
      console.error("❌ Greška:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white relative overflow-hidden p-4">
      {/* animacije pozadine */}
      <motion.div
        className="absolute w-72 h-72 bg-blue-700/20 rounded-full blur-3xl top-10 left-10"
        animate={{ x: [0, 50, 0], y: [0, -50, 0] }}
        transition={{ repeat: Infinity, duration: 10 }}
      />
      <motion.div
        className="absolute w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl bottom-0 right-0"
        animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ repeat: Infinity, duration: 12 }}
      />

      {/* glavni sadržaj */}
      <motion.div
        className="relative z-10 w-full max-w-2xl bg-gray-900/60 border border-gray-800 rounded-2xl shadow-2xl p-10 backdrop-blur-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-extrabold text-center mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          TableMind Setup
        </h1>
        <p className="text-center text-gray-400 mb-6">
          Unesite podatke vašeg restorana i osoblja.
        </p>

        {error && <p className="text-red-400 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            placeholder="Naziv restorana (npr. Picerija Milano)"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            required
            className="w-full p-4 bg-gray-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <input
            type="tel"
            placeholder="Broj telefona restorana (npr. +381645657045)"
            value={restaurantPhone}
            onChange={(e) => setRestaurantPhone(e.target.value)}
            required
            className="w-full p-4 bg-gray-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Broj konobara (1–4)
            </label>
            <select
              value={numWaiters}
              onChange={(e) => setNumWaiters(Number(e.target.value))}
              className="w-28 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Imena konobara
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {waiters.map((w, i) => (
                <input
                  key={i}
                  value={w}
                  onChange={(e) => handleWaiterChange(i, e.target.value)}
                  placeholder={`Konobar ${i + 1} (ime)`}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all shadow-lg"
          >
            {loading ? "Kreiranje..." : "Kreiraj restoran ➜"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

