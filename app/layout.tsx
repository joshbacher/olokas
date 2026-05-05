import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://olokas.com"),
  title: {
    default: "Olokas — AI search visibility, measured",
    template: "%s · Olokas",
  },
  description:
    "Olokas monitors how ChatGPT, Perplexity, Google AI Overviews, and Claude answer questions about your business. Weekly scans. Email reports.",
  applicationName: "Olokas",
  authors: [{ name: "Olokas" }],
  generator: "Next.js",
  keywords: [
    "AI search visibility",
    "GEO",
    "generative engine optimization",
    "ChatGPT SEO",
    "Perplexity SEO",
    "AI search monitoring",
  ],
  openGraph: {
    type: "website",
    url: "https://olokas.com",
    siteName: "Olokas",
    title: "Olokas — AI search visibility, measured",
    description:
      "Monitor how AI search engines discover and cite your business. Weekly scans, email reports, $39/mo.",
  },
  twitter: {
    card: "summary",
    title: "Olokas — AI search visibility, measured",
    description:
      "Monitor how AI search engines discover and cite your business. Weekly scans, email reports.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://olokas.com",
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff6b35'/%3E%3C/svg%3E",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://olokas.com/#organization",
      name: "Olokas",
      url: "https://olokas.com",
      description:
        "Monitor how AI search engines (ChatGPT, Perplexity, Google AI Overviews, Claude) discover and cite your business website.",
      email: "hello@olokas.com",
      foundingDate: "2026",
    },
    {
      "@type": "WebSite",
      "@id": "https://olokas.com/#website",
      url: "https://olokas.com",
      name: "Olokas",
      description: "AI search visibility, measured.",
      publisher: { "@id": "https://olokas.com/#organization" },
    },
    {
      "@type": "Service",
      name: "Olokas — AI Search Visibility Monitoring",
      provider: { "@id": "https://olokas.com/#organization" },
      description:
        "Weekly scans of ChatGPT, Perplexity, Google AI Overviews, and Claude to measure how AI search engines describe and cite your business website.",
      areaServed: "Worldwide",
      offers: {
        "@type": "Offer",
        price: "39",
        priceCurrency: "USD",
        description:
          "Starter tier: 1 domain, up to 10 target queries, weekly scans across all four AI search engines",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
