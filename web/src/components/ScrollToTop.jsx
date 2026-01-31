import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function hardScrollToTop() {
  const top = document.getElementById("page-top");

  // Two frames makes this resilient to layout/paint timing during route transitions
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (top && typeof top.scrollIntoView === "function") {
        top.scrollIntoView({ block: "start", behavior: "auto" });
        // Optional: move focus without visible jump (helps a11y and some browsers)
        if (typeof top.focus === "function") top.focus({ preventScroll: true });
      } else {
        // Fallback
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    });
  });
}

export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    hardScrollToTop();
  }, [location.pathname, location.key]);

  return null;
}
