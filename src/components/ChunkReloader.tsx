"use client";

import { useEffect } from "react";

/**
 * Auto-recovers from stale-deploy chunk errors. When we ship a new version,
 * a page a user already had open may try to load a code chunk that no longer
 * exists, which surfaces as a scary "Application error". We catch that specific
 * failure and reload once so the user silently gets the fresh version.
 */
export default function ChunkReloader() {
  useEffect(() => {
    const isChunkError = (msg?: string) =>
      !!msg &&
      /ChunkLoadError|Loading chunk [\d]+ failed|Importing a module script failed|error loading dynamically imported module|Failed to fetch dynamically imported module/i.test(
        msg,
      );

    const recover = (msg?: string) => {
      if (!isChunkError(msg)) return;
      if (sessionStorage.getItem("ww-chunk-reload")) return; // already tried this session
      sessionStorage.setItem("ww-chunk-reload", "1");
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => recover(e.message || (e.error && e.error.message));
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string } | string | undefined;
      recover(typeof r === "string" ? r : r?.message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    // If the page has been healthy for a few seconds, allow a future recovery again.
    const t = setTimeout(() => sessionStorage.removeItem("ww-chunk-reload"), 5000);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      clearTimeout(t);
    };
  }, []);

  return null;
}
