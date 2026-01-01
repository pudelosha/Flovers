import React, { createContext, useContext, useState, useEffect } from "react";
import i18n from "../../i18n"; // Import i18n directly
import { LANGS, changeLanguage } from "../../i18n";

interface LanguageContextType {
  currentLanguage: string;
  availableLanguages: readonly string[];
  changeLanguage: (lang: string) => Promise<boolean>;
  isReady: boolean; // Add readiness flag
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if i18n is already initialized
    if (i18n.isInitialized) {
      setIsReady(true);
      setCurrentLanguage(i18n.language);
    } else {
      // Wait for initialization
      i18n.on("initialized", () => {
        setIsReady(true);
        setCurrentLanguage(i18n.language);
      });
    }

    const handleLanguageChanged = (lng: string) => {
      setCurrentLanguage(lng);
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
      i18n.off("initialized");
    };
  }, []);

  const handleChangeLanguage = async (lang: string) => {
    const success = await changeLanguage(lang);
    if (success) {
      setCurrentLanguage(lang);
    }
    return success;
  };

  // Optional: Show loading while i18n initializes
  if (!isReady) {
    return null; // or a loading indicator
  }

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        availableLanguages: LANGS,
        changeLanguage: handleChangeLanguage,
        isReady,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};