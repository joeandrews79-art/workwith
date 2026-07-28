"use client";

/**
 * Root error boundary. Shown only if something crashes above the normal UI.
 * Most commonly this is a stale page after a new version shipped, which a
 * reload fixes, so we lead with that.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", background: "#0d1117", color: "#e6edf3" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#9da7b3", margin: "0 0 20px" }}>
              This usually means a new version was just released while you had the page open. Reloading should fix it.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => window.location.reload()}
                style={{ font: "inherit", fontSize: 15, fontWeight: 600, padding: "10px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: "#2563eb", color: "#fff" }}
              >
                Reload
              </button>
              <button
                onClick={() => reset()}
                style={{ font: "inherit", fontSize: 15, fontWeight: 600, padding: "10px 18px", borderRadius: 10, cursor: "pointer", background: "transparent", color: "#e6edf3", border: "1px solid #30363d" }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
