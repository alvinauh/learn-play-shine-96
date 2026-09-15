// OfflineStatusBadge — shows offline indicator + pending sync count
// Renders nothing when online and queue is empty.

import { useOnlineSync } from "@/hooks/useOnlineSync";

export function OfflineStatusBadge() {
  const { isOnline, pendingCount, syncing, manualSync } = useOnlineSync();

  // null = SSR / not yet hydrated — render nothing to avoid flash
  if (isOnline === null) return null;
  if (isOnline && pendingCount === 0) return null;

  return (
    <button
      onClick={() => { if (isOnline && pendingCount > 0) void manualSync(); }}
      className={[
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
        "shadow-lg backdrop-blur-sm transition-all",
        isOnline
          ? "bg-amber-500/90 text-amber-950 cursor-pointer"
          : "bg-slate-800/90 text-slate-300 cursor-default",
      ].join(" ")}
      aria-label={isOnline ? "Sync pending answers" : "Offline"}
    >
      {isOnline ? (
        syncing ? (
          <><span className="animate-spin">↻</span> Menyegerakkan…</>
        ) : (
          <><span>↑</span> {pendingCount} jawapan belum dihantar — ketik untuk hantar</>
        )
      ) : (
        <><span>✕</span> Tiada internet{pendingCount > 0 ? ` · ${pendingCount} disimpan` : ""}</>
      )}
    </button>
  );
}
