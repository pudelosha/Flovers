import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "../assets/logo.png";


function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
    >
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { t, i18n } = useTranslation("common");
  const location = useLocation();

  // Mobile burger menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const burgerBtnRef = useRef(null);

  // Language dropdown (custom)
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const navItems = useMemo(
    () => [
      { to: "/", label: t("nav.start") },
      { to: "/docs", label: t("nav.docs") },
      { to: "/schemas", label: t("nav.schemas") },
      { to: "/faq", label: t("nav.faq") }
    ],
    [t]
  );

  // Supported languages (extend later)
  const languages = useMemo(
    () => [
      { code: "pl", label: t("language.pl") },
      { code: "en", label: t("language.en") }
    ],
    [t]
  );

  const currentLang = i18n.language?.startsWith("pl") ? "pl" : "en";
  const currentLangLabel =
    languages.find((x) => x.code === currentLang)?.label ??
    currentLang.toUpperCase();

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setLangOpen(false);
  }, [location.pathname]);

  // Close on outside click + ESC
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setLangOpen(false);
      }
    }

    function onClickOutside(e) {
      // burger menu outside
      if (menuOpen) {
        const menuEl = menuRef.current;
        const btnEl = burgerBtnRef.current;
        if (menuEl && btnEl && !menuEl.contains(e.target) && !btnEl.contains(e.target)) {
          setMenuOpen(false);
        }
      }

      // language dropdown outside
      if (langOpen) {
        const langEl = langRef.current;
        if (langEl && !langEl.contains(e.target)) {
          setLangOpen(false);
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [menuOpen, langOpen]);

  return (
    <div className="app">
      {/* Top anchor for hard scroll-to-top */}
      <div id="page-top" tabIndex={-1} aria-hidden="true" />

      <header className="topbar">
        <div className="container topbar-inner">
          <div className="brand">
            <img className="brand-icon" src={logo} alt="" aria-hidden="true" />
            <span className="brand-name">Flovers</span>
          </div>

          {/* Desktop nav */}
          <nav className="nav nav-desktop" aria-label={t("a11y.mainNav")}>
            {navItems.map((x) => (
              <NavItem key={x.to} to={x.to} label={x.label} />
            ))}
          </nav>

          <div className="topbar-actions">
            {/* Custom language dropdown */}
            <div className="lang-menu" ref={langRef}>
              <button
                type="button"
                className={"lang-trigger" + (langOpen ? " active" : "")}
                aria-label={t("a11y.languageSwitch")}
                aria-haspopup="menu"
                aria-expanded={langOpen ? "true" : "false"}
                onClick={() => setLangOpen((v) => !v)}
              >
                <span className="lang-trigger-text">{currentLangLabel}</span>
                <span className="lang-caret" aria-hidden="true" />
              </button>

              <div className={"lang-panel" + (langOpen ? " open" : "")} role="menu">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={"lang-item" + (l.code === currentLang ? " active" : "")}
                    onClick={() => {
                      i18n.changeLanguage(l.code);
                      setLangOpen(false);
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Burger button (mobile) */}
            <button
              ref={burgerBtnRef}
              type="button"
              className={"burger-btn" + (menuOpen ? " active" : "")}
              aria-label={t("a11y.openMenu")}
              aria-expanded={menuOpen ? "true" : "false"}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="burger-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <div
          id="mobile-menu"
          ref={menuRef}
          className={"mobile-menu" + (menuOpen ? " open" : "")}
          role="menu"
          aria-label={t("a11y.mobileMenu")}
        >
          <div className="container mobile-menu-inner">
            {navItems.map((x) => (
              <NavItem
                key={x.to}
                to={x.to}
                label={x.label}
                onClick={() => setMenuOpen(false)}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-left">© {new Date().getFullYear()} Flovers</div>

          <div className="footer-right">
            <NavLink className="footer-link" to="/terms">
              {t("footer.terms")}
            </NavLink>
            <NavLink className="footer-link" to="/privacy-policy">
              {t("footer.privacy")}
            </NavLink>
            <NavLink className="footer-link" to="/contact">
              {t("footer.contact")}
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
