import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import sketch1 from "../assets/Sketch_1.jpg";
import "../styles/schemas.css";
import firmwareExample from "../assets/firmware-example.ino?raw";

const INGEST_ENDPOINT = "https://api.flovers.app/readings/ingest/";
const PUMP_NEXT_TASK_ENDPOINT = "https://api.flovers.app/readings/pump-next-task/";
const PUMP_COMPLETE_ENDPOINT = "https://api.flovers.app/readings/pump-complete/";
const FEED_ENDPOINT = "https://api.flovers.app/readings/feed/";

function CodeBlock({ text, label }) {
  const { t } = useTranslation("schemas");
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <section className="schema-block">
      <div className="schema-block-head">
        <div className="schema-block-label">{label}</div>
        <button className="schema-copy" type="button" onClick={onCopy}>
          {copied ? t("common.copied") : t("common.copy")}
        </button>
      </div>

      <pre className="schema-code">
        <code>{text}</code>
      </pre>
    </section>
  );
}

function InfoRow({ label, value, sub }) {
  return (
    <div className="schema-inforow">
      <div className="schema-inforow-label">
        {label}
        {sub ? <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div> : null}
      </div>
      <div className="schema-inforow-value">
        <code>{value}</code>
      </div>
    </div>
  );
}

function Paragraphs({ value, className = "muted" }) {
  if (Array.isArray(value)) {
    return value.map((p, i) => (
      <p key={i} className={className}>
        {p}
      </p>
    ));
  }

  if (typeof value === "string" && value.trim()) {
    return <p className={className}>{value}</p>;
  }

  return null;
}

function BulletList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <ul className="schema-list">
      {items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );
}

