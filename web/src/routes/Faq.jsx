import React from "react";
import { useTranslation } from "react-i18next";

export default function Faq() {
  const { t } = useTranslation("faq");
  const items = t("items", { returnObjects: true });

  return (
    <article className="card prose">
      <h1 className="h1 h1-auth">{t("title")}</h1>

      <div className="stack">
        {items.map((item, idx) => (
          <section key={idx} className="policy-section">
            <h2 className="h2">{item.q}</h2>
            <p className="muted">{item.a}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
