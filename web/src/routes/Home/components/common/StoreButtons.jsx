import React from "react";
import { GooglePlayIcon, AppleIcon } from "./Icons";

export default function StoreButtons({ t }) {
  const googlePlayUrl = t("hero.cta.googlePlayUrl", { defaultValue: "" });
  const appStoreUrl = t("hero.cta.appStoreUrl", { defaultValue: "" });

  return (
    <div className="home-store-row">
      <a
        className="home-store home-store-gp"
        href={googlePlayUrl || "#"}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!googlePlayUrl}
        onClick={(e) => !googlePlayUrl && e.preventDefault()}
      >
        <span className="home-store-ico" aria-hidden="true">
          <GooglePlayIcon />
        </span>
        <span className="home-store-txt">
          <span className="home-store-kicker">
            {t("homeNew.store.google.kicker", { defaultValue: "Get it on" })}
          </span>
          <span className="home-store-main">
            {t("hero.cta.googlePlay", { defaultValue: "Google Play" })}
          </span>
        </span>
      </a>

      <a
        className="home-store home-store-ios"
        href={appStoreUrl || "#"}
        target="_blank"
        rel="noreferrer"
        aria-disabled={!appStoreUrl}
        onClick={(e) => !appStoreUrl && e.preventDefault()}
      >
        <span className="home-store-ico" aria-hidden="true">
          <AppleIcon />
        </span>
        <span className="home-store-txt">
          <span className="home-store-kicker">
            {t("homeNew.store.apple.kicker", { defaultValue: "Download on the" })}
          </span>
          <span className="home-store-main">
            {t("hero.cta.appStore", { defaultValue: "App Store (soon)" })}
          </span>
        </span>
      </a>
    </div>
  );
}