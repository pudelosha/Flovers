import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import "./HowItWorks.css";

function StepCard({ idx, title, text }) {
  return (
    <div className="home-step card card-light">
      <div className="home-step-n">{idx}</div>
      <div className="home-step-body">
        <div className="home-step-title">{title}</div>
        <div className="muted home-p">{text}</div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const { t } = useTranslation("home");

  const steps = [
    {
      title: t("homeNew.steps.s1.title", { defaultValue: "Add a plant (recognize or search)" }),
      text: t("homeNew.steps.s1.text", {
        defaultValue:
          "Start by recognizing a plant or searching the catalog. Then confirm key details (location and exposure) so routines match your setup. Add notes for pot size, soil, or anything unique.",
      }),
    },
    {
      title: t("homeNew.steps.s2.title", { defaultValue: "Pick a definition → set intervals" }),
      text: t("homeNew.steps.s2.text", {
        defaultValue:
          "Plant definitions provide a sensible baseline for common care routines. Use that baseline to set watering/feeding/repot intervals, then tune them to your environment. One plant can have different routines than another of the same type.",
      }),
    },
    {
      title: t("homeNew.steps.s3.title", { defaultValue: "Do tasks fast (Home + plant page)" }),
      text: t("homeNew.steps.s3.text", {
        defaultValue:
          "Home shows what's due and what's next, without clutter. Open the plant to see context before you act, then close the task with optional notes (e.g., \"dry soil\", \"moved to brighter spot\"). Over time, your notes become your playbook.",
      }),
    },
    {
      title: t("homeNew.steps.s4.title", { defaultValue: "Optional: scan QR and/or add sensors" }),
      text: t("homeNew.steps.s4.text", {
        defaultValue:
          "If you use QR labels, scanning takes you directly to the right plant to complete tasks immediately. If you add sensors, readings help validate routines and spot trends instead of guessing. Both are optional, but powerful together.",
      }),
    },
  ];

  return (
    <section className="home-section">
      <Reveal y={16}>
        <h2 className="home-h2">{t("homeNew.sections.how.title", { defaultValue: "How it works" })}</h2>
        <p className="muted home-p home-lead">
          {t("homeNew.sections.how.subtitle", {
            defaultValue:
              "A repeatable loop: define → generate → complete → refine. Keep it simple, then add QR or sensors if you want faster workflow and better signal.",
          })}
        </p>
      </Reveal>

      <div className="home-steps-grid">
        {steps.map((s, i) => (
          <Reveal key={`${s.title}-${i}`} delay={0.05 * i} y={22}>
            <StepCard idx={String(i + 1).padStart(2, "0")} title={s.title} text={s.text} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}