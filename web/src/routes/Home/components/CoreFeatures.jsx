import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import { IconLeaf } from "./common/Icons";
import "./CoreFeatures.css";

function FeatureTile({ title, desc, bullets, icon }) {
  return (
    <div className="home-rh-tile card card-light">
      <div className="home-rh-tile-head">
        <div className="home-rh-ico" aria-hidden="true">
          {icon}
        </div>
        <div className="home-rh-title">{title}</div>
      </div>

      <div className="muted home-rh-desc">{desc}</div>

      <div className="home-rh-bullets">
        {bullets.map((b, i) => (
          <div className="home-rh-bullet" key={i}>
            <span className="home-rh-dot" aria-hidden="true" />
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconCamera({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6.5 10.2 5h3.6L15 6.5H18a3 3 0 0 1 3 3V17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9.5a3 3 0 0 1 3-3h3Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
    </svg>
  );
}

export default function CoreFeatures() {
  const { t } = useTranslation("home");

  const title = t("core.title", { defaultValue: "The two things Flovers does best" });

  const lead = t("core.lead", {
    defaultValue:
      "A solid plant database and quick photo recognition. Pick a match, link it once, and you’ve got a clean starting point for caring for your plants."
  });

  return (
    <section className="home-section card home-rh-card">
      <div className="home-rh-inner">
        <Reveal y={16}>
          <div className="home-rh-head">
            <h2 className="home-rh-h2">{title}</h2>
            <p className="muted home-rh-lead">{lead}</p>
          </div>
        </Reveal>

        <div className="home-rh-grid">
          <Reveal y={18} delay={0.02}>
            <FeatureTile
              icon={<IconLeaf />}
              title={t("core.tiles.defs.title", { defaultValue: "700+ plant definitions with real care details" })}
              desc={t("core.tiles.defs.desc", {
                defaultValue:
                  "Browse definitions with photos and key traits. Link your plant to a definition and Flovers can guide you with sensible defaults."
              })}
              bullets={[
                t("core.tiles.defs.bullets.0", { defaultValue: "Care traits like light, soil, watering style, humidity, temperature." }),
                t("core.tiles.defs.bullets.1", { defaultValue: "Helpful starting point that you can tweak as you learn your space." }),
                t("core.tiles.defs.bullets.2", { defaultValue: "Quick linking so each plant has a clear baseline." })
              ]}
            />
          </Reveal>

          <Reveal y={18} delay={0.05}>
            <FeatureTile
              icon={<IconCamera />}
              title={t("core.tiles.recognition.title", { defaultValue: "Photo recognition that suggests the closest match" })}
              desc={t("core.tiles.recognition.desc", {
                defaultValue:
                  "Snap a photo or upload one and Flovers suggests what it looks like. Choose the best match, link it, and move on."
              })}
              bullets={[
                t("core.tiles.recognition.bullets.0", { defaultValue: "Works best with clear, well lit photos." }),
                t("core.tiles.recognition.bullets.1", { defaultValue: "Shows a few close options so you can pick the right one." }),
                t("core.tiles.recognition.bullets.2", { defaultValue: "Built to save time, not to lock you into a guess." })
              ]}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
