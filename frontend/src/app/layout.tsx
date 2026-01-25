import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/providers/Providers";

const GA_TRACKING_ID = "G-TDX3807K0R";

export const metadata: Metadata = {
  title: "Sing It! - 노래방 번호 검색",
  description: "Sing It! - 노래방 번호 검색",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" style={{ colorScheme: "dark" }}>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}');
          `}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        {/* <script
          src="//cdn.jsdelivr.net/npm/eruda"
          dangerouslySetInnerHTML={{ __html: "" }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof eruda !== 'undefined') {
                eruda.init();
              }
            `,
          }}
        /> */}
      </head>
      <body className="bg-background-dark font-display h-full flex flex-col text-white antialiased">
        <Providers>
          <div className="mx-auto w-full max-w-lg">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
