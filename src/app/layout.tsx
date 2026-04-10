import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mortgage Intelligence',
  description:
    'De-identified mortgage lead intelligence powered by vector embeddings. Extract audience signals, score propensity, and discover segments — with zero PII retained.',
  keywords: ['mortgage', 'lead intelligence', 'de-identification', 'vector search', 'propensity scoring'],
  authors: [{ name: 'Mortgage Intelligence' }],
  robots: 'noindex, nofollow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-navy-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
