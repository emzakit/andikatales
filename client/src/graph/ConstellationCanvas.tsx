import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type ForceLink,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import type { GraphLink, GraphNode } from "../types";

interface SimNode extends SimulationNodeDatum {
  id: string;
  data: GraphNode;
}

interface SimLink {
  source: SimNode;
  target: SimNode; // the child node
  data: GraphLink;
}

interface Props {
  nodes: Map<string, GraphNode>;
  links: GraphLink[];
  selectedId: string | null;
  linkingFromId: string | null;
  staleMs: number;
  onPick: (id: string | null) => void;
}

const KIND_STYLE = {
  genesis: { glow: "255,205,100", core: "#fff6dd", base: 10 },
  continuation: { glow: "120,160,255", core: "#e8f0ff", base: 6.5 },
  crossover: { glow: "255,90,115", core: "#ffe6ea", base: 8 },
} as const;

function nodeRadius(n: GraphNode): number {
  return KIND_STYLE[n.kind].base + Math.sqrt(n.score) * 1.5;
}

function edgeKey(parentId: string, childId: string): string {
  return `${parentId}>${childId}`;
}

export function ConstellationCanvas({
  nodes,
  links,
  selectedId,
  linkingFromId,
  staleMs,
  onPick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const simNodesRef = useRef<Map<string, SimNode>>(new Map());
  const simLinksRef = useRef<SimLink[]>([]);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const cameraRef = useRef({ x: 0, y: 0, k: 0.8 });
  const mouseRef = useRef({ sx: 0, sy: 0, inside: false });
  const flashesRef = useRef<Map<string, number>>(new Map());
  const rootCountRef = useRef(0);
  const initializedRef = useRef(false);
  const autoFitRef = useRef(true); // follow the whole universe until the user takes the wheel
  const hoverIdRef = useRef<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Latest interaction props readable from stable event handlers / render loop.
  const liveRef = useRef({ selectedId, linkingFromId, staleMs, onPick });
  liveRef.current = { selectedId, linkingFromId, staleMs, onPick };

  // Ancestor trace of the selected node — the "tracing tool" highlight.
  const focus = useMemo(() => {
    if (!selectedId) return null;
    const parentsByChild = new Map<string, GraphLink[]>();
    for (const l of links) {
      const arr = parentsByChild.get(l.childId);
      if (arr) arr.push(l);
      else parentsByChild.set(l.childId, [l]);
    }
    const nodeSet = new Set<string>([selectedId]);
    const edgeSet = new Set<string>();
    const stack = [selectedId];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const l of parentsByChild.get(cur) ?? []) {
        edgeSet.add(edgeKey(l.parentId, l.childId));
        if (!nodeSet.has(l.parentId)) {
          nodeSet.add(l.parentId);
          stack.push(l.parentId);
        }
      }
    }
    return { nodeSet, edgeSet };
  }, [selectedId, links]);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  // ----- simulation maintenance -----

  useEffect(() => {
    if (!simRef.current) {
      simRef.current = forceSimulation<SimNode>([])
        .force("charge", forceManyBody<SimNode>().strength(-260).distanceMax(900))
        .force(
          "link",
          forceLink<SimNode, SimLink>([])
            .id((d) => d.id)
            .distance((l) => (l.data.type === "crossover" ? 190 : 85))
            .strength((l) => (l.data.type === "crossover" ? 0.2 : 0.9))
        )
        .force("collide", forceCollide<SimNode>().radius((d) => nodeRadius(d.data) + 12))
        .force("x", forceX<SimNode>(0).strength(0.02))
        .force("y", forceY<SimNode>(0).strength(0.02))
        .velocityDecay(0.4)
        .alphaDecay(0.03)
        .stop();
    }
    const sim = simRef.current;
    const simNodes = simNodesRef.current;
    let changed = false;

    for (const [id, data] of nodes) {
      const existing = simNodes.get(id);
      if (existing) {
        existing.data = data;
        continue;
      }
      changed = true;
      let x: number;
      let y: number;
      const parentSims = links
        .filter((l) => l.childId === id)
        .map((l) => simNodes.get(l.parentId))
        .filter((p): p is SimNode => !!p);
      if (parentSims.length > 0) {
        x =
          parentSims.reduce((s, p) => s + (p.x ?? 0), 0) / parentSims.length +
          (Math.random() - 0.5) * 40;
        y =
          parentSims.reduce((s, p) => s + (p.y ?? 0), 0) / parentSims.length +
          30 +
          (Math.random() - 0.5) * 40;
      } else {
        const i = rootCountRef.current++;
        const angle = i * 2.399963; // golden angle keeps roots spread apart
        const r = 240 + i * 60;
        x = Math.cos(angle) * r;
        y = Math.sin(angle) * r;
      }
      simNodes.set(id, { id, data, x, y });
      if (initializedRef.current) flashesRef.current.set(id, performance.now());
    }

    simLinksRef.current = links
      .map((l) => {
        const source = simNodes.get(l.parentId);
        const target = simNodes.get(l.childId);
        return source && target ? { source, target, data: l } : null;
      })
      .filter((l): l is SimLink => l !== null);

    sim.nodes([...simNodes.values()]);
    (sim.force("link") as ForceLink<SimNode, SimLink>).links(simLinksRef.current);

    if (!initializedRef.current) {
      initializedRef.current = true;
      // Settle the layout off-screen, then fit the camera to the whole universe.
      sim.alpha(1);
      for (let i = 0; i < 160 && sim.alpha() > 0.03; i++) sim.tick();
      const canvas = canvasRef.current;
      const all = [...simNodes.values()];
      if (canvas && all.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of all) {
          minX = Math.min(minX, n.x ?? 0);
          maxX = Math.max(maxX, n.x ?? 0);
          minY = Math.min(minY, n.y ?? 0);
          maxY = Math.max(maxY, n.y ?? 0);
        }
        const w = canvas.clientWidth || 1200;
        const h = canvas.clientHeight || 800;
        const k = Math.min(1.4, 0.85 * Math.min(w / (maxX - minX + 240), h / (maxY - minY + 240)));
        cameraRef.current = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, k };
      }
      sim.alpha(0.2);
    } else if (changed) {
      sim.alpha(Math.max(sim.alpha(), 0.7));
    }
  }, [nodes, links]);

  // ----- render loop + input -----

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    // Distant static sky + drifting world dust.
    const skyStars = Array.from({ length: 150 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.1 + 0.2,
      a: Math.random() * 0.5 + 0.1,
    }));
    const dust = Array.from({ length: 220 }, () => ({
      x: (Math.random() - 0.5) * 4200,
      y: (Math.random() - 0.5) * 4200,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.35 + 0.05,
    }));

    const drag = { active: false, moved: false, sx: 0, sy: 0, camX: 0, camY: 0 };

    function toWorld(sx: number, sy: number) {
      const cam = cameraRef.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      return { x: (sx - w / 2) / cam.k + cam.x, y: (sy - h / 2) / cam.k + cam.y };
    }

    function hitTest(sx: number, sy: number): SimNode | null {
      const { x, y } = toWorld(sx, sy);
      const cam = cameraRef.current;
      let best: SimNode | null = null;
      let bestDist = Infinity;
      for (const n of simNodesRef.current.values()) {
        const dx = (n.x ?? 0) - x;
        const dy = (n.y ?? 0) - y;
        const dist = Math.hypot(dx, dy);
        const threshold = nodeRadius(n.data) + 10 / cam.k;
        if (dist < threshold && dist < bestDist) {
          best = n;
          bestDist = dist;
        }
      }
      return best;
    }

    function onPointerDown(e: PointerEvent) {
      autoFitRef.current = false;
      const rect = canvas.getBoundingClientRect();
      drag.active = true;
      drag.moved = false;
      drag.sx = e.clientX - rect.left;
      drag.sy = e.clientY - rect.top;
      drag.camX = cameraRef.current.x;
      drag.camY = cameraRef.current.y;
      canvas.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      mouseRef.current = { sx, sy, inside: true };
      if (drag.active) {
        const dx = sx - drag.sx;
        const dy = sy - drag.sy;
        if (Math.hypot(dx, dy) > 4) drag.moved = true;
        if (drag.moved) {
          const cam = cameraRef.current;
          cam.x = drag.camX - dx / cam.k;
          cam.y = drag.camY - dy / cam.k;
        }
        return;
      }
      const hit = hitTest(sx, sy);
      const id = hit?.id ?? null;
      if (id !== hoverIdRef.current) {
        hoverIdRef.current = id;
        setHoverId(id);
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (!drag.active) return;
      drag.active = false;
      if (drag.moved) return;
      const rect = canvas.getBoundingClientRect();
      const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      liveRef.current.onPick(hit?.id ?? null);
    }

    function onPointerLeave() {
      mouseRef.current.inside = false;
      if (hoverIdRef.current !== null) {
        hoverIdRef.current = null;
        setHoverId(null);
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      autoFitRef.current = false;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const cam = cameraRef.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const k2 = Math.min(3.5, Math.max(0.12, cam.k * Math.exp(-e.deltaY * 0.0012)));
      // keep the world point under the cursor fixed while zooming
      cam.x = cam.x + (sx - w / 2) / cam.k - (sx - w / 2) / k2;
      cam.y = cam.y + (sy - h / 2) / cam.k - (sy - h / 2) / k2;
      cam.k = k2;
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    function draw(now: number) {
      raf = requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      const sim = simRef.current;
      if (sim && sim.alpha() > 0.02) {
        sim.tick();
        if (sim.alpha() > 0.5) sim.tick();
      }

      const cam = cameraRef.current;
      if (autoFitRef.current && simNodesRef.current.size > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of simNodesRef.current.values()) {
          minX = Math.min(minX, n.x ?? 0);
          maxX = Math.max(maxX, n.x ?? 0);
          minY = Math.min(minY, n.y ?? 0);
          maxY = Math.max(maxY, n.y ?? 0);
        }
        const targetK = Math.min(
          1.4,
          0.85 * Math.min(w / (maxX - minX + 260), h / (maxY - minY + 260))
        );
        cam.x += ((minX + maxX) / 2 - cam.x) * 0.12;
        cam.y += ((minY + maxY) / 2 - cam.y) * 0.12;
        cam.k += (targetK - cam.k) * 0.12;
      }
      const { selectedId, linkingFromId, staleMs } = liveRef.current;
      const focus = focusRef.current;
      const toScreen = (n: SimNode) => ({
        x: ((n.x ?? 0) - cam.x) * cam.k + w / 2,
        y: ((n.y ?? 0) - cam.y) * cam.k + h / 2,
      });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
      bg.addColorStop(0, "#0a0d1e");
      bg.addColorStop(1, "#04050d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (const s of skyStars) {
        ctx.fillStyle = `rgba(210,220,255,${s.a})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const s of dust) {
        const sx = (s.x - cam.x) * cam.k + w / 2;
        const sy = (s.y - cam.y) * cam.k + h / 2;
        if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;
        ctx.fillStyle = `rgba(150,165,220,${s.a * 0.5})`;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ----- links -----
      for (const l of simLinksRef.current) {
        const p = toScreen(l.source);
        const c = toScreen(l.target);
        const combined = l.source.data.score + l.target.data.score;
        const onPath = focus?.edgeSet.has(edgeKey(l.data.parentId, l.data.childId)) ?? false;
        const dim = focus ? (onPath ? 1 : 0.1) : 1;

        if (l.data.type === "crossover") {
          const mx = (p.x + c.x) / 2;
          const my = (p.y + c.y) / 2;
          const dx = c.x - p.x;
          const dy = c.y - p.y;
          const len = Math.hypot(dx, dy) || 1;
          const bow = Math.min(60, len * 0.22);
          const cpx = mx - (dy / len) * bow;
          const cpy = my + (dx / len) * bow;
          ctx.lineCap = "round";
          ctx.strokeStyle = `rgba(255,70,95,${0.12 * dim})`;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(cpx, cpy, c.x, c.y);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,95,120,${(onPath ? 0.95 : 0.65) * dim})`;
          ctx.lineWidth = onPath ? 2.4 : 1.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(cpx, cpy, c.x, c.y);
          ctx.stroke();
        } else {
          const alpha = Math.min(0.8, 0.28 + combined * 0.045);
          const width = Math.min(4.5, 1 + Math.sqrt(combined) * 0.4);
          ctx.lineCap = "round";
          if (onPath) {
            ctx.strokeStyle = `rgba(255,215,130,0.14)`;
            ctx.lineWidth = width + 6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(c.x, c.y);
            ctx.stroke();
          }
          ctx.strokeStyle = onPath
            ? `rgba(255,217,128,0.95)`
            : `rgba(150,175,255,${alpha * dim})`;
          ctx.lineWidth = onPath ? width + 0.8 : width;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
        }
      }

      // linking preview: red thread chasing the cursor
      if (linkingFromId) {
        const source = simNodesRef.current.get(linkingFromId);
        if (source && mouseRef.current.inside) {
          const p = toScreen(source);
          ctx.setLineDash([7, 6]);
          ctx.lineDashOffset = -(now / 40) % 13;
          ctx.strokeStyle = "rgba(255,95,120,0.85)";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseRef.current.sx, mouseRef.current.sy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // ----- nodes -----
      const nowMs = Date.now();
      for (const n of simNodesRef.current.values()) {
        const { x, y } = toScreen(n);
        const r = nodeRadius(n.data) * cam.k;
        if (x < -80 || x > w + 80 || y < -80 || y > h + 80) continue;
        const style = KIND_STYLE[n.data.kind];
        const inFocus = focus?.nodeSet.has(n.id) ?? false;
        const dim = focus ? (inFocus ? 1 : 0.16) : 1;
        const isStale = n.data.childCount === 0 && nowMs - n.data.createdAt > staleMs;

        // attention pulse for neglected leaves
        if (isStale && dim === 1) {
          const phase = (Math.sin(now / 450 + n.id.charCodeAt(0)) + 1) / 2;
          ctx.strokeStyle = `rgba(255,186,80,${0.16 + phase * 0.3})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(x, y, r * (2 + phase * 1.1) + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        const glowR = r * 3.4;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        glow.addColorStop(0, `rgba(${style.glow},${0.5 * dim})`);
        glow.addColorStop(0.5, `rgba(${style.glow},${0.12 * dim})`);
        glow.addColorStop(1, `rgba(${style.glow},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = dim;
        ctx.fillStyle = style.core;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.6, r), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.8, r * 0.45), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (n.id === selectedId) {
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x, y, r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (n.id === linkingFromId) {
          ctx.setLineDash([5, 4]);
          ctx.lineDashOffset = -(now / 50) % 9;
          ctx.strokeStyle = "rgba(255,95,120,0.9)";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x, y, r + 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const flashStart = flashesRef.current.get(n.id);
        if (flashStart !== undefined) {
          const age = (now - flashStart) / 1100;
          if (age >= 1) flashesRef.current.delete(n.id);
          else {
            ctx.strokeStyle = `rgba(${style.glow},${(1 - age) * 0.9})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, r + age * 46, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // labels
        const showLabel =
          n.id === selectedId ||
          n.id === hoverIdRef.current ||
          (dim === 1 &&
            (cam.k >= 0.65 ||
              (cam.k >= 0.32 && (n.data.kind === "genesis" || n.data.score >= 4)) ||
              (cam.k < 0.32 && n.data.kind === "genesis")));
        if (showLabel) {
          const label =
            n.data.title.length > 32 ? n.data.title.slice(0, 31) + "…" : n.data.title;
          ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillStyle = `rgba(8,10,22,0.7)`;
          const tw = ctx.measureText(label).width;
          ctx.fillRect(x - tw / 2 - 4, y + r + 6, tw + 8, 15);
          ctx.fillStyle = `rgba(222,230,255,${0.92 * dim})`;
          ctx.fillText(label, x, y + r + 17);
        }
      }

      canvas.style.cursor = hoverIdRef.current
        ? "pointer"
        : drag.active && drag.moved
          ? "grabbing"
          : "grab";

      // keep tooltip glued to the cursor without re-rendering React
      const tip = tooltipRef.current;
      if (tip) {
        if (hoverIdRef.current && mouseRef.current.inside) {
          tip.style.display = "block";
          tip.style.left = `${Math.min(mouseRef.current.sx + 14, w - 240)}px`;
          tip.style.top = `${Math.min(mouseRef.current.sy + 14, h - 80)}px`;
        } else {
          tip.style.display = "none";
        }
      }
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  const hoverNode = hoverId ? nodes.get(hoverId) : undefined;

  return (
    <div className="constellation" ref={containerRef}>
      <canvas ref={canvasRef} />
      <div className="tooltip" ref={tooltipRef}>
        {hoverNode && (
          <>
            <div className="tooltip-title">{hoverNode.title}</div>
            <div className="tooltip-meta">
              by {hoverNode.authorHandle} · ★ {hoverNode.score}
              {hoverNode.childCount === 0 && " · unfinished thread"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
