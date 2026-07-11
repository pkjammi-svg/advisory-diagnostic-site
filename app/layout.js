import "./globals.css";

export const metadata = {
  title: "Business Diagnostic — Find the real problem, first",
  description: "A quick, guided conversation to identify the real cause of your business problem."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
