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
      title: t("homeNew.steps.s1.title", {
        defaultValue: "Add a plant by recognizing it or searching the database",
      }),
      text: t("homeNew.steps.s1.text", {
        defaultValue:
          "Create a plant in seconds. Search the 700+ plant definition database or use photo recognition to get a suggested match. Once added, care routines, tasks, and history stay linked to this single plant instance.",
      }),
    },
    {
      title: t("homeNew.steps.s2.title", {
        defaultValue: "Link a definition, set context, and get sensible intervals",
      }),
      text: t("homeNew.steps.s2.text", {
        defaultValue:
          "Connect the plant to a definition to unlock care traits and defaults. Add real-world context like pot size, soil type, location, and light level. Based on this, Flovers helps calculate realistic reminder intervals that you can adjust anytime.",
      }),
    },
    {
      title: t("homeNew.steps.s3.title", {
        defaultValue: "Complete tasks quickly and build a clean care history",
      }),
      text: t("homeNew.steps.s3.text", {
        defaultValue:
          "Reminders automatically generate due tasks. Home shows what’s due, while the plant page shows full context. When you complete a task, you can add notes, and Flovers queues the next one so the routine keeps running without manual planning.",
      }),
    },
    {
      title: t("homeNew.steps.s4.title", {
        defaultValue: "Stay on track with daily notifications",
      }),
      text: t("homeNew.steps.s4.text", {
        defaultValue:
          "Choose push or email notifications in Profile settings and set a delivery time. You’ll get a daily summary of tasks due today, with optional follow-ups if tasks become overdue, so nothing quietly slips through.",
      }),
    },
  ];

  return (
    <section className="home-section">
      <Reveal y={16}>
        <h2 className="home-h2">
          {t("homeNew.sections.how.title", { defaultValue: "How it works" })}
        </h2>
        <p className="muted home-p home-lead">
          {t("homeNew.sections.how.subtitle", {
            defaultValue:
              "A simple loop: add → define → act → stay consistent. Flovers keeps the routine moving so you can focus on the plants, not the planning.",
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
