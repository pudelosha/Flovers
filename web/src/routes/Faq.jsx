import React from "react";
import { useTranslation } from "react-i18next";

export default function Faq() {
  const { t } = useTranslation("faq");
  const items = t("items", { returnObjects: true });

  return (
    <section className="card prose">
      <h1 className="h1">{t("title")}</h1>

      {items.map((item, idx) => (
        <div key={idx} className="faq-item">
          <h2 className="h2">{item.q}</h2>
          <p className="muted">{item.a}</p>
        </div>
      ))}
    </section>
  );
}
