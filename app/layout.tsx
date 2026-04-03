import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: {
    default: 'Path of Ambition — Player Reference',
    template: '%s | Path of Ambition',
  },
  description: 'A comprehensive reference site for Path of Ambition tabletop RPG players.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 lg:pl-0 pl-0" style={{ paddingTop: '3.5rem' }}>
            <div style={{ maxWidth: '900px', padding: '1.5rem 2rem 4rem' }} className="lg:pt-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
