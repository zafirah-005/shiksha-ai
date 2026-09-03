import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AI Teacher",
  description: "An AI teacher that plans, explains, questions, and adapts to you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col">
        {/* Layered background blobs -- fixed behind all page content, what
            the glass cards float over. */}
        <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-clay-cream">
          <div
            className="bg-blob h-[420px] w-[420px] bg-clay-lavender"
            style={{ top: "-8%", left: "-6%" }}
          />
          <div
            className="bg-blob h-[380px] w-[380px] bg-clay-blue"
            style={{ top: "35%", right: "-8%", animationDelay: "4s" }}
          />
          <div
            className="bg-blob h-[340px] w-[340px] bg-clay-pink"
            style={{ bottom: "-10%", left: "20%", animationDelay: "8s" }}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
