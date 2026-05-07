import type { Metadata } from "next";
import { HydrationMarker } from "@/components/hydration-marker";
import { Providers } from "@/components/providers";
import "@fontsource-variable/noto-sans-jp/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "かけいぼノート",
  description: "PDF明細の取り込みから支出管理まで行う家計簿アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          <HydrationMarker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
