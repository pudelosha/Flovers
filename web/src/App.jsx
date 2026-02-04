import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";

import Home from "./routes/Home/index.jsx";
import Terms from "./routes/Terms.jsx";
import PrivacyPolicy from "./routes/PrivacyPolicy.jsx";
import Contact from "./routes/Contact.jsx";
import Faq from "./routes/Faq.jsx";
import Docs from "./routes/Docs.jsx";
import Schemas from "./routes/Schemas.jsx";

export const SUPPORTED_LANGS = ["en", "pl"];
export const DEFAULT_LANG = "en";

export default function App() {
  return (
    <Routes>
      <Route path="/:lang" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<Faq />} />
        <Route path="docs" element={<Docs />} />
        <Route path="schemas" element={<Schemas />} />
      </Route>

      <Route path="/" element={<Navigate to={`/${DEFAULT_LANG}`} replace />} />
      <Route path="*" element={<Navigate to={`/${DEFAULT_LANG}`} replace />} />
    </Routes>
  );
}
