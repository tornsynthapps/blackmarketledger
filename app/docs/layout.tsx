import Link from 'next/link';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-panel p-6 shrink-0 md:h-[calc(100vh-4rem)] md:sticky md:top-16 overflow-y-auto">
        <nav className="space-y-6 text-sm">
          <div>
            <h3 className="font-semibold text-foreground mb-2 px-3">Getting Started</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/docs/introduction" className="block px-3 py-2 rounded-md hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors">
                  Introduction
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2 px-3">Guides</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/docs/app-guide" className="block px-3 py-2 rounded-md hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors">
                  App User Guide
                </Link>
              </li>
              <li>
                <Link href="/docs/extension-guide" className="block px-3 py-2 rounded-md hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors">
                  BML Connect Extension
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-2 px-3">Support</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/docs/faq-troubleshooting" className="block px-3 py-2 rounded-md hover:bg-foreground/5 text-foreground/70 hover:text-foreground transition-colors">
                  FAQ & Troubleshooting
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 lg:p-16 max-w-4xl w-full min-w-0">
        <div className="prose prose-slate dark:prose-invert prose-blue max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
}
