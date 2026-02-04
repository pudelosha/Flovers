import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "../assets/logo.png";

const SUPPORTED_LANGS = ["pl", "en"];
const DEFAULT_LANG = "en";

function NavItem({ to, label, end = false, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
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
  const navigate = useNavigate();
  const params = useParams();

  // URL language (source of truth)
  const langFromUrl = params.lang;

  // Mobile burger menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const burgerBtnRef = useRef(null);

  // Language dropdown (custom)
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  // Ensure URL has a valid lang, and keep i18n in sync with URL
  useEffect(() => {
    const isValid = langFromUrl && SUPPORTED_LANGS.includes(langFromUrl);

    if (!isValid) {
      // Preserve the rest of the path when redirecting:
      // current path looks like "/<lang>/something"
      // If missing/invalid, remove first segment and re-add default lang
      const parts = location.pathname.split("/").filter(Boolean); // ["xx","docs"]
      const rest = parts.length > 0 ? parts.slice(1).join("/") : "";
      const target = `/${DEFAULT_LANG}${rest ? `/${rest}` : ""}`;

      navigate(target, { replace: true });
      return;
    }

    if (i18n.language !== langFromUrl) {
      i18n.changeLanguage(langFromUrl);
    }
  }, [langFromUrl, location.pathname, navigate, i18n]);

  // Use URL lang (after redirect it will be valid)
  const currentLang = SUPPORTED_LANGS.includes(langFromUrl)
    ? langFromUrl
    : DEFAULT_LANG;

  const navItems = useMemo(
    () => [
      // IMPORTANT: no trailing slash here; `end: true` makes it only active on "/{lang}"
      { to: `/${currentLang}`, label: t("nav.start"), end: true },
      { to: `/${currentLang}/docs`, label: t("nav.docs") },
      { to: `/${currentLang}/schemas`, label: t("nav.schemas") },
      { to: `/${currentLang}/faq`, label: t("nav.faq") },
    ],
    [t, currentLang]
  );

  const languages = useMemo(
    () => [
      { code: "pl", label: t("language.pl") },
      { code: "en", label: t("language.en") },
    ],
    [t]
  );

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
      if (menuOpen) {
        const menuEl = menuRef.current;
        const btnEl = burgerBtnRef.current;
        if (
          menuEl &&
          btnEl &&
          !menuEl.contains(e.target) &&
          !btnEl.contains(e.target)
        ) {
          setMenuOpen(false);
        }
      }

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

  // When user selects a language: keep same page, swap lang segment
  const switchLanguage = (newLang) => {
    if (!SUPPORTED_LANGS.includes(newLang)) return;

    const parts = location.pathname.split("/").filter(Boolean); // ["en","docs",...]
    const rest = parts.length > 0 ? parts.slice(1).join("/") : "";
    const target = `/${newLang}${rest ? `/${rest}` : ""}`;

    navigate(target);
    setLangOpen(false);
  };

  return (
    <div className="app">
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
              <NavItem key={x.to} to={x.to} label={x.label} end={x.end} />
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

              <div
                className={"lang-panel" + (langOpen ? " open" : "")}
                role="menu"
              >
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={
                      "lang-item" + (l.code === currentLang ? " active" : "")
                    }
                    onClick={() => switchLanguage(l.code)}
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
                end={x.end}
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
            <NavLink className="footer-link" to={`/${currentLang}/terms`}>
              {t("footer.terms")}
            </NavLink>
            <NavLink className="footer-link" to={`/${currentLang}/privacy-policy`}>
              {t("footer.privacy")}
            </NavLink>
            <NavLink className="footer-link" to={`/${currentLang}/contact`}>
              {t("footer.contact")}
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
