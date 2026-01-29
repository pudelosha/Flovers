import React from "react";
import { useTranslation } from "react-i18next";
import HeroSection from "./components/HeroSection";
import AppScreens from "./components/AppScreens";
import CoreFeatures from "./components/CoreFeatures";
import FeatureGrid from "./components/FeatureGrid";
import QRFlowSection from "./components/QRFlowSection";
import HowItWorks from "./components/HowItWorks";
import CTASection from "./components/CTASection";
import "./styles.css";

export default function Home() {
  const { t } = useTranslation("home");

  return (
    <div className="stack home-wrap">
      {/* JUMBOTRON HERO */}
      <HeroSection />
      
      {/* Screens strip */}
      <AppScreens />
      
      {/* New: dedicated emphasis rows (recognition + definition/intervals) */}
      <CoreFeatures />
      
      {/* Feature tiles */}
      <FeatureGrid />
      
      {/* Dedicated QR section */}
      <QRFlowSection />
      
      {/* How it works */}
      <HowItWorks />
      
      {/* CTA JUMBOTRON — rebuilt */}
      <CTASection />
    </div>
  );
}