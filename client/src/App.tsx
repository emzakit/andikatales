import { useCallback, useEffect, useRef, useState } from "react";
import { api, bootstrapIdentity } from "./api";
import { connectEvents } from "./ws";
import type { GraphLink, GraphNode, Limits, MePayload, ServerEvent } from "./types";
import { ConstellationCanvas } from "./graph/ConstellationCanvas";
import { ReaderPanel } from "./components/ReaderPanel";
import { ComposerModal, type ComposerState } from "./components/ComposerModal";

const DEFAULT_LIMITS: Limits = { title: 90, bodyMin: 10, bodyMax: 4000 };

export default function App() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [nodes, setNodes] = useState<Map<string, GraphNode>>(new Map());
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [staleMs, setStaleMs] = useState(3 * 24 * 60 * 60 * 1000);
  const [limits, setLimits] = useState<Limits>(DEFAULT_LIMITS);
  const [me, setMe] = useState<MePayload | null>(null);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  const applyNewNode = useCallback((node: GraphNode, newLinks: GraphLink[]) => {
    setNodes((prev) => {
      if (prev.has(node.id)) return prev;
      const next = new Map(prev);
      next.set(node.id, node);
      for (const l of newLinks) {
        const parent = next.get(l.parentId);
        if (parent) next.set(l.parentId, { ...parent, childCount: parent.childCount + 1 });
      }
      return next;
    });
    setLinks((prev) => {
      const known = new Set(prev.map((l) => `${l.parentId}>${l.childId}`));
      const fresh = newLinks.filter((l) => !known.has(`${l.parentId}>${l.childId}`));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, []);

  useEffect(() => {
    let disconnect: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        await bootstrapIdentity();
        const [graph, meData] = await Promise.all([api.graph(), api.me()]);
        if (cancelled) return;
        setNodes(new Map(graph.nodes.map((n) => [n.id, n])));
        setLinks(graph.links);
        setStaleMs(graph.config.staleMs);
        setLimits(graph.config.limits);
        setMe(meData);
        setMyVotes(new Set(meData.votes));
        setPhase("ready");
        disconnect = connectEvents((event: ServerEvent) => {
          if (event.type === "node:new") applyNewNode(event.node, event.links);
          else if (event.type === "vote") {
            setNodes((prev) => {
              const node = prev.get(event.nodeId);
              if (!node || node.score === event.score) return prev;
              const next = new Map(prev);
              next.set(event.nodeId, { ...node, score: event.score });
              return next;
            });
          }
        });
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      disconnect?.();
    };
  }, [applyNewNode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (composer) setComposer(null);
      else if (linkingFrom) setLinkingFrom(null);
      else setSelectedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [composer, linkingFrom]);

  const handlePick = useCallback(
    (id: string | null) => {
      if (linkingFrom) {
        if (!id) return; // clicking the void while threading does nothing
        if (id === linkingFrom) {
          showToast("A story cannot cross over with itself — pick a different star.");
          return;
        }
        setComposer({ mode: "crossover", sourceId: linkingFrom, targetId: id });
        return;
      }
      setSelectedId(id);
    },
    [linkingFrom, showToast]
  );

  async function createNode(title: string, body: string, parentIds: string[]) {
    const created = await api.createNode({ title, body, parentIds });
    applyNewNode(created.node, created.links);
    setComposer(null);
    setLinkingFrom(null);
    setSelectedId(created.node.id);
    setMe((prev) =>
      prev ? { ...prev, stats: { ...prev.stats, nodesWritten: prev.stats.nodesWritten + 1 } } : prev
    );
  }

  const handleVote = useCallback(
    async (id: string) => {
      const hadVoted = myVotes.has(id);
      setMyVotes((prev) => {
        const next = new Set(prev);
        if (hadVoted) next.delete(id);
        else next.add(id);
        return next;
      });
      setNodes((prev) => {
        const node = prev.get(id);
        if (!node) return prev;
        const next = new Map(prev);
        next.set(id, { ...node, score: Math.max(0, node.score + (hadVoted ? -1 : 1)) });
        return next;
      });
      try {
        await api.vote(id);
      } catch (err) {
        setMyVotes((prev) => {
          const next = new Set(prev);
          if (hadVoted) next.add(id);
          else next.delete(id);
          return next;
        });
        showToast(err instanceof Error ? err.message : "Vote failed.");
      }
    },
    [myVotes, showToast]
  );

  if (phase === "loading") {
    return <div className="boot">✦ charting the constellations…</div>;
  }
  if (phase === "error") {
    return (
      <div className="boot">
        The void is silent — is the API server running? <code>npm run dev</code>
      </div>
    );
  }

  return (
    <div className="app">
      <ConstellationCanvas
        nodes={nodes}
        links={links}
        selectedId={selectedId}
        linkingFromId={linkingFrom}
        staleMs={staleMs}
        onPick={handlePick}
      />

      <div className="hud">
        <h1>Andika Tales</h1>
        <div className="hud-stats">
          {nodes.size} stars · {links.length} threads
        </div>
        <button className="primary" onClick={() => setComposer({ mode: "genesis" })}>
          ✦ Begin a new story
        </button>
      </div>

      {me && (
        <div className="identity" title="Your anonymous author identity (lives in this browser)">
          ✍ {me.handle} · ★ {me.stats.votesReceived} earned · {me.stats.nodesWritten} written
        </div>
      )}

      <div className="hint">scroll to zoom · drag to wander · click a star to read its thread</div>

      {linkingFrom && (
        <div className="linking-banner">
          🧵 Choose the other story to entwine — <em>Esc to cancel</em>
          <button className="ghost" onClick={() => setLinkingFrom(null)}>
            Cancel
          </button>
        </div>
      )}

      {selectedId && nodes.has(selectedId) && (
        <ReaderPanel
          nodeId={selectedId}
          nodes={nodes}
          myVotes={myVotes}
          limits={limits}
          onVote={handleVote}
          onJump={setSelectedId}
          onStartLinking={(id) => {
            setLinkingFrom(id);
            setSelectedId(null);
          }}
          onContinue={(title, body) => createNode(title, body, [selectedId])}
          onClose={() => setSelectedId(null)}
        />
      )}

      {composer && (
        <ComposerModal
          state={composer}
          nodes={nodes}
          limits={limits}
          onSubmit={(title, body) =>
            createNode(
              title,
              body,
              composer.mode === "genesis" ? [] : [composer.sourceId, composer.targetId]
            )
          }
          onCancel={() => setComposer(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
