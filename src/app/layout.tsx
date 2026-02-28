import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ethiopia Property Management System",
  description: "Comprehensive property management system for the Ethiopia market. Manage properties, tenants, contracts, invoices, and payments.",
  keywords: ["Property Management", "Ethiopia", "Real Estate", "Rentals", "Contracts", "Invoices", "Payments"],
  authors: [{ name: "Property Management Team" }],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M3 21h18M9 21V11.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V21M3 7l9-4 9 4M4 10v11M20 10v11'/></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
