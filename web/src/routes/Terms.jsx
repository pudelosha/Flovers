// web/src/pages/Terms.jsx
import React from "react";
import { useTranslation } from "react-i18next";

function Section({ title, children }) {
  return (
    <section className="policy-section">
      <h2 className="h2">{title}</h2>
      {children}
    </section>
  );
}

function Para({ children }) {
  if (!children) return null;
  return <p>{children}</p>;
}

function Bullets({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className="policy-list">
      {items.map((it, idx) => (
        <li key={idx}>{it}</li>
      ))}
    </ul>
  );
}

export default function Terms() {
  const { t } = useTranslation("terms");

  return (
    <article className="card prose">
      {/* Match Privacy Policy formatting */}
      <h1 className="h1 h1-auth">{t("terms.title")}</h1>
      <p className="muted muted-center">
        {t("terms.lastUpdated", { date: "2026-01-28" })}
      </p>

      <Section title={t("terms.section1.title")}>
        <Para>{t("terms.section1.p1")}</Para>
        <Para>{t("terms.section1.p2")}</Para>
        <Para>{t("terms.section1.p3")}</Para>
        <Para>{t("terms.section1.p4")}</Para>
      </Section>

      <Section title={t("terms.section2.title")}>
        <Bullets items={t("terms.section2.items", { returnObjects: true })} />
      </Section>

      <Section title={t("terms.section3.title")}>
        <Para>{t("terms.section3.intro")}</Para>
        <Bullets items={t("terms.section3.list", { returnObjects: true })} />
        <Para>{t("terms.section3.p1")}</Para>
        <Para>{t("terms.section3.p2")}</Para>
      </Section>

      <Section title={t("terms.section4.title")}>
        <Bullets items={t("terms.section4.items", { returnObjects: true })} />
      </Section>

      <Section title={t("terms.section5.title")}>
        <Para>{t("terms.section5.p1")}</Para>
        <Para>{t("terms.section5.p2")}</Para>
        <Para>{t("terms.section5.p3")}</Para>
        <Para>{t("terms.section5.p4")}</Para>
      </Section>

      <Section title={t("terms.section6.title")}>
        <Para>{t("terms.section6.p1")}</Para>
        <Para>{t("terms.section6.p2")}</Para>
        <Para>{t("terms.section6.p3")}</Para>
        <Para>{t("terms.section6.p4")}</Para>
      </Section>

      <Section title={t("terms.section7.title")}>
        <Para>{t("terms.section7.intro")}</Para>
        <Bullets items={t("terms.section7.list", { returnObjects: true })} />
        <Para>{t("terms.section7.p1")}</Para>
      </Section>

      <Section title={t("terms.section8.title")}>
        <Para>{t("terms.section8.p1")}</Para>
        <Para>{t("terms.section8.p2")}</Para>
      </Section>

      <Section title={t("terms.section9.title")}>
        <Para>{t("terms.section9.p1")}</Para>
        <Para>{t("terms.section9.p2")}</Para>
        <Para>{t("terms.section9.p3")}</Para>
      </Section>

      <Section title={t("terms.section10.title")}>
        <Para>{t("terms.section10.p1")}</Para>
        <Para>{t("terms.section10.p2")}</Para>
        <Para>{t("terms.section10.p3")}</Para>
        <Para>{t("terms.section10.p4")}</Para>
      </Section>

      <Section title={t("terms.section11.title")}>
        <Para>{t("terms.section11.p1")}</Para>
        <Para>{t("terms.section11.p2")}</Para>
        <Para>{t("terms.section11.p3")}</Para>
      </Section>

      <Section title={t("terms.section12.title")}>
        <Para>{t("terms.section12.p1")}</Para>
        <Para>{t("terms.section12.p2")}</Para>
        <Para>{t("terms.section12.p3")}</Para>
      </Section>

      <Section title={t("terms.section13.title")}>
        <Para>{t("terms.section13.p1")}</Para>
        <Para>{t("terms.section13.p2")}</Para>
      </Section>

      <Section title={t("terms.section14.title")}>
        <Para>{t("terms.section14.p1")}</Para>
        <Para>{t("terms.section14.p2")}</Para>
      </Section>

      <Section title={t("terms.section15.title")}>
        <Para>{t("terms.section15.intro")}</Para>
        <Bullets items={t("terms.section15.list", { returnObjects: true })} />
      </Section>

      <Section title={t("terms.section16.title")}>
        <Para>{t("terms.section16.p1")}</Para>
        <Para>{t("terms.section16.p2")}</Para>
        <Para>{t("terms.section16.p3")}</Para>
        <Para>{t("terms.section16.p4")}</Para>
      </Section>

      <Section title={t("terms.section17.title")}>
        <Para>{t("terms.section17.p1")}</Para>
        <Para>{t("terms.section17.p2")}</Para>
      </Section>
    </article>
  );
}
