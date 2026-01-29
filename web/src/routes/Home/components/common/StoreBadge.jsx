import React from "react";
import QRCode from "react-qr-code";
import { GooglePlayIcon, AppleIcon } from "./Icons";

export default function StoreBadge({ platform, kicker, main, url, disabledText }) {
  const disabled = !url;

  return (
    <div className={`storepack ${disabled ? "is-disabled" : ""}`}>
      <a
        className={`storebadge storebadge-${platform}`}
        href={url || "#"}
        target="_blank"
        rel="noreferrer"
        aria-disabled={disabled}
        onClick={(e) => disabled && e.preventDefault()}
      >
        <span className="storebadge-ico" aria-hidden="true">
          {platform === "gp" ? <GooglePlayIcon /> : <AppleIcon />}
        </span>

        <span className="storebadge-txt">
          <span className="storebadge-kicker">{kicker}</span>
          <span className="storebadge-main">{main}</span>
          {disabledText ? <span className="storebadge-sub">{disabledText}</span> : null}
        </span>
      </a>

      {/* QR (desktop) */}
      <div className="storeqr" aria-hidden={disabled ? "true" : "false"}>
        {url ? (
          <div className="storeqr-inner" title="Scan to open store link">
            <QRCode value={url} size={72} />
          </div>
        ) : (
          <div className="storeqr-empty">QR</div>
        )}
      </div>
    </div>
  );
}