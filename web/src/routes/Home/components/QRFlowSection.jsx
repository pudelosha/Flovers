import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import "./QRFlowSection.css";

export default function QRFlowSection() {
  const { t } = useTranslation("home");

  return (
    <section className="home-section">
      <Reveal y={16}>
        <h2 className="home-h2">
          {t("homeNew.sections.qr.title", { defaultValue: "QR scanning: the \"physical shortcut\"" })}
        </h2>
        <p className="muted home-p home-lead">
          {t("homeNew.sections.qr.subtitle", {
            defaultValue: "Put a QR on the pot. Scan, land on the exact plant, and complete tasks immediately—no searching or scrolling.",
          })}
        </p>
      </Reveal>

      <div className="home-qr card">
        <div className="home-qr-left">
          <div className="home-qr-title">
            {t("homeNew.sections.qr.b1.title", { defaultValue: "One scan = one plant" })}
          </div>
          <div className="muted home-p">
            {t("homeNew.sections.qr.b1.text", {
              defaultValue:
                "Scanning opens Plant Details instantly. From there you can mark tasks done, add notes, or review context before you act.",
            })}
          </div>
        </div>

        <div className="home-qr-right">
          <div className="home-qr-title">
            {t("homeNew.sections.qr.b2.title", { defaultValue: "Made for real life" })}
          </div>
          <div className="muted home-p">
            {t("homeNew.sections.qr.b2.text", {
              defaultValue:
                "If you maintain many plants, QR turns the app into an on-the-spot tool: walk the room, scan, and finish what's due.",
            })}
          </div>
        </div>
      </div>
    </section>
  );
}