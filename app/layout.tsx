import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "meetmint.app";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const origin = new URL(`${protocol}://${host}`);
  const title = "Meetmint — find a time, skip the circus";
  const description =
    "A tiny group scheduler with no accounts, no ads, and no email gate.";

  return {
    metadataBase: origin,
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: new URL("/og.png", origin),
          width: 1200,
          height: 630,
          alt: "Meetmint — Find a time. Skip the circus.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/og.png", origin)],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${fraunces.variable}`}>
        {children}
      </body>
    </html>
  );
}
