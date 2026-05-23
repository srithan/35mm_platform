import type { Metadata } from "next";
import {
  Playfair_Display,
  DM_Serif_Display,
  DM_Sans,
  DM_Mono,
} from "next/font/google";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { OfflineStatus } from "@/components/OfflineStatus/OfflineStatus";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { Providers } from "./providers";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-display-discover",
  display: "swap",
  weight: ["400"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["300", "400"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://35mm.in"),
  title: {
    default: "35mm.in — For Filmmakers",
    template: "%s — 35mm.in",
  },
  description:
    "A social network for filmmakers. Share what you watch, log films, write reviews, discover festivals, and connect with cinema lovers.",
  icons: {
    icon: [
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon/favicon.ico",
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  openGraph: {
    siteName: "35mm.in",
    type: "website",
    locale: "en_US",
    title: "35mm.in — For Filmmakers",
    description:
      "A social network for filmmakers. Share what you watch, log films, write reviews, discover festivals, and connect with cinema lovers.",
  },
  twitter: {
    card: "summary_large_image",
    site: "@35mmin",
    title: "35mm.in — For Filmmakers",
    description:
      "A social network for filmmakers. Share what you watch, log films, write reviews, discover festivals, and connect with cinema lovers.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSerifDisplay.variable} ${dmSans.variable} ${dmMono.variable} overflow-x-hidden overflow-y-scroll bg-bg`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-title" content="35mm" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </head>
      <body className="font-sans bg-[var(--color-bg)] text-[var(--color-text)] min-h-screen antialiased">
        <Providers>
          <NuqsAdapter>
            <ServiceWorkerRegistration />
            <OfflineStatus />
            {children}
            <Analytics />
            <SpeedInsights />
          </NuqsAdapter>
        </Providers>
      </body>
    </html>
  );
}
