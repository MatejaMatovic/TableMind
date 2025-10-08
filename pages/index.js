export default function Home() {
  return (
    <div style={{ textAlign: "center", padding: "100px" }}>
      <h1>🍽️ Dobrodošli u TableMind AI!</h1>
      <p>
        Vaš inteligentni sistem za upravljanje rezervacijama u restoranima.
      </p>
      <p>
        <a href="/chat" style={{ color: "blue", textDecoration: "underline" }}>
          Idi na AI chat asistenta
        </a>
      </p>
      <p>
        <a href="/reservations" style={{ color: "blue", textDecoration: "underline" }}>
          Pregled svih rezervacija
        </a>
      </p>
      <p>
        <a href="/book" style={{ color: "blue", textDecoration: "underline" }}>
          Ručno napravi rezervaciju
        </a>
      </p>
    </div>
  );
}
