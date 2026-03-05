import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { SecurityProvider } from "@/context/SecurityContext";
import { Toaster } from "sonner";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proof-of-Impact Funding Protocol (PIFP)",
  description: "A decentralized funding platform that aligns transparent impact verification with milestone-based capital release on Starknet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${inter.variable} antialiased`}>
        <WalletProvider>
          <NotificationProvider>
            <SecurityProvider>{children}</SecurityProvider>
            <Toaster
              position="bottom-right"
              theme="dark"
              toastOptions={{
                className: "bg-zinc-950/90 border-white/5 text-zinc-300 backdrop-blur-xl w-[356px] max-w-[calc(100vw-2rem)] right-0 mr-4 sm:mr-0",
              }}
            />
          </NotificationProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
// Finalizing commit 26: app layout overview
