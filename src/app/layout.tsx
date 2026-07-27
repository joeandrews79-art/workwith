import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" data-theme="daylight" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('workwith-theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
