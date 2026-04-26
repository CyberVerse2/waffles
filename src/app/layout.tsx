import type { Metadata } from "next";
import { Nunito, Archivo_Black } from "next/font/google";
import { Providers } from "./providers";
import "./styles.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-body",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Waffles",
  description: "Real-time trivia in World App.",
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${archivoBlack.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
