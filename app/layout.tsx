import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StreamAI — Multi-Tenant AI Platform",
  description:
    "Production-grade AI chat platform with streaming, token tracking, and role-based access.",
};

/**
 * RootLayout Component
 * 
 * The foundational layout for the entire application.
 * 
 * Key Architectural Decisions:
 * 1. Font Integration: Uses Next.js Font (Geist) for optimized typography.
 * 2. Theme Management: Wraps the app with `next-themes` (ThemeProvider) for dark mode support.
 * 3. Global Notifications: Initializes the `sonner` Toaster for consistent toast messages.
 * 4. Hydration: suppressHydrationWarning is used to prevent issues with theme-switching on the server.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
