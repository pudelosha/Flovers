import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Reveal from "./common/Reveal";
import { IconTasks, IconCalendar, IconQR, IconSensor } from "./common/Icons";
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

  const title = t("featureGrid.header.title", { defaultValue: "How the flow works" });
  const subtitle = t("featureGrid.header.subtitle", {
    defaultValue:
      "You add a plant, set a reminder, and Flovers keeps the loop going. Tasks show up with due dates, you close them when you’re done, and the next one gets queued automatically."
  });

  const features = useMemo(
    () => [
      {
        key: "tasks",
        icon: <IconTasks />,
        title: t("featureGrid.tiles.tasks.title", { defaultValue: "Reminders that turn into tasks" }),
        text: t("featureGrid.tiles.tasks.text", {
          defaultValue:
            "Pick a reminder type like watering, misting, fertilising, repotting, or care. Set an interval, and Flovers creates due tasks for you. When you close one, the next task is created from the same reminder."
        }),
        tone: "light"
      },
      {
        key: "intervals",
        icon: <IconCalendar />,
        title: t("featureGrid.tiles.intervals.title", { defaultValue: "Suggested intervals from plant definitions" }),
        text: t("featureGrid.tiles.intervals.text", {
          defaultValue:
            "When you link a plant to a definition, Flovers can suggest starter intervals based on the species and your setup. You can accept them, tweak them, or keep your own cadence."
        }),
        tone: "glass"
      },
      {
        key: "qr",
        icon: <IconQR />,
        title: t("featureGrid.tiles.qr.title", { defaultValue: "QR scan to jump straight to the plant" }),
        text: t("featureGrid.tiles.qr.text", {
          defaultValue:
            "Print a QR code for a plant and stick it on the pot. Scan it with your phone camera to open the plant details instantly. It’s the fastest way to check info and get care done."
        }),
        tone: "light"
      },
      {
        key: "iot",
        icon: <IconSensor />,
        title: t("featureGrid.tiles.iot.title", { defaultValue: "Live IoT readings with trends" }),
        text: t("featureGrid.tiles.iot.text", {
          defaultValue:
            "Connect your own ESP or Arduino device and send readings like temperature, humidity, light, and soil moisture. In the app you get charts with daily, weekly, and monthly views, so you can spot patterns and adjust with confidence."
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
