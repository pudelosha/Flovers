import React from "react";

const items = [
  { q: "Gdzie znajdę regulamin?", a: "W stopce strony lub pod /terms." },
  { q: "Gdzie jest polityka prywatności?", a: "W stopce strony lub pod /privacy-policy." },
  { q: "Jak skontaktować się ze wsparciem?", a: "Wejdź w /contact." },
];

export default function Faq() {
  return (
    <section className="card prose">
      <h1 className="h1">FAQ</h1>
      {items.map((x, idx) => (
        <div key={idx} className="faq-item">
          <h2 className="h2">{x.q}</h2>
          <p className="muted">{x.a}</p>
        </div>
      ))}
    </section>
  );
}
