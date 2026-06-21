import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sing It Manager",
  description: "Sing It 관리자 콘솔",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
