import './globals.css';
import ClientShell from "./ClientShell.jsx";

export const metadata = {
  title: 'bhamjobs',
  description: 'Birmingham jobs and assistant',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body data-theme="trivium-rhetoric" className="min-h-screen grid grid-cols-1 md:grid-cols-[280px_1fr]">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
