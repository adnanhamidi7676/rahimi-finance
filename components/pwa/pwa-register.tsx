"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "rahimi-install-dismissed";

export function PwaRegister() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Register the service worker (production only; dev has no /sw.js precache).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    }

    // Reading browser-only APIs on mount to decide whether to show the prompt.
    // These setState calls intentionally sync React state from external state
    // (localStorage / matchMedia / navigator), which is unavailable during SSR.
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !("MSStream" in window);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    if (isIOS && !standalone) setShowIosHint(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function close() {
    setInstallEvent(null);
    setShowIosHint(false);
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  if (dismissed || (!installEvent && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-sm rounded-xl border bg-card p-3 shadow-lg md:bottom-4 md:left-auto md:right-4 md:mx-0">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          R
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install Rahimi Finance</p>
          {installEvent ? (
            <p className="text-xs text-muted-foreground">
              Add it to your device for quick, app-like access.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tap the Share button, then “Add to Home Screen”.
            </p>
          )}
          {installEvent ? (
            <Button size="sm" className="mt-2" onClick={install}>
              <Download className="size-4" />
              Install
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
