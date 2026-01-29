import React, { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, useAnimation, useInView, useReducedMotion } from "framer-motion";

function GooglePlayIcon() {
  // Simple “Play” triangle mark (clean, not official asset)
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.5 3.8c0-.9 1-1.4 1.7-.9l13.4 9c.6.4.6 1.3 0 1.7l-13.4 9c-.7.5-1.7 0-1.7-.9V3.8z"
        opacity="0.95"
      />
    </svg>
  );
}

function AppleIcon() {
  // Minimal apple-like mark (clean, not official asset)
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.7 13.1c0-2.3 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.9-1.5 0-3 .9-3.8 2.2-1.6 2.8-.4 6.9 1.1 9.2.8 1.1 1.7 2.4 2.9 2.3 1.1 0 1.6-.7 3-.7 1.4 0 1.8.7 3 .7 1.2 0 2-.1 3.2-1.8.7-1 1-2 1.1-2.1-.1 0-2.6-1-2.6-3.4z"
      />
      <path
        fill="currentColor"
        d="M14.9 5.9c.6-.7 1-1.6.9-2.6-.9.1-1.9.6-2.6 1.3-.6.6-1 1.6-.9 2.5 1 .1 2-.5 2.6-1.2z"
        opacity="0.85"
      />
    </svg>
  );
}

function Badge({ children }) {
  return <div className="home-badge">{children}</div>;
}

function Stat({ label, value }) {
  return (
    <div className="home-stat">
      <div className="home-stat-value">{value}</div>
      <div className="home-stat-label muted">{label}</div>
    </div>
  );
}

/**
 * Reveal that animates IN when visible and OUT when not,
 * without using Web Animations API (which was “sticking” opacity=0).
 */
function Reveal({ children, className = "", delay = 0, y = 18, amount = 0.28 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const controls = useAnimation();
  const inView = useInView(ref, { amount, margin: "0px 0px -10% 0px" });

  const hidden = useMemo(
    () => ({ opacity: 0, y: reduce ? 0 : y }),
    [reduce, y]
  );
  const shown = useMemo(() => ({ opacity: 1, y: 0 }), []);

  React.useEffect(() => {
    if (reduce) {
      controls.set({ opacity: 1, y: 0 });
      return;
    }
    controls.start(inView ? shown : hidden);
  }, [controls, inView, reduce, shown, hidden]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={hidden}
      animate={controls}
      transition={{
        duration: 0.55,
        ease: "easeOut",
        delay: reduce ? 0 : delay,
      }}
    >
      {children}
    </motion.div>
  );
}

function StoreButtons({ t }) {
  const googlePlayUrl = t("hero.cta.googlePlayUrl", { defaultValue: "" });
  const appStoreUrl = t("hero.cta.appStoreUrl", { defaultValue: "" });

  return (
    <div className="home-store-row">
      <a
        className="home-store home-store-gp"
        href={googlePlayUrl || "#"}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!googlePlayUrl}
        onClick={(e) => !googlePlayUrl && e.preventDefault()}
      >
        <span className="home-store-ico" aria-hidden="true">
          <GooglePlayIcon />
        </span>
        <span className="home-store-txt">
          <span className="home-store-kicker">
            {t("homeNew.store.google.kicker", { defaultValue: "Get it on" })}
          </span>
          <span className="home-store-main">
            {t("hero.cta.googlePlay", { defaultValue: "Google Play" })}
          </span>
        </span>
      </a>

      <a
        className="home-store home-store-ios"
        href={appStoreUrl || "#"}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!appStoreUrl}
        onClick={(e) => !appStoreUrl && e.preventDefault()}
      >
        <span className="home-store-ico" aria-hidden="true">
          <AppleIcon />
        </span>
        <span className="home-store-txt">
          <span className="home-store-kicker">
            {t("homeNew.store.apple.kicker", { defaultValue: "Download on the" })}
          </span>
          <span className="home-store-main">
            {t("hero.cta.appStore", { defaultValue: "App Store (soon)" })}
          </span>
        </span>
      </a>
    </div>
  );
}

function BigFeature({ title, text, glyph, tone = "glass" }) {
  return (
    <div className={`home-big card ${tone === "light" ? "card-light" : ""}`}>
      <div className="home-big-head">
        <div className="home-glyph" aria-hidden="true">
          {glyph}
        </div>
        <h3 className="home-h3">{title}</h3>
      </div>
      <p className="muted home-p">{text}</p>
    </div>
  );
}

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

/** Lightweight phone mock (no external image required).
 * Replace the inner gradient with an <img> if/when you have screenshots.
 */
function PhoneMock({ label = "Screen", variant = "a" }) {
  return (
    <div className="home-phone">
      <div className={`home-phone-screen home-phone-${variant}`} aria-hidden="true" />
      <div className="home-phone-label muted">{label}</div>
    </div>
  );
}