function WiringPlaceholder({ ariaLabel, title, sub, imageSrc, imageAlt, onClick }) {
  return (
    <button
      type="button"
      className="schema-wiring"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: 0,
        margin: 0,
        border: 0,
        background: "transparent",
        borderRadius: "16px",
        overflow: "hidden",
        cursor: imageSrc ? "zoom-in" : "default",
        display: "block",
        alignSelf: "stretch",
      }}
    >
      <div
        className="schema-wiring-inner"
        style={{
          width: "100%",
          maxWidth: "100%",
          minHeight: 260,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        {imageSrc ? (
          <>
            <div
              style={{
                width: "100%",
                height: 220,
                background: "#111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={imageSrc}
                alt={imageAlt || title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            <div
              style={{
                padding: "14px 16px 16px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div className="schema-wiring-title">{title}</div>
              <div className="schema-wiring-sub muted">{sub}</div>
            </div>
          </>
        ) : (
          <div style={{ padding: "20px", width: "100%", boxSizing: "border-box" }}>
            <div className="schema-wiring-title">{title}</div>
            <div className="schema-wiring-sub muted">{sub}</div>
          </div>
        )}
      </div>
    </button>
  );
}

function ImageModal({ open, src, alt, closeLabel, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          border: 0,
          background: "rgba(255,255,255,0.08)",
          color: "#fff",
          borderRadius: 10,
          padding: "10px 14px",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>

      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: "96vw",
          maxHeight: "96vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: "96vw",
            maxHeight: "96vh",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            display: "block",
            borderRadius: 12,
          }}
        />
      </div>
    </div>
  );
}

export default function Schema() {
  const { t } = useTranslation("schemas");
  const [modalImage, setModalImage] = useState(null);

  const trArray = (key) => {
    const value = t(key, { returnObjects: true, defaultValue: [] });
    return Array.isArray(value) ? value : [];
  };

  const ingestJsonSchema = useMemo(
    () => `{
  "secret": "string",
  "device_key": "string",
  "device_id": "number optional",
  "timestamp": "ISO-8601 UTC string",
  "metrics": {
    "temperature": "number optional",
    "humidity": "number optional",
    "light": "number optional",
    "moisture": "number optional"
  }
}`,
    []
  );

  const ingestExamplePayload = useMemo(
    () => `{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "timestamp": "2026-01-06T10:11:00Z",
  "metrics": {
    "temperature": 20.5,
    "humidity": 40.0,
    "light": 520,
    "moisture": 40
  }
}`,
    []
  );

  const ingestPowershellSample = useMemo(
    () => `# PowerShell example: send one reading

$body = @'
{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "timestamp": "2026-01-06T10:11:00Z",
  "metrics": {
    "temperature": 20.5,
    "humidity": 40.0,
    "light": 520,
    "moisture": 40
  }
}
'@

Invoke-RestMethod \`
  -Uri "${INGEST_ENDPOINT}" \`
  -Method POST \`
  -ContentType "application/json" \`
  -Body $body`,
    []
  );

  const pumpNextTaskSchema = useMemo(
    () => `{
  "secret": "string",
  "device_key": "string",
  "device_id": "number optional",
  "supports_task_retry": "boolean optional, defaults false",
  "supports_auto_claim": "boolean optional, defaults false"
}`,
    []
  );

  const pumpNextTaskExamplePayload = useMemo(
    () => `{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "supports_auto_claim": true
}`,
    []
  );

  const pumpNextTaskNoJobResponse = useMemo(
    () => `{
  "run": false,
  "task_id": null,
  "source": null,
  "reason": null,
  "pump_included": true,
  "auto_pump_enabled": true,
  "auto_pump_threshold_pct": 30,
  "moisture_sensor_enabled": true
}`,
    []
  );

  const pumpNextTaskWithJobResponse = useMemo(
    () => `{
  "run": true,
  "task_id": 123,
  "source": "manual",
  "reason": "manual_scheduled",
  "pump_included": true,
  "auto_pump_enabled": true,
  "auto_pump_threshold_pct": 30,
  "moisture_sensor_enabled": true
}`,
    []
  );

  const pumpNextTaskPowershellSample = useMemo(
    () => `# PowerShell example: check for pending manual watering task

$body = @'
{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "supports_auto_claim": true
}
'@

Invoke-RestMethod \`
  -Uri "${PUMP_NEXT_TASK_ENDPOINT}" \`
  -Method POST \`
  -ContentType "application/json" \`
  -Body $body`,
    []
  );

  const pumpCompleteManualPayload = useMemo(
    () => `{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "task_id": 123,
  "source": "manual",
  "success": true
}`,
    []
  );

  const pumpCompleteAutomaticPayload = useMemo(
    () => `{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "task_id": 124,
  "source": "automatic",
  "success": true
}`,
    []
  );

  const pumpCompleteFailedPayload = useMemo(
    () => `{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "task_id": 123,
  "source": "manual",
  "success": false,
  "error_message": "Pump execution failed"
}`,
    []
  );

  const pumpCompletePowershellSample = useMemo(
    () => `# PowerShell example: report manual watering completion

$body = @'
{
  "secret": "YOUR_SECRET",
  "device_key": "YOUR_DEVICE_KEY",
  "device_id": 12,
  "task_id": 123,
  "source": "manual",
  "success": true
}
'@

Invoke-RestMethod \`
  -Uri "${PUMP_COMPLETE_ENDPOINT}" \`
  -Method POST \`
  -ContentType "application/json" \`
  -Body $body`,
    []
  );

  const feedRequestExample = useMemo(
    () => `${FEED_ENDPOINT}?device_key=YOUR_DEVICE_KEY&secret=YOUR_SECRET`,
    []
  );

  const feedResponseExample = useMemo(
    () => `{
  "device": {
    "id": 12,
    "device_name": "Plant sensor",
    "plant_name": "Monstera",
    "interval_hours": 1
  },
  "readings": [
    {
      "id": 456,
      "timestamp": "2026-01-06T10:00:00Z",
      "temperature": 20.5,
      "humidity": 40.0,
      "light": 520,
      "moisture": 40
    }
  ]
}`,
    []
  );

  const relayOutputExample = useMemo(
    () => `digitalWrite(PUMP_PIN, HIGH);
delay(PUMP_RUN_MS);
digitalWrite(PUMP_PIN, LOW);`,
    []
  );

  const calibrationExample = useMemo(
    () => `#define SOIL_DRY_VALUE 3900
#define SOIL_WET_VALUE 1300`,
    []
  );

  const generatedFirmwareSample = firmwareExample;

  return (
    <>
      <article className="card prose schema-page">
        <h1 className="h1 h1-auth">{t("title")}</h1>

        <Paragraphs value={trArray("lead")} className="muted schema-lead" />

        <div className="schema-grid">
          <div className="schema-col">
            <section className="schema-section">
              <h2 className="h2">{t("firmwareIntro.title")}</h2>
              <p className="muted">{t("firmwareIntro.lead")}</p>
              <BulletList items={trArray("firmwareIntro.items")} />
              <p className="muted">{t("firmwareIntro.defaultTiming")}</p>
              <p className="muted">{t("firmwareIntro.adjustmentNote")}</p>
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("endpoints.title")}</h2>

              <div className="schema-endpoints">
                <InfoRow
                  label={t("endpoints.ingest.title")}
                  sub={t("endpoints.ingest.direction")}
                  value={INGEST_ENDPOINT}
                />
                <InfoRow
                  label={t("endpoints.pumpNextTask.title")}
                  sub={t("endpoints.pumpNextTask.direction")}
                  value={PUMP_NEXT_TASK_ENDPOINT}
                />
                <InfoRow
                  label={t("endpoints.pumpComplete.title")}
                  sub={t("endpoints.pumpComplete.direction")}
                  value={PUMP_COMPLETE_ENDPOINT}
                />
                <InfoRow
                  label={t("endpoints.feed.title")}
                  sub={t("endpoints.feed.direction")}
                  value={FEED_ENDPOINT}
                />
              </div>

              <div className="schema-note muted">
                <Paragraphs value={trArray("endpoints.ingest.desc")} />
                <BulletList items={trArray("endpoints.ingest.authItems")} />

                <h3 className="h2" style={{ marginTop: 24 }}>
                  {t("endpoints.pumpNextTask.title")}
                </h3>
                <Paragraphs value={trArray("endpoints.pumpNextTask.desc")} />

                <h3 className="h2" style={{ marginTop: 24 }}>
                  {t("endpoints.pumpComplete.title")}
                </h3>
                <Paragraphs value={trArray("endpoints.pumpComplete.desc")} />
                <BulletList items={trArray("endpoints.pumpComplete.items")} />

                <h3 className="h2" style={{ marginTop: 24 }}>
                  {t("endpoints.feed.title")}
                </h3>
                <Paragraphs value={trArray("endpoints.feed.desc")} />
              </div>
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("ingest.title")}</h2>
              <p className="muted">{t("ingest.desc")}</p>

              <CodeBlock label={t("ingest.payloadShape")} text={ingestJsonSchema} />
              <CodeBlock label={t("ingest.examplePayload")} text={ingestExamplePayload} />
              <CodeBlock label={t("ingest.powershellExample")} text={ingestPowershellSample} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("pumpNextTask.title")}</h2>
              <Paragraphs value={trArray("pumpNextTask.desc")} />
              <BulletList items={trArray("pumpNextTask.items")} />
              <p className="muted">{t("retrySafety")}</p>
              <p className="muted">{t("claimSafety")}</p>

              <CodeBlock label={t("pumpNextTask.payloadShape")} text={pumpNextTaskSchema} />
              <CodeBlock label={t("pumpNextTask.examplePayload")} text={pumpNextTaskExamplePayload} />
              <CodeBlock label={t("pumpNextTask.responseNoTask")} text={pumpNextTaskNoJobResponse} />
              <CodeBlock label={t("pumpNextTask.responseWithTask")} text={pumpNextTaskWithJobResponse} />
              <CodeBlock label={t("pumpNextTask.powershellExample")} text={pumpNextTaskPowershellSample} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("pumpComplete.title")}</h2>
              <Paragraphs value={trArray("pumpComplete.desc")} />

              <CodeBlock label={t("pumpComplete.manualPayload")} text={pumpCompleteManualPayload} />
              <CodeBlock label={t("pumpComplete.automaticPayload")} text={pumpCompleteAutomaticPayload} />
              <CodeBlock label={t("pumpComplete.failedPayload")} text={pumpCompleteFailedPayload} />
              <CodeBlock label={t("pumpComplete.powershellExample")} text={pumpCompletePowershellSample} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("feed.title")}</h2>
              <Paragraphs value={trArray("feed.desc")} />

              <CodeBlock label={t("feed.exampleRequest")} text={feedRequestExample} />
              <CodeBlock label={t("feed.exampleResponse")} text={feedResponseExample} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("generatedFirmware.title")}</h2>
              <Paragraphs value={trArray("generatedFirmware.desc")} />

              <p className="muted">{t("generatedFirmware.adjustIntro")}</p>
              <BulletList items={trArray("generatedFirmware.adjustItems")} />

              <CodeBlock
                label={t("generatedFirmware.codeLabel")}
                text={generatedFirmwareSample}
              />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("behavior.title")}</h2>

              <h3 className="h2">{t("behavior.fullCycle.title")}</h3>
              <p className="muted">{t("behavior.fullCycle.desc")}</p>
              <BulletList items={trArray("behavior.fullCycle.items")} />

              <h3 className="h2" style={{ marginTop: 24 }}>
                {t("behavior.manualCheck.title")}
              </h3>
              <Paragraphs value={trArray("behavior.manualCheck.desc")} />
              <BulletList items={trArray("behavior.manualCheck.items")} />

              <h3 className="h2" style={{ marginTop: 24 }}>
                {t("behavior.automatic.title")}
              </h3>
              <Paragraphs value={trArray("behavior.automatic.desc")} />
              <BulletList items={trArray("behavior.automatic.items")} />
              <p className="muted">{t("behavior.automatic.cooldown")}</p>

              <h3 className="h2" style={{ marginTop: 24 }}>
                {t("behavior.manual.title")}
              </h3>
              <Paragraphs value={trArray("behavior.manual.desc")} />
              <BulletList items={trArray("behavior.manual.items")} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("hardware.title")}</h2>
              <p className="muted">{t("hardware.desc")}</p>
              <BulletList items={trArray("hardware.items")} />
              <p className="muted">{t("hardware.verify")}</p>
              <p className="muted">{t("hardware.relayNote")}</p>
              <CodeBlock label={t("hardware.relayCodeLabel")} text={relayOutputExample} />
              <p className="muted">{t("hardware.relayReverse")}</p>
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("calibration.title")}</h2>
              <Paragraphs value={trArray("calibration.desc")} />
              <CodeBlock label={t("calibration.codeLabel")} text={calibrationExample} />
            </section>

            <section className="schema-section">
              <h2 className="h2">{t("safety.title")}</h2>
              <p className="muted">{trArray("safety.desc")[0]}</p>
              <BulletList items={trArray("safety.items")} />
              <p className="muted">{trArray("safety.desc")[1]}</p>
            </section>
          </div>

          <aside
            className="schema-aside"
            style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              alignSelf: "start",
            }}
          >
            <section
              className="schema-section"
              style={{
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                margin: 0,
              }}
            >
              <h2 className="h2">{t("wiring.title")}</h2>
              <p className="muted">{t("wiring.desc")}</p>

              <div
                className="schema-wiring-stack"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                }}
              >
                <WiringPlaceholder
                  ariaLabel={t("wiring.ariaPrimary")}
                  title={t("wiring.placeholderTitlePrimary")}
                  sub={t("wiring.placeholderSubPrimary")}
                  imageSrc={sketch1}
                  imageAlt={t("wiring.ariaPrimary")}
                  onClick={() =>
                    setModalImage({
                      src: sketch1,
                      alt: t("wiring.ariaPrimary"),
                    })
                  }
                />
              </div>
            </section>
          </aside>
        </div>
      </article>

      <ImageModal
        open={Boolean(modalImage)}
        src={modalImage?.src}
        alt={modalImage?.alt || ""}
        closeLabel={t("common.closePreview")}
        onClose={() => setModalImage(null)}
      />
    </>
  );
}
