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

export default function PrivacyPolicy() {
  const { t } = useTranslation("privacy-policy");

  return (
    <article className="card prose">
      <h1 className="h1 h1-auth">{t("privacy.title")}</h1>
      <p className="muted muted-center">
        {t("privacy.lastUpdated", { date: "2026-01-28" })}
      </p>

      <Section title={t("privacy.section1.title")}>
        <Para>{t("privacy.section1.p1")}</Para>
        <Para>{t("privacy.section1.p2")}</Para>
        <Para>{t("privacy.section1.p3")}</Para>
      </Section>

      <Section title={t("privacy.section2.title")}>
        <Para>{t("privacy.section2.intro")}</Para>
        <Bullets items={t("privacy.section2.list", { returnObjects: true })} />
        <Para>{t("privacy.section2.legalBasis")}</Para>
      </Section>

      <Section title={t("privacy.section3.title")}>
        <Para>{t("privacy.section3.intro")}</Para>
        <Bullets items={t("privacy.section3.list", { returnObjects: true })} />
        <Para>{t("privacy.section3.note")}</Para>
      </Section>

      <Section title={t("privacy.section4.title")}>
        <Para>{t("privacy.section4.p1")}</Para>
        <Para>{t("privacy.section4.p2")}</Para>
        <Para>{t("privacy.section4.p3")}</Para>
        <Para>{t("privacy.section4.p4")}</Para>
      </Section>

      <Section title={t("privacy.section5.title")}>
        <Para>{t("privacy.section5.p1")}</Para>
        <Para>{t("privacy.section5.p2")}</Para>
        <Para>{t("privacy.section5.p3")}</Para>
      </Section>

      <Section title={t("privacy.section6.title")}>
        <Para>{t("privacy.section6.p1")}</Para>
        <Para>{t("privacy.section6.p2")}</Para>
        <Para>{t("privacy.section6.p3")}</Para>
      </Section>

      <Section title={t("privacy.section7.title")}>
        <Para>{t("privacy.section7.p1")}</Para>
        <Para>{t("privacy.section7.p2")}</Para>
        <Para>{t("privacy.section7.p3")}</Para>
        <Para>{t("privacy.section7.p4")}</Para>
      </Section>

      <Section title={t("privacy.section8.title")}>
        <Para>{t("privacy.section8.p1")}</Para>
        <Para>{t("privacy.section8.p2")}</Para>
      </Section>

      <Section title={t("privacy.section9.title")}>
        <Para>{t("privacy.section9.intro")}</Para>
        <Bullets items={t("privacy.section9.list", { returnObjects: true })} />
        <Para>{t("privacy.section9.p2")}</Para>
        <Para>{t("privacy.section9.p3")}</Para>
      </Section>

      <Section title={t("privacy.section10.title")}>
        <Para>{t("privacy.section10.p1")}</Para>
        <Para>{t("privacy.section10.p2")}</Para>
        <Para>{t("privacy.section10.p3")}</Para>
      </Section>
    </article>
  );
}
