// C:\Projekty\Python\Flovers\mobile\src\app\providers\LanguageProvider.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage, LANGS } from "../../i18n";

interface LanguageContextType {
  currentLanguage: string;
  availableLanguages: readonly string[];
  changeLanguage: (lang: string) => Promise<boolean>;
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
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setCurrentLanguage(lng);
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  const handleChangeLanguage = async (lang: string) => {
    const success = await changeLanguage(lang);
    if (success) {
      setCurrentLanguage(lang);
    }
    return success;
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        availableLanguages: LANGS,
        changeLanguage: handleChangeLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
