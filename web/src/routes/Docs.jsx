import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const DOC_SCREENS = [
  { key: "overview" },
  { key: "auth" },
  { key: "home" },
  { key: "taskHistory" },
  { key: "plants" },
  { key: "plantDetails" },
  { key: "createPlantWizard" },
  { key: "locations" },
  { key: "reminders" },
  { key: "readings" },
  { key: "readingsHistory" },
  { key: "scanner" },
  { key: "profile" },
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

export default function Docs() {
  const { t } = useTranslation("docs");

  const [activeKey, setActiveKey] = useState("overview");

  // Mobile "lang-like" dropdown state
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const active = useMemo(() => {
    const found = DOC_SCREENS.find((x) => x.key === activeKey) || DOC_SCREENS[0];
    return found;
  }, [activeKey]);

  const activeTitle = t(`screens.${active.key}.title`);

  useEffect(() => {
    const el = document.scrollingElement || document.documentElement;
    el.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeKey]);

  // close on outside click / escape
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

        {/* NOTE: keep the list itself as a nav; don't add h2 class here */}
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
        {/* Mobile selector (language-dropdown style) */}
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
                  className={
                    "docs-item" + (item.key === activeKey ? " active" : "")
                  }
                  onClick={() => pick(item.key)}
                >
                  {t(`screens.${item.key}.title`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <article className="card prose docs-card">
          {/* MATCH OTHER PAGES */}
          <h1 className="h1 h1-auth">{activeTitle}</h1>

          {/* Placeholder body for now (you'll move content to docs_<key>.json later) */}
          <DocSection heading={t("placeholder.heading")} body={[t("placeholder.body")]} />
        </article>
      </main>
    </div>
  );
}
