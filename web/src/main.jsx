import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/app.css";
import "./i18n";
import ScrollToTop from "./components/ScrollToTop.jsx";

const BASENAME = "/Flovers";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={BASENAME}>
      <ScrollToTop />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
