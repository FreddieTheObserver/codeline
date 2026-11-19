import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Nunito, Pixelify_Sans } from "next/font/google";
import { FeedbackProvider } from "@/components/feedback";
import "./globals.css";

const pixel = Pixelify_Sans({ variable: "--font-pixelify", subsets: ["latin"], weight: ["500", "700"] });
const body = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: { default: "CodeLine", template: "%s · CodeLine" },
  description: "Turn plain-words algorithms into code, one seed at a time.",
};

export const viewport: Viewport = { themeColor: "#7cbf5a" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixel.variable} ${body.variable} ${mono.variable} h-full`}>
      <body className="bg-meadow min-h-full flex flex-col">
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
