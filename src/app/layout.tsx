import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ['400', '500', '700']
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lulo | Your AI Browser Agent",
  description: "Lulo helps you browse, record, and automate tasks.",
};

import { getEnv } from "@/lib/env-server";

export const runtime = 'edge';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Runtime injection of environment variables
  // This ensures they are available even if missing at build time
  // but present in the Edge Runtime (Cloudflare Dashboard)
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || '';
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__LULO_ENV = {
                NEXT_PUBLIC_SUPABASE_URL: "${supabaseUrl}",
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "${supabaseAnonKey}"
              };
            `,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
