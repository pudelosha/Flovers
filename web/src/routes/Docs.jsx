import React, { useEffect, useMemo, useRef, useState } from "react";

const DOC_SCREENS = [
  { key: "overview", title: "Overview", sections: [{ heading: "What is Flovers?", body: ["..."] }] },
  { key: "auth", title: "Login & Register", sections: [{ heading: "Login", body: ["..."] }] },
  { key: "plants", title: "Plants", sections: [{ heading: "Plant list", body: ["..."] }] },
  { key: "reminders", title: "Reminders & Tasks", sections: [{ heading: "Reminders", body: ["..."] }] },
  { key: "recognition", title: "Plant recognition", sections: [{ heading: "How it works", body: ["..."] }] },
  { key: "iot", title: "IoT & sensors", sections: [{ heading: "Supported readings", body: ["..."] }] },
  { key: "qr", title: "QR codes", sections: [{ heading: "What QR codes do", body: ["..."] }] },
  { key: "profile", title: "Profile & Settings", sections: [{ heading: "Notifications", body: ["..."] }] },
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
  const [activeKey, setActiveKey] = useState("overview");

  // Mobile "lang-like" dropdown state
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const active = useMemo(
    () => DOC_SCREENS.find((x) => x.key === activeKey) || DOC_SCREENS[0],
    [activeKey]
  );

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
        {/* MATCH OTHER PAGES: use h2 sizing */}
        <div className="docs-nav-title h2">Documentation</div>

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
                {item.title}
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
              <span>{active.title}</span>
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
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        <article className="card prose docs-card">
          {/* MATCH OTHER PAGES: same title class */}
          <h1 className="h1 h1-auth">{active.title}</h1>

          {active.sections?.map((s, idx) => (
            <DocSection key={idx} heading={s.heading} body={s.body} />
          ))}
        </article>
      </main>
    </div>
  );
}
