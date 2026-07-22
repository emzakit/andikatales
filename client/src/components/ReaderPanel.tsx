import { useEffect, useState } from "react";
import { api, timeAgo } from "../api";
import type { GraphNode, LineageEntry, Limits } from "../types";
import { NodeForm } from "./NodeForm";

const KIND_LABEL = {
  genesis: "✦ Origin",
  continuation: "⤷ Chapter",
  crossover: "🧵 Crossover",
} as const;

interface Props {
  nodeId: string;
  nodes: Map<string, GraphNode>;
  myVotes: Set<string>;
  limits: Limits;
  onVote: (id: string) => void;
  onJump: (id: string) => void;
  onStartLinking: (id: string) => void;
  onContinue: (title: string, body: string) => Promise<void>;
  onClose: () => void;
}

export function ReaderPanel({
  nodeId,
  nodes,
  myVotes,
  limits,
  onVote,
  onJump,
  onStartLinking,
  onContinue,
  onClose,
}: Props) {
  const [lineage, setLineage] = useState<LineageEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLineage(null);
    setFailed(false);
    setWriting(false);
    api
      .node(nodeId)
      .then((res) => {
        if (!cancelled) setLineage(res.lineage);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [nodeId]);

  return (
    <aside className="reader">
      <header className="reader-header">
        <div>
          <div className="reader-kicker">The story so far</div>
          <div className="reader-count">
            {lineage ? `${lineage.length} chapter${lineage.length === 1 ? "" : "s"}` : "tracing…"}
          </div>
        </div>
        <button className="ghost close" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </header>

      <div className="reader-scroll">
        {failed && <div className="reader-empty">Could not load this thread.</div>}
        {lineage?.map((entry, i) => {
          const live = nodes.get(entry.id);
          const score = live?.score ?? entry.score;
          const voted = myVotes.has(entry.id);
          const isTail = i === lineage.length - 1;
          return (
            <article key={entry.id} className={`chapter ${entry.kind}${isTail ? " tail" : ""}`}>
              <div className="chapter-meta">
                <span className={`kind-chip ${entry.kind}`}>{KIND_LABEL[entry.kind]}</span>
                <span>
                  by {entry.authorHandle} · {timeAgo(entry.createdAt)}
                </span>
              </div>
              <h3 onClick={() => !isTail && onJump(entry.id)} className={isTail ? "" : "jumpable"}>
                {entry.title}
              </h3>
              {entry.mergedWith && (
                <button className="merged-with" onClick={() => onJump(entry.mergedWith!.id)}>
                  🧵 entwined with «{entry.mergedWith.title}»
                </button>
              )}
              {entry.body.split(/\n{2,}/).map((para, j) => (
                <p key={j}>{para}</p>
              ))}
              <button
                className={`vote${voted ? " voted" : ""}`}
                onClick={() => onVote(entry.id)}
                title={voted ? "Remove your star" : "Give this chapter a star"}
              >
                ★ {score}
              </button>
            </article>
          );
        })}
      </div>

      {lineage && (
        <footer className="reader-actions">
          {writing ? (
            <NodeForm
              titlePlaceholder="Chapter title"
              bodyPlaceholder="What happens next?"
              submitLabel="Add chapter"
              limits={limits}
              autoFocus
              onSubmit={onContinue}
              onCancel={() => setWriting(false)}
            />
          ) : (
            <>
              <button className="primary" onClick={() => setWriting(true)}>
                ✎ What happens next?
              </button>
              <button className="crossover-btn" onClick={() => onStartLinking(nodeId)}>
                🧵 Weave a crossover
              </button>
            </>
          )}
        </footer>
      )}
    </aside>
  );
}
