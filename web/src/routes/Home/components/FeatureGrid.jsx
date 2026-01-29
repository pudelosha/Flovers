import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import {
  IconTasks,
  IconCalendar,
  IconLeaf,
  IconQR,
  IconSensor,
  IconBell,
} from "./common/Icons";
import "./FeatureGrid.css";

function BigFeature({ title, text, icon, tone = "glass" }) {
  return (
    <div className={`home-big card ${tone === "light" ? "card-light" : ""}`}>
      <div className="home-big-head">
        <div className="home-big-ico" aria-hidden="true">
          {icon}
        </div>
        <h3 className="home-h3">{title}</h3>
      </div>
      <p className="muted home-p">{text}</p>
    </div>
  );
}

export default function FeatureGrid() {
  const { t } = useTranslation("home");

  const features = [
    {
      icon: <IconTasks />,
      title: t("homeNew.features.tasks.title", { defaultValue: "Tasks from routines" }),
      text: t("homeNew.features.tasks.text", {
        defaultValue:
          "Create a routine once and Flovers generates tasks automatically. Close tasks quickly, and add notes when something changes.",
      }),
      tone: "light",
    },
    {
      icon: <IconCalendar />,
      title: t("homeNew.features.intervals.title", { defaultValue: "Intervals that make sense" }),
      text: t("homeNew.features.intervals.text", {
        defaultValue:
          "Plant definitions help you pick practical intervals (watering, feeding, repotting). Adjust per plant and keep your own cadence.",
      }),
      tone: "glass",
    },
    {
      icon: <IconLeaf />,
      title: t("homeNew.features.recognition.title", { defaultValue: "Plant recognition (700+)" }),
      text: t("homeNew.features.recognition.text", {
        defaultValue:
          "Identify plants from a supported catalog of 700+ entries. Start with recognition, then refine the definition for your environment.",
      }),
      tone: "glass",
    },
    {
      icon: <IconQR />,
      title: t("homeNew.features.qr.title", { defaultValue: "QR scan → instant plant page" }),
      text: t("homeNew.features.qr.text", {
        defaultValue:
          "Generate a QR per plant and attach it to the pot. Scan to jump straight to details and close tasks on the spot.",
      }),
      tone: "light",
    },
    {
      icon: <IconSensor />,
      title: t("homeNew.features.iot.title", { defaultValue: "IoT readings & trends" }),
      text: t("homeNew.features.iot.text", {
        defaultValue:
          "Connect your own devices and view readings over time. Use charts to spot drying patterns and adjust routines confidently.",
      }),
      tone: "glass",
    },
    {
      icon: <IconBell />,
      title: t("homeNew.features.notify.title", { defaultValue: "Notifications you control" }),
      text: t("homeNew.features.notify.text", {
        defaultValue:
          "Choose email/push consent, set a daily summary time, and optionally enable follow-up reminders for overdue tasks.",
      }),
      tone: "light",
    },
  ];

  return (
    <section className="home-section">
      <Reveal y={16}>
        <h2 className="home-h2">
          {t("homeNew.sections.features.title", { defaultValue: "Everything you need, in one flow" })}
        </h2>
        <p className="muted home-p home-lead">
          {t("homeNew.sections.features.subtitle", {
            defaultValue:
              "A simple model: routines create tasks, tasks get closed with notes, and plants keep the context. QR and IoT are optional accelerators.",
          })}
        </p>
      </Reveal>

      <div className="home-grid-2">
        {features.map((f, idx) => (
          <Reveal key={`${f.title}-${idx}`} delay={0.03 * (idx % 2)} y={20}>
            <BigFeature title={f.title} text={f.text} icon={f.icon} tone={f.tone} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}