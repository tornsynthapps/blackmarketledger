"use client";

import { getConnectionString } from "@/lib/bmlconnect";

export default function Home() {
  // Generate a large random string.
  const randomString = getConnectionString();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <main className="w-full max-w-lg">
        <h1 className="text-3xl font-bold">Blackmarket Ledger</h1>
        <p className="mt-4 text-gray-500">{randomString}</p>

        {/* Copy the connection string to the clipboard */}
        <button
          className="mt-4 bg-primary text-white px-4 py-2 rounded-md"
          onClick={() => {
            navigator.clipboard.writeText(randomString);
          }}
        >
          Copy
        </button>

        {/* Instructions */}
        <p className="mt-4 text-gray-500">
          1. Open the BML Connect extension.<br />
          2. Click the "Connect" button.<br />
          3. Paste the connection string below.<br />
        </p>
      </main>
    </div>
  );
}
