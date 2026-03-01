import type { Metadata } from "next";
import { Nunito, Fredoka } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Forage — Find Vendors, Build Your Product",
  description:
    "Your AI agent forages the real world for vendors so you can build physical products. Animal Crossing meets B2B sourcing.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${fredoka.variable} antialiased`}>
        <SessionProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
