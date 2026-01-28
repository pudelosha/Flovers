import React from "react";

export default function Home() {
  return (
    <div className="stack">
      <section className="hero card">
        <h1 className="h1">Flovers</h1>
        <p className="muted">
          Prosta wizytówka aplikacji + linki do dokumentów: regulamin, polityka
          prywatności, kontakt.
        </p>

        <div className="row">
          <a className="btn" href="#" target="_blank" rel="noreferrer">
            Google Play (wkrótce)
          </a>
          <a className="btn secondary" href="#" target="_blank" rel="noreferrer">
            iOS (wkrótce)
          </a>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2 className="h2">Dlaczego Flovers?</h2>
          <p className="muted">
            Wstawisz tu zwięzły opis wartości aplikacji i główne funkcje.
          </p>
        </div>

        <div className="card">
          <h2 className="h2">Bezpieczeństwo</h2>
          <p className="muted">
            Linki do polityki prywatności i zasad przetwarzania danych.
          </p>
        </div>

        <div className="card">
          <h2 className="h2">Wsparcie</h2>
          <p className="muted">
            Kontakt, FAQ, dokumentacja i odnośniki do sklepów.
          </p>
        </div>
      </section>
    </div>
  );
}
