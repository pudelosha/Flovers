import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import { IconLeaf, IconCalendar } from "./common/Icons";
import "./CoreFeatures.css";

function EmphasisRow({ title, text, icon }) {
  return (
    <div className="home-em card card-light">
      <div className="home-em-ico" aria-hidden="true">
        {icon}
      </div>
      <div className="home-em-body">
        <div className="home-em-title">{title}</div>
        <div className="muted home-p">{text}</div>
      </div>
    </div>
  );
}

export default function CoreFeatures() {
  const { t } = useTranslation("home");

  return (
    <section className="home-section">
      <Reveal y={16}>
        <h2 className="home-h2">{t("homeNew.sections.core.title", { defaultValue: "Built for real plant routines" })}</h2>
        <p className="muted home-p home-lead">
          {t("homeNew.sections.core.subtitle", {
            defaultValue:
              "Recognition helps you start fast. Definitions help you pick better intervals. QR makes the workflow physical and effortless.",
          })}
        </p>
      </Reveal>

      <div className="home-em-grid">
        <Reveal y={18} delay={0.02}>
          <EmphasisRow
            icon={<IconLeaf />}
            title={t("homeNew.core.recognition.title", { defaultValue: "Plant recognition (700+ supported)" })}
            text={t("homeNew.core.recognition.text", {
              defaultValue:
                "Identify plants from a large catalog and save them as instances in your home. Recognition gets you close; your saved definition makes it accurate for your conditions.",
            })}
          />
        </Reveal>

        <Reveal y={18} delay={0.04}>
          <EmphasisRow
            icon={<IconCalendar />}
            title={t("homeNew.core.definition.title", { defaultValue: "Definitions → better reminder intervals" })}
            text={t("homeNew.core.definition.text", {
              defaultValue:
                "Plant definitions provide baseline care cadence (watering, feeding, repotting). Start from that baseline, then adjust intervals per location, exposure, and season.",
            })}
          />
        </Reveal>
      </div>
    </section>
  );
}