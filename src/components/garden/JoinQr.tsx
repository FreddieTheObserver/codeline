"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { cx } from "../ui";

// `size` is a pixel number or any CSS length, such as a clamp() that grows with a projector screen.
export function JoinQr({
  code,
  size = 220,
  caption = true,
  captionClassName = "text-sm",
}: {
  code: string;
  size?: number | string;
  caption?: boolean;
  captionClassName?: string;
}) {
  const [qr, setQr] = useState<{ src: string; url: string } | null>(null);
  useEffect(() => {
    // A set public address wins over whichever host happened to open this page, so every QR code points at the same site.
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || window.location.origin;
    const target = `${origin}/join/${code}`;
    // SVG stays sharp at any size, from a course card to a wall-sized projector.
    QRCode.toString(target, { type: "svg", margin: 1, color: { dark: "#3b2a1e", light: "#fbf3df" } })
      .then((svg) => setQr({ src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, url: target }))
      .catch(() => setQr(null));
  }, [code]);
  const box = { width: size, height: size };
  return (
    <figure className="flex flex-col items-center gap-2">
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, not a remote image
        <img src={qr.src} alt={`QR code to join with code ${code}`} style={{ ...box, boxShadow: "0 0 0 4px #3b2a1e" }} />
      ) : (
        <div style={box} />
      )}
      {caption && <figcaption className={cx("text-center break-all", captionClassName)}>{qr?.url.replace(/^https?:\/\//, "")}</figcaption>}
    </figure>
  );
}
