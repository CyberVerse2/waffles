import type { Metadata } from "next";
import {
  Nunito,
  Archivo_Black,
  Funnel_Display,
  Funnel_Sans,
} from "next/font/google";
import { Providers } from "./providers";
import "./styles.css";

// Legacy fonts — still in use by non-onboarding screens during the redesign rollout.
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-body-legacy",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display-legacy",
  display: "swap",
});

// Canonical brand fonts per .impeccable.md.
// Funnel Display + Funnel Sans (Brian Beaufrere, open-source, variable).
// Organic curves and personality without being precious.
const funnelDisplay = Funnel_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const funnelSans = Funnel_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Waffles",
  description: "Real-time trivia in World App.",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${funnelDisplay.variable} ${funnelSans.variable} ${nunito.variable} ${archivoBlack.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
