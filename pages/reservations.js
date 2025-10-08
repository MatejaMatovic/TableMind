// pages/reservations.js
import { useEffect, useState } from "react";

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReservations() {
      try {
        const res = await fetch("/api/reservations");
        if (!res.ok) throw new Error("Greška pri dohvatanju podataka");
        const data = await res.json();
        setReservations(data);
      } catch (err) {
        console.error("❌ Greška:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReservations();
  }, []);

  if (loading) return <p>⏳ Učitavanje rezervacija...</p>;

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>📋 Lista svih rezervacija</h1>
      {reservations.length === 0 ? (
        <p>🚫 Trenutno nema rezervacija.</p>
      ) : (
        <ul>
          {reservations.map((r) => (
            <li key={r._id} style={{ marginBottom: "12px" }}>
              <b>{r.name}</b> — {r.email || "nema email"} — {r.phone} <br />
              👥 {r.partySize} osoba <br />
              🕓 {new Date(r.time).toLocaleString()} <br />
              🍽️ Restoran: {r.restaurant?.name || "Nepoznat"} <br />
              <hr />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
