// pages/book.js
import { useEffect, useState } from "react";

export default function BookPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [form, setForm] = useState({
    restaurant: "",
    name: "",
    phone: "",
    email: "",
    partySize: 1,
    time: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Učitaj restorane i rezervacije kad se stranica otvori
  useEffect(() => {
    fetchRestaurants();
    fetchReservations();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch("/api/restaurants");
      const data = await res.json();
      setRestaurants(data);
    } catch (error) {
      console.error("❌ Greška pri učitavanju restorana:", error);
    }
  };

  const fetchReservations = async () => {
    try {
      const res = await fetch("/api/reservations");
      const data = await res.json();
      setReservations(data);
    } catch (error) {
      console.error("❌ Greška pri učitavanju rezervacija:", error);
    }
  };

  // Slanje forme
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Neuspešno");

      setMessage("✅ Rezervacija uspešno napravljena!");
      setForm({
        restaurant: "",
        name: "",
        phone: "",
        email: "",
        partySize: 1,
        time: "",
      });

      fetchReservations(); // odmah osveži listu
    } catch (err) {
      setMessage("❌ Greška pri pravljenju rezervacije");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "sans-serif",
        maxWidth: "700px",
        margin: "0 auto",
      }}
    >
      <h1>🍽️ Napravi rezervaciju</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          background: "#f9f9f9",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        <label>
          Restoran:
          <select
            value={form.restaurant}
            onChange={(e) => setForm({ ...form, restaurant: e.target.value })}
            required
          >
            <option value="">-- Izaberi restoran --</option>
            {restaurants.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ime i prezime:
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>

        <label>
          Telefon:
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </label>

        <label>
          Email:
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label>
          Broj osoba:
          <input
            type="number"
            min="1"
            value={form.partySize}
            onChange={(e) => setForm({ ...form, partySize: e.target.value })}
            required
          />
        </label>

        <label>
          Vreme rezervacije:
          <input
            type="datetime-local"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#0070f3",
            color: "white",
            padding: "10px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {loading ? "Slanje..." : "Rezerviši"}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: "20px", fontWeight: "bold" }}>{message}</p>
      )}

      <h2 style={{ marginTop: "40px" }}>📋 Sve rezervacije</h2>

      {reservations.length === 0 ? (
        <p>🚫 Nema rezervacija još uvek.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {reservations.map((r) => (
            <li
              key={r._id}
              style={{
                background: "#fff",
                marginBottom: "10px",
                padding: "10px",
                borderRadius: "8px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              }}
            >
              <b>{r.name}</b> — {r.phone}
              <br />
              📧 {r.email || "nema email"} <br />
              👥 {r.partySize} osoba <br />
              🕓 {new Date(r.time).toLocaleString()} <br />
              🍽️ {r.restaurant?.name || "Nepoznat restoran"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
