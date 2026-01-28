import React from "react";

export default function Contact() {
  return (
    <div className="stack">
      <section className="card">
        <h1 className="h1">Kontakt</h1>
        <p className="muted">
          Dodaj tu adres e-mail do wsparcia i ewentualnie dane firmy.
        </p>

        <div className="list">
          <div className="list-row">
            <span className="key">E-mail</span>
            <span className="val">support@flovers.app</span>
          </div>
          <div className="list-row">
            <span className="key">Czas odpowiedzi</span>
            <span className="val">1–3 dni robocze</span>
          </div>
        </div>
      </section>
    </div>
  );
}
