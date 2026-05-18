import { useEffect } from "react";
import { useLocation } from "react-router-dom";

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

export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    hardScrollToTop();
  }, [location.pathname, location.key]);

  return null;
}
