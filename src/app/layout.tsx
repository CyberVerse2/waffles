import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Nunito, Fredoka, Baloo_2 } from "next/font/google";
import "./styles.css";

// Body text: rounded, friendly, highly readable. Variable axis covers the
// 400–900 weights the UI leans on.
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

// Display: chunky, rounded, game-y headings (level numbers, CTAs, title,
// waffle tiles). Variable axis tops out at 700, which is our bold display.
const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
});

// Hero: heavier, punchier display for the big celebratory "moment" beats
// (countdown, final rank, LEVEL UP!, OUT OF HEARTS, level intro). Baloo 2
// reaches weight 800 — heavier than Fredoka's 700 cap — while staying in the
// same rounded family, so the type system feels cohesive, just louder.
const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Waffles v2",
  description: "Waffles v2 interactive prototype.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${fredoka.variable} ${baloo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
