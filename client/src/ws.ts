import type { ServerEvent } from "./types";

/** Tiny auto-reconnecting websocket that survives dev-server restarts. */
export function connectEvents(onEvent: (event: ServerEvent) => void): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let retryMs = 1000;

  function open() {
    if (closed) return;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${proto}://${location.host}/ws`);
    socket.onopen = () => {
      retryMs = 1000;
    };
    socket.onmessage = (msg) => {
      try {
        onEvent(JSON.parse(msg.data as string) as ServerEvent);
      } catch {
        // ignore malformed frames
      }
    };
    socket.onclose = () => {
      if (closed) return;
      setTimeout(open, retryMs);
      retryMs = Math.min(retryMs * 2, 15000);
    };
  }

  open();
  return () => {
    closed = true;
    socket?.close();
  };
}
