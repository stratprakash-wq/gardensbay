import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

export function QrHandoff({ url, count, selectedName }: { url: string; count: number; selectedName?: string }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let live = true;
    QRCode.toString(url, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0E3B2A", light: "#FFFFFF" },
    }).then((s) => live && setSvg(s));
    return () => {
      live = false;
    };
  }, [url]);

  const short = url.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  const lead = count
    ? `${count} ${count === 1 ? "place" : "places"} in your plan`
    : selectedName
      ? selectedName
      : "Open the map on your phone";

  return (
    <section className="qr" aria-label="Continue on your phone">
      <div className="qr__code" aria-label={`QR code linking to ${url}`} role="img">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={url}
            className="qr__svg"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </AnimatePresence>
      </div>
      <div className="qr__text">
        <span className="qr__eyebrow">
          <Icon name="phone" size={15} /> Continue on your phone
        </span>
        <strong className="qr__title">Scan to take your plan with you</strong>
        <motion.span key={lead} className="qr__lead" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          {lead}
        </motion.span>
        <span className="qr__url">{short}</span>
      </div>
    </section>
  );
}
