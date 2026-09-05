function firstDetail(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object") {
      const msg = (first as { msg?: unknown }).msg;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    }
  }
  if (detail && typeof detail === "object") {
    const rec = detail as { msg?: unknown; message?: unknown };
    const msg = rec.msg ?? rec.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return null;
}

export function humanError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!(err instanceof Error) || !err.message) return fallback;
  const raw = err.message.trim();
  if (!raw) return fallback;
  if (/^\s*<(!DOCTYPE|html)/i.test(raw)) {
    return "The server returned an unexpected page. Please try again.";
  }
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown };
      const fromDetail = firstDetail(parsed.detail);
      if (fromDetail) return fromDetail.slice(0, 180);
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message.trim().slice(0, 180);
      }
    } catch {
      /* fall through to trimmed raw */
    }
  }
  const line = raw.split("\n")[0]?.trim() || fallback;
  return line.slice(0, 180);
}
