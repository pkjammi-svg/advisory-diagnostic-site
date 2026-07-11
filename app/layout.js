import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata = {
  title: "InfotoImpact — Find the real problem, first",
  description: "A quick, guided conversation to identify the real cause of your business problem."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
