import React from "react";
import Reveal from "./common/Reveal";
import qrScannerImg from "../../../assets/qr_scanner.png"; // adjust path if needed
import "./QRFlowSection.css";

export default function QRFlowSection() {
  return (
    <section className="home-section">
      <Reveal y={16}>
        <h2 className="home-h2">QR scanning: the physical shortcut</h2>
        <p className="muted home-p home-lead">
          Generate a QR code for each plant, print it, attach it to the pot, then scan to jump straight into that plant’s
          details and tasks.
        </p>
      </Reveal>

      <div className="home-qr card">
        {/* LEFT: image */}
        <div className="home-qr-media">
          <img
            src={qrScannerImg}
            alt="Scanning a plant QR code with the Flovers app"
            className="home-qr-image"
            loading="lazy"
          />
        </div>

        {/* RIGHT: content */}
        <div className="home-qr-content">
          <div className="home-qr-block">
            <div className="home-qr-title">Create → print → attach</div>
            <p className="muted home-p">
              Each plant instance has its own ID. In Plant Details you can generate a QR code for that plant, save it to
              your phone, or send it by email so you can print it and stick it on the pot.
            </p>
          </div>

          <div className="home-qr-block">
            <div className="home-qr-title">Scan → confirm → open Plant Details</div>
            <p className="muted home-p">
              Use the built-in QR scanner. After the backend confirms the code, you’re redirected to that exact plant’s
              details—tasks, reminders, notes, readings, and full context.
            </p>
          </div>

          <div className="home-qr-block">
            <div className="home-qr-title">Care in the moment</div>
            <p className="muted home-p">
              Water the plant, scan the label, and mark the task as complete—or just scan to check whether anything is
              due. A direct link between the physical plant and your data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
