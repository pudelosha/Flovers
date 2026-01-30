import React from "react";
import HeroSection from "./components/HeroSection";
import AppScreens from "./components/AppScreens";
import CoreFeatures from "./components/CoreFeatures";
import FeatureGrid from "./components/FeatureGrid";
import QRFlowSection from "./components/QRFlowSection";
import HowItWorks from "./components/HowItWorks";
import CTASection from "./components/CTASection";
import "./styles.css";

export default function Home() {
  return (
    <div className="stack home-wrap">
      <HeroSection />

      {/* Screens strip <AppScreens /> */}

      <CoreFeatures />

      <FeatureGrid />

      <QRFlowSection />

      <HowItWorks />

      <CTASection />
    </div>
  );
}
