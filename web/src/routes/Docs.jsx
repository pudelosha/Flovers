import React from "react";

export default function Docs() {
  return (
    <section className="card prose">
      <h1 className="h1">Dokumentacja</h1>
      <p className="muted">
        Tutaj możesz dodać krótką dokumentację użytkownika lub linki.
      </p>

      <h2 className="h2">Linki</h2>
      <ul>
        <li>Google Play</li>
        <li>App Store (w przyszłości)</li>
        <li>Polityka prywatności</li>
        <li>Regulamin</li>
      </ul>
    </section>
  );
}
