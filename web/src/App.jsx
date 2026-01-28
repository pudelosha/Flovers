import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";

import Home from "./routes/Home.jsx";
import Terms from "./routes/Terms.jsx";
import PrivacyPolicy from "./routes/PrivacyPolicy.jsx";
import Contact from "./routes/Contact.jsx";
import Faq from "./routes/Faq.jsx";
import Docs from "./routes/Docs.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
