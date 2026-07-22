import type { GraphNode, Limits } from "../types";
import { NodeForm } from "./NodeForm";

export type ComposerState =
  | { mode: "genesis" }
  | { mode: "crossover"; sourceId: string; targetId: string };

interface Props {
  state: ComposerState;
  nodes: Map<string, GraphNode>;
  limits: Limits;
  onSubmit: (title: string, body: string) => Promise<void>;
  onCancel: () => void;
}

export function ComposerModal({ state, nodes, limits, onSubmit, onCancel }: Props) {
  const crossover = state.mode === "crossover";
  const source = crossover ? nodes.get(state.sourceId) : undefined;
  const target = crossover ? nodes.get(state.targetId) : undefined;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        {crossover ? (
          <>
            <h2>🧵 Weave a crossover</h2>
            <p className="modal-sub">
              Bind <strong>«{source?.title ?? "?"}»</strong> and{" "}
              <strong>«{target?.title ?? "?"}»</strong> into one universe. Write the chapter where
            their threads touch.
            </p>
          </>
        ) : (
          <>
            <h2>✦ Begin a new story</h2>
            <p className="modal-sub">
              Light a new star in the void. Give the universe an opening other writers will want to
              continue.
            </p>
          </>
        )}
        <NodeForm
          titlePlaceholder={crossover ? "Crossover title" : "Story title"}
          bodyPlaceholder={
            crossover
              ? "The moment the two stories become one…"
              : "Once, at the edge of everything…"
          }
          submitLabel={crossover ? "Pull the red string" : "Ignite"}
          limits={limits}
          autoFocus
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}
