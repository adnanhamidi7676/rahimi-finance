import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
        R
      </span>
      <h1 className="text-lg font-semibold">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Rahimi Finance needs an internet connection to show live data. Reconnect
        and try again.
      </p>
    </main>
  );
}
