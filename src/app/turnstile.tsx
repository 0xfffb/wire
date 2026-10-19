"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const scriptSrc = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const node = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey) return;
    const element = node.current;
    if (!element) return;
    let cancelled = false;
    let widgetId = "";

    function mount() {
      if (cancelled || !element || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(element, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptSrc}"]`);
    const script = existing ?? document.createElement("script");
    script.async = true;
    script.src = scriptSrc;
    script.addEventListener("load", mount);
    if (!existing) document.head.appendChild(script);
    if (window.turnstile) mount();

    return () => {
      cancelled = true;
      script.removeEventListener("load", mount);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  if (!siteKey) return <p className="text-sm text-[#e5484d]">还没有配置 Turnstile。</p>;
  return <div ref={node} className="min-h-[65px]" />;
}
