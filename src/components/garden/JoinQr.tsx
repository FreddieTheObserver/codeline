"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function JoinQr({ code, size = 220, caption = true }: { code: string; size?: number; caption?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    // A set public address wins over whichever host happened to open this page, so every QR code points at the same site.
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || window.location.origin;
    const target = `${origin}/join/${code}`;
    QRCode.toDataURL(target, { margin: 1, width: size * 2, color: { dark: "#3b2a1e", light: "#fbf3df" } })
      .then((dataUrl) => {
        setSrc(dataUrl);
        setUrl(target);
      })
      .catch(() => setSrc(null));
  }, [code, size]);
  return (
    <figure className="flex flex-col items-center gap-2">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, not a remote image
        <img src={src} width={size} height={size} alt={`QR code to join with code ${code}`} className="pixelated" style={{ boxShadow: "0 0 0 4px #3b2a1e" }} />
      ) : (
        <div style={{ width: size, height: size }} />
      )}
      {caption && <figcaption className="text-center text-sm break-all">{url.replace(/^https?:\/\//, "")}</figcaption>}
    </figure>
  );
}