function AppScreens({ t }) {
  return (
    <section className="home-section">
      <Reveal y={16}>
        <h2 className="home-h2">
          {t("homeNew.sections.screens.title", { defaultValue: "A quick look inside" })}
        </h2>
        <p className="muted home-p home-lead">
          {t("homeNew.sections.screens.subtitle", {
            defaultValue:
              "Drop in real screenshots later; the layout already supports a small “product strip” for mobile-first credibility.",
          })}
        </p>
      </Reveal>

      <div className="home-phones">
        <Reveal y={20} delay={0.02}>
          <PhoneMock
            label={t("homeNew.sections.screens.s1", { defaultValue: "Home • due tasks" })}
            variant="a"
          />
        </Reveal>
        <Reveal y={20} delay={0.05}>
          <PhoneMock
            label={t("homeNew.sections.screens.s2", { defaultValue: "Plant • details" })}
            variant="b"
          />
        </Reveal>
        <Reveal y={20} delay={0.08}>
          <PhoneMock
            label={t("homeNew.sections.screens.s3", { defaultValue: "Readings • trends" })}
            variant="c"
          />
        </Reveal>
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useTranslation("home");

  const heroTitle = t("homeNew.hero.title", { defaultValue: "Flovers" });
  const heroSubtitle = t("homeNew.hero.subtitle", {
    defaultValue:
      "A plant-care system built around reminders → tasks → history, with optional QR shortcuts and IoT readings.",
  });

  const purpose = t("homeNew.hero.purpose", {
    defaultValue:
      "Track what you did and when, automate routines, and keep plant context (location, exposure, pot, soil) in one place — so decisions make more sense over time.",
  });

  const features = [
    {
      glyph: "✅",
      title: t("homeNew.features.tasks.title", { defaultValue: "Tasks from reminders" }),
      text: t("homeNew.features.tasks.text", {
        defaultValue:
          "Define a reminder once (type + interval). Flovers generates actionable tasks, and you close them with optional notes.",
      }),
      tone: "light",
    },
    {
      glyph: "📚",
      title: t("homeNew.features.history.title", { defaultValue: "History you can trust" }),
      text: t("homeNew.features.history.text", {
        defaultValue:
          "Closed tasks live in Task History. Expand notes, edit the linked reminder, jump to the plant, or delete entries when needed.",
      }),
      tone: "glass",
    },
    {
      glyph: "🌿",
      title: t("homeNew.features.plants.title", { defaultValue: "Plants & locations" }),
      text: t("homeNew.features.plants.text", {
        defaultValue:
          "Create plant instances, assign locations, and use location-based sort/filter across tasks, plants, reminders, and readings.",
      }),
      tone: "glass",
    },
    {
      glyph: "📷",
      title: t("homeNew.features.qr.title", { defaultValue: "QR quick access" }),
      text: t("homeNew.features.qr.text", {
        defaultValue:
          "Generate a QR per plant, save/email it, print it, and attach to a pot. Scan to open Plant Details instantly (camera permission required).",
      }),
      tone: "light",
    },
    {
      glyph: "📡",
      title: t("homeNew.features.iot.title", { defaultValue: "IoT readings & alerts" }),
      text: t("homeNew.features.iot.text", {
        defaultValue:
          "Link your own Arduino/ESP devices. Show latest readings in tiles and open Readings History for day/week/month charts.",
      }),
      tone: "glass",
    },
    {
      glyph: "🔔",
      title: t("homeNew.features.notify.title", { defaultValue: "Notifications under your control" }),
      text: t("homeNew.features.notify.text", {
        defaultValue:
          "Choose consent for email/push, set daily summary time, and enable follow-up reminders for outstanding tasks.",
      }),
      tone: "light",
    },
  ];

  const steps = [
    {
      title: t("homeNew.steps.s1.title", { defaultValue: "Create a plant" }),
      text: t("homeNew.steps.s1.text", {
        defaultValue:
          "Use the 9-step wizard: optional plant definition search/recognition, location, exposure hints, and your own notes.",
      }),
    },
    {
      title: t("homeNew.steps.s2.title", { defaultValue: "Set reminders" }),
      text: t("homeNew.steps.s2.text", {
        defaultValue:
          "Pick task type and interval. Reminders are the source of truth that creates future tasks automatically.",
      }),
    },
    {
      title: t("homeNew.steps.s3.title", { defaultValue: "Work tasks on Home" }),
      text: t("homeNew.steps.s3.text", {
        defaultValue:
          "Home lists due tasks. Use quick shortcuts (Show overdue / Show due today) and bulk-close visible tasks when needed.",
      }),
    },
    {
      title: t("homeNew.steps.s4.title", { defaultValue: "Optional: link IoT device" }),
      text: t("homeNew.steps.s4.text", {
        defaultValue:
          "Create a device key, post readings with device ID + secret key, then review trends in Readings History.",
      }),
    },
  ];

  return (
    <div className="stack home-wrap">
      {/* JUMBOTRON HERO */}
      <section className="home-hero card">
        <div className="home-hero-bg" aria-hidden="true" />
        <div className="home-hero-inner">
          <Reveal className="home-hero-left" y={14}>
            <Badge>{t("homeNew.hero.badge", { defaultValue: "Plant care • Tasks • History • IoT" })}</Badge>

            <h1 className="home-hero-title">{heroTitle}</h1>
            <p className="home-hero-sub muted">{heroSubtitle}</p>
            <p className="home-hero-purpose">{purpose}</p>

            <StoreButtons t={t} />

            <div className="home-hero-meta muted">
              <span>{t("homeNew.hero.meta.android", { defaultValue: "Android available" })}</span>
              <span className="home-dot">•</span>
              <span>{t("homeNew.hero.meta.ios", { defaultValue: "iOS slot reserved" })}</span>
              <span className="home-dot">•</span>
              <span>{t("homeNew.hero.meta.docs", { defaultValue: "Docs, privacy & support on web" })}</span>
            </div>
          </Reveal>

          <Reveal className="home-hero-right" delay={0.06} y={14}>
            <div className="home-hero-panel">
              <div className="home-hero-panel-title">
                {t("homeNew.hero.panelTitle", { defaultValue: "What Flovers helps you do" })}
              </div>

              <div className="home-hero-bullets">
                <div className="home-bullet">
                  <span className="home-bullet-dot" />
                  <span>
                    {t("homeNew.hero.b1", {
                      defaultValue: "Turn routines into tasks you can finish.",
                    })}
                  </span>
                </div>
                <div className="home-bullet">
                  <span className="home-bullet-dot" />
                  <span>
                    {t("homeNew.hero.b2", {
                      defaultValue: "Keep plant context: location, exposure, pot, soil.",
                    })}
                  </span>
                </div>
                <div className="home-bullet">
                  <span className="home-bullet-dot" />
                  <span>
                    {t("homeNew.hero.b3", {
                      defaultValue: "Build history with notes you can revisit.",
                    })}
                  </span>
                </div>
                <div className="home-bullet">
                  <span className="home-bullet-dot" />
                  <span>
                    {t("homeNew.hero.b4", {
                      defaultValue: "Optional sensors: observe trends, not guesses.",
                    })}
                  </span>
                </div>
              </div>

              {/* Sticks to bottom of panel */}
              <div className="home-stats">
                <Stat
                  value={t("homeNew.hero.stat1.value", { defaultValue: "Tasks" })}
                  label={t("homeNew.hero.stat1.label", { defaultValue: "generated from reminders" })}
                />
                <Stat
                  value={t("homeNew.hero.stat2.value", { defaultValue: "QR" })}
                  label={t("homeNew.hero.stat2.label", { defaultValue: "instant plant access" })}
                />
                <Stat
                  value={t("homeNew.hero.stat3.value", { defaultValue: "IoT" })}
                  label={t("homeNew.hero.stat3.label", { defaultValue: "day/week/month charts" })}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Screens strip (phone mockups) */}
      <AppScreens t={t} />

      {/* BIG FEATURE TILES (2 columns × 3 rows) */}
      <section className="home-section">
        <Reveal y={16}>
          <h2 className="home-h2">
            {t("homeNew.sections.features.title", { defaultValue: "Everything you need, in one flow" })}
          </h2>
          <p className="muted home-p home-lead">
            {t("homeNew.sections.features.subtitle", {
              defaultValue:
                "A focused model: reminders create tasks, tasks become history, and plants keep the context. QR and IoT are optional accelerators.",
            })}
          </p>
        </Reveal>

        <div className="home-grid-2">
          {features.map((f, idx) => (
            <Reveal key={f.title} delay={0.03 * (idx % 2)} y={20}>
              <BigFeature title={f.title} text={f.text} glyph={f.glyph} tone={f.tone} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS (single column, 4 rows, bigger cards) */}
      <section className="home-section">
        <Reveal y={16}>
          <h2 className="home-h2">{t("homeNew.sections.how.title", { defaultValue: "How it works" })}</h2>
          <p className="muted home-p home-lead">
            {t("homeNew.sections.how.subtitle", {
              defaultValue:
                "A repeatable loop you can maintain: define → generate → complete → review. Add sensors only if you want measurement and trends.",
            })}
          </p>
        </Reveal>

        <div className="home-steps-grid">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={0.05 * i} y={22}>
              <StepCard idx={String(i + 1).padStart(2, "0")} title={s.title} text={s.text} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA JUMBOTRON */}
      <section className="home-cta card">
        <div className="home-cta-bg" aria-hidden="true" />
        <Reveal y={16}>
          <h2 className="home-cta-title">
            {t("homeNew.cta.title", { defaultValue: "Start with one plant. Make the routine stick." })}
          </h2>
          <p className="muted home-p home-cta-sub">
            {t("homeNew.cta.subtitle", {
              defaultValue:
                "Create a plant, enable reminders, and let Flovers generate tasks automatically. Review history any time and adjust with confidence.",
            })}
          </p>
          <StoreButtons t={t} />
          <div className="home-cta-foot muted">
            {t("homeNew.cta.foot", { defaultValue: "More detail is available in Documentation on this website." })}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
