import React, { createContext, useContext, useState, useEffect } from "react";
import i18n from "../../i18n"; // Import i18n directly
import { LANGS } from "../../i18n";

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

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const onInitialized = () => {
      setIsReady(true);
      setCurrentLanguage(i18n.language);
    };

    if (i18n.isInitialized) {
      onInitialized();
    } else {
      i18n.on("initialized", onInitialized);
    }

    const handleLanguageChanged = (lng: string) => {
      setCurrentLanguage(lng);
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
      i18n.off("initialized", onInitialized as any);
    };
  }, []);

  const handleChangeLanguage = async (lang: string) => {
    try {
      // This is what actually triggers react-i18next updates
      await i18n.changeLanguage(lang);

      // Ensure state matches the final i18n language (including fallbacks)
      setCurrentLanguage(i18n.language);

      // If i18n accepted a fallback (e.g. "pl-PL" -> "pl"), still treat as success
      return i18n.language === lang || i18n.language?.split("-")?.[0] === lang;
    } catch (e) {
      console.warn("LanguageProvider: i18n.changeLanguage failed", e);
      return false;
    }
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
