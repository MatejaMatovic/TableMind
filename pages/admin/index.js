// pages/admin/index.js
import { useEffect, useState } from "react";

export default function AdminPanel() {
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    fetch("/api/reservations")
      .then((res) => res.json())
      .then(setReservations)
      .catch((err) => console.error("Greška pri učitavanju rezervacija:", err));
  }, []);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">
        📅 Pregled svih rezervacija
      </h1>

      {reservations.length === 0 ? (
        <p className="text-center text-gray-600">Nema aktivnih rezervacija.</p>
      ) : (
        <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-3 border">Ime</th>
              <th className="p-3 border">Restoran</th>
              <th className="p-3 border">Broj osoba</th>
              <th className="p-3 border">Vreme</th>
              <th className="p-3 border">Telefon</th>
              <th className="p-3 border">Email</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r._id} className="text-center hover:bg-gray-100">
                <td className="p-2 border">{r.name}</td>
                <td className="p-2 border">{r.restaurant?.name || "N/A"}</td>
                <td className="p-2 border">{r.partySize}</td>
                <td className="p-2 border">
                  {new Date(r.time).toLocaleString("sr-RS")}
                </td>
                <td className="p-2 border">{r.phone}</td>
                <td className="p-2 border">{r.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
