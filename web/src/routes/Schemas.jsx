import React from "react";

export default function Schemas() {
  return (
    <article className="card prose">
      <h1 className="h1 h1-auth">Wiring schemas & examples</h1>

      <div className="stack">
        <section className="policy-section">
          <h2 className="h2">Overview</h2>
          <p className="muted">
            This section will contain wiring schemas, connection diagrams, and example setups for integrating external
            hardware with Flovers. The goal is to provide clear, practical references you can follow step by step.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="h2">Supported devices</h2>
          <p className="muted">
            Planned examples include common microcontrollers such as ESP8266, ESP32, and Arduino-based boards, along
            with typical sensors for temperature, humidity, light, and soil moisture.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="h2">Wiring diagrams</h2>
          <p className="muted">
            Each diagram will show pin connections, power requirements, and recommended configurations. Schemas are
            intended to be simple, readable, and safe for beginners as well as advanced users.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="h2">Sample code</h2>
          <p className="muted">
            Example firmware snippets will demonstrate how to read sensor values, format payloads, and send data to the
            Flovers backend. Code samples will focus on clarity rather than optimization.
          </p>
        </section>

        <section className="policy-section">
          <h2 className="h2">Status</h2>
          <p className="muted">
            This page is a placeholder. Content will be expanded as hardware integrations are finalized and documented.
            Expect diagrams, images, and downloadable examples in future updates.
          </p>
        </section>
      </div>
    </article>
  );
}
