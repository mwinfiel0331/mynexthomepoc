import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'My Next Home',
  description: 'Find, evaluate, and compare homes with AI-powered scoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <nav className="bg-white shadow">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">My Next Home</h1>
            <div className="flex gap-6">
              <a href="/" className="hover:text-blue-600">
                Search
              </a>
              <a href="/shortlist" className="hover:text-blue-600">
                Shortlist
              </a>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
