import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WorkWith — team working styles",
  description:
    "An internal tool for mapping how we each work, so friction is understood rather than guessed at.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="studio-light"
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved theme before paint. Migrate old theme ids
            (daylight / midnight / graphite / teal / ember) onto the new set. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var v=['studio-light','studio-dark','signal-light','signal-dark'];var m={daylight:'studio-light',midnight:'studio-dark',graphite:'signal-dark',teal:'studio-dark',ember:'studio-dark'};var t=localStorage.getItem('workwith-theme');t=v.indexOf(t)>-1?t:(m[t]||'studio-light');document.documentElement.setAttribute('data-theme',t);localStorage.setItem('workwith-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
