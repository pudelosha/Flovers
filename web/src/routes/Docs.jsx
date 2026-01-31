import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const DOC_SCREENS = [
  { key: "overview", ns: "docs_overview" },
  { key: "auth", ns: "docs_auth" },
  { key: "home", ns: "docs_home" },
  { key: "taskHistory", ns: "docs_task_history" },
  { key: "plants", ns: "docs_plants" },
  { key: "plantDetails", ns: "docs_plant_details" },
  { key: "createPlantWizard", ns: "docs_create_plant_wizard" },
  { key: "locations", ns: "docs_locations" },
  { key: "reminders", ns: "docs_reminders" },
  { key: "readings", ns: "docs_readings" },
  { key: "readingsHistory", ns: "docs_readings_history" },
  { key: "scanner", ns: "docs_scanner" },
  { key: "profile", ns: "docs_profile" },
];

function DocSection({ heading, body }) {
  return (
    <section className="doc-section">
      <h2 className="h2">{heading}</h2>
      {Array.isArray(body)
        ? body.map((p, i) => (
            <p key={i} className="muted">
              {p}
            </p>
          ))
        : null}
    </section>
  );
}

function hardScrollToTop() {
  const top = document.getElementById("page-top");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (top && typeof top.scrollIntoView === "function") {
        top.scrollIntoView({ block: "start", behavior: "auto" });
        if (typeof top.focus === "function") top.focus({ preventScroll: true });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    });
  });
}

export default function Docs() {
  // Menu translations live in docs.json
  const { t } = useTranslation("docs");

  const [activeKey, setActiveKey] = useState("overview");

  // Mobile dropdown state
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const active = useMemo(() => {
    return DOC_SCREENS.find((x) => x.key === activeKey) || DOC_SCREENS[0];
  }, [activeKey]);

  const docNs = active.ns;

  // IMPORTANT:
  // This returns a "t" that can translate from both "docs" (menu) and docNs (content).
  // But we will call tDoc with explicit namespace via { ns: docNs } to avoid ambiguity.
  const { t: tDoc } = useTranslation(["docs", docNs]);

  const activeTitle = t(`screens.${active.key}.title`);

  // Your JSON is wrapped like:
  // { "docs_overview": { "title": "...", "sections": [...] } }
  // so we must read "docs_overview.title" INSIDE the docs_overview namespace.
  const docTitle = tDoc(`${docNs}.title`, { ns: docNs, defaultValue: "" });
  const docSections = tDoc(`${docNs}.sections`, {
    ns: docNs,
    returnObjects: true,
    defaultValue: [],
  });

  const hasDocContent =
    typeof docTitle === "string" &&
    docTitle.trim().length > 0 &&
    Array.isArray(docSections) &&
    docSections.length > 0;

  // Scroll to top on docs subpage switch
  useEffect(() => {
    hardScrollToTop();
  }, [activeKey]);

  // Close dropdown on outside click / escape
  useEffect(() => {
    function onDown(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function pick(key) {
    setActiveKey(key);
    setOpen(false);
  }

  return (
    <div className="docs-layout">
      {/* Desktop/tablet sidebar */}
      <aside className="docs-nav" aria-label="Documentation navigation">
        <div className="docs-nav-title h2">{t("title")}</div>

        <nav className="docs-nav-list h2">
          {DOC_SCREENS.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <button
                key={item.key}
                type="button"
                className={"docs-nav-item" + (isActive ? " active" : "")}
                onClick={() => setActiveKey(item.key)}
              >
                {t(`screens.${item.key}.title`)}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="docs-content">
        {/* Mobile selector */}
        <div className="docs-mobile-picker" ref={menuRef}>
          <div className="label"></div>

          <div className="docs-menu">
            <button
              type="button"
              className={"docs-trigger" + (open ? " active" : "")}
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <span>{activeTitle}</span>
              <span className="lang-caret" aria-hidden="true" />
            </button>

            <div className={"docs-panel" + (open ? " open" : "")} role="menu">
              {DOC_SCREENS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  className={"docs-item" + (item.key === activeKey ? " active" : "")}
                  onClick={() => pick(item.key)}
                >
                  {t(`screens.${item.key}.title`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <article className="card prose docs-card">
          <h1 className="h1 h1-auth">{hasDocContent ? docTitle : activeTitle}</h1>

          {hasDocContent ? (
            docSections.map((s, idx) => (
              <DocSection key={idx} heading={s.heading} body={s.body} />
            ))
          ) : (
            <DocSection
              heading={t("placeholder.heading")}
              body={[t("placeholder.body")]}
            />
          )}
        </article>
      </main>
    </div>
  );
}
