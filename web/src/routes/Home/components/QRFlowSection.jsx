// QRFlowSection.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import qrScannerImg from "../../../assets/qr_scanner.png";
import "./QRFlowSection.css";

export default function QRFlowSection() {
  const { t } = useTranslation("home");

  const title = t("qr.title", { defaultValue: "QR scanning: the physical shortcut" });
  const lead = t("qr.lead", {
    defaultValue:
      "Generate a QR code for each plant, print it, attach it to the pot, then scan to jump straight into that plant’s details and tasks."
  });

  const b1Title = t("qr.blocks.create.title", { defaultValue: "Create → print → attach" });
  const b1Text = t("qr.blocks.create.text", {
    defaultValue:
      "Each plant instance has its own ID. In Plant Details you can generate a QR code for that plant, save it to your phone, or send it by email so you can print it and stick it on the pot."
  });

  const b2Title = t("qr.blocks.scan.title", { defaultValue: "Scan → confirm → open Plant Details" });
  const b2Text = t("qr.blocks.scan.text", {
    defaultValue:
      "Use the built-in QR scanner. After the backend confirms the code, you’re redirected to that exact plant’s details—tasks, reminders, notes, readings, and full context."
  });

  const b3Title = t("qr.blocks.care.title", { defaultValue: "Care in the moment" });
  const b3Text = t("qr.blocks.care.text", {
    defaultValue:
      "Water the plant, scan the label, and mark the task as complete—or just scan to check whether anything is due. A direct link between the physical plant and your data."
  });

  const imgAlt = t("qr.image.alt", { defaultValue: "Scanning a plant QR code with the Flovers app" });

  return (
    <section className="home-section">
      <Reveal y={16}>
        <h2 className="home-h2">{title}</h2>
        <p className="muted home-p home-lead">{lead}</p>
      </Reveal>

      <div className="home-qr card">
        <div className="home-qr-media" aria-hidden="true">
          <img src={qrScannerImg} alt={imgAlt} className="home-qr-image" loading="lazy" />
        </div>

        <div className="home-qr-content">
          <div className="home-qr-block">
            <div className="home-qr-title">{b1Title}</div>
            <p className="muted home-p">{b1Text}</p>
          </div>

          <div className="home-qr-block">
            <div className="home-qr-title">{b2Title}</div>
            <p className="muted home-p">{b2Text}</p>
          </div>

          <div className="home-qr-block">
            <div className="home-qr-title">{b3Title}</div>
            <p className="muted home-p">{b3Text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
