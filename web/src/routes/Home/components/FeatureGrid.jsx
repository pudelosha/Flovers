import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import {
  IconBell,
  IconQR,
  IconRepeat,
  IconClipboardCheck,
  IconTimer,
  IconActivity
} from "./common/Icons";
import createPlantImg from "../../../assets/create_plant.png";
import readingsHistoryImg from "../../../assets/readings_history.png";
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

  const title = t("featureGrid.header.title", { defaultValue: "Features that keep care consistent" });
  const subtitle = t("featureGrid.header.subtitle", {
    defaultValue:
      "Flovers is built around a few practical features: smart starter intervals, tasks from reminders, daily notifications, QR shortcuts, and optional IoT readings—so you can keep plants healthy without thinking too hard about it."
  });

  const features = useMemo(
    () => [
      // 1) Suggested intervals
      {
        key: "intervals",
        icon: <IconRepeat />,
        title: t("featureGrid.tiles.intervals.title", { defaultValue: "Suggested intervals from plant definitions" }),
        text: t("featureGrid.tiles.intervals.text", {
          defaultValue:
            "Link a plant to a definition and Flovers suggests starter intervals based on the species and your setup. Accept them, tweak them, or keep your own cadence."
        }),
        tone: "glass"
      },

      // 2) Tasks from reminders
      {
        key: "tasks",
        icon: <IconTimer />,
        title: t("featureGrid.tiles.tasks.title", { defaultValue: "Reminders that turn into tasks" }),
        text: t("featureGrid.tiles.tasks.text", {
          defaultValue:
            "Set a recurring reminder (watering, misting, fertilising, repotting, care). Flovers turns it into due tasks. When you complete one, the next gets queued automatically."
        }),
        tone: "light"
      },

      // 3) Notifications (new)
      {
        key: "notifications",
        icon: <IconBell />,
        title: t("featureGrid.tiles.notifications.title", { defaultValue: "Daily notifications by push or email" }),
        text: t("featureGrid.tiles.notifications.text", {
          defaultValue:
            "Choose push or email in Profile settings. Flovers can send a daily summary at your chosen time (e.g., 14:00) with today’s due tasks, and optionally follow up ~24h later if tasks are overdue."
        }),
        tone: "glass"
      },

      // 4) QR (kept)
      {
        key: "qr",
        icon: <IconQR />,
        title: t("featureGrid.tiles.qr.title", { defaultValue: "QR scan to jump straight to the plant" }),
        text: t("featureGrid.tiles.qr.text", {
          defaultValue:
            "Print a QR code for a plant and attach it to the pot. Scan to open Plant Details instantly—fastest way to check context and mark care done."
        }),
        tone: "light"
      },

      // 5) IoT
      {
        key: "iot",
        icon: <IconActivity />,
        title: t("featureGrid.tiles.iot.title", { defaultValue: "Live IoT readings with trends" }),
        text: t("featureGrid.tiles.iot.text", {
          defaultValue:
            "Connect your ESP/Arduino device and send readings like temperature, humidity, light, and soil moisture. The app shows daily/weekly/monthly charts so you can spot patterns and adjust routines."
        }),
        tone: "glass"
      }
    ],
    [t]
  );

  const iotTriggerRef = useRef(null);
  const [showReadings, setShowReadings] = useState(false);

  useEffect(() => {
    const el = iotTriggerRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setShowReadings(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "0px 0px -25% 0px",
        threshold: 0.01
      }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const createAlt = t("featureGrid.images.createPlantAlt", { defaultValue: "" });
  const readingsAlt = t("featureGrid.images.readingsHistoryAlt", { defaultValue: "" });

  return (
    <section className="home-section home-flow">
      <div className="home-flow-grid">
        <div className="home-flow-left">
          <Reveal y={16}>
            <h2 className="home-h2">{title}</h2>
            <p className="muted home-p home-lead">{subtitle}</p>
          </Reveal>

          <div className="home-flow-stack">
            {features.map((f, idx) => {
              const isLast = f.key === "iot";
              return (
                <Reveal key={f.key} delay={0.03 * idx} y={18}>
                  <div ref={isLast ? iotTriggerRef : undefined}>
                    <BigFeature title={f.title} text={f.text} icon={f.icon} tone={f.tone} />
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* Hidden via CSS below 980px */}
        <div className="home-flow-right" aria-hidden="true">
          <div className="home-flow-phone">
            <div className="home-flow-phone-swap">
              <img
                src={createPlantImg}
                alt={createAlt}
                className={`home-flow-phone-img ${showReadings ? "is-hidden" : "is-visible"}`}
                loading="lazy"
              />
              <img
                src={readingsHistoryImg}
                alt={readingsAlt}
                className={`home-flow-phone-img ${showReadings ? "is-visible" : "is-hidden"}`}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
