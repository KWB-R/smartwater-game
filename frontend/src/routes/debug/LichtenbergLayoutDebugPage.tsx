import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent } from "react";
import { useLatestRef } from "@/hooks/useLatestRef";
import { Link } from "react-router-dom";
import { ROUTES } from "@/routes/paths";
import {
  buildLichtenbergSidebarGroups,
  layerKeysInGroup,
} from "./lichtenbergLayoutDebugGroups";
import {
  buildLichtenbergLayoutDebugLayers,
  LICHTENBERG_DEBUG_REF,
  type LichtenbergDebugLayer,
} from "./lichtenbergLayoutDebugLayers";
import { cn } from "@/lib/cn";
import { LayerCoordinatesCompare } from "./LayerCoordinatesCompare";
import { layerDebugColorStyle } from "./lichtenbergLayoutDebugColors";
import { TransparentDebugVideo } from "./TransparentDebugVideo";
import "./lichtenbergLayoutDebug.scss";

const DEBUG_ZOOM_MIN = 0.05;
const DEBUG_ZOOM_MAX = 3;

function clampDebugZoom(value: number): number {
  return Math.min(DEBUG_ZOOM_MAX, Math.max(DEBUG_ZOOM_MIN, value));
}

/** Skaliert die quadratische Designfläche proportional in den Vorschaucontainer. */
function computeFitPreviewScale(scrollEl: HTMLElement): number | null {
  const style = getComputedStyle(scrollEl);
  const padX =
    Number.parseFloat(style.paddingLeft) +
    Number.parseFloat(style.paddingRight);
  const padY =
    Number.parseFloat(style.paddingTop) +
    Number.parseFloat(style.paddingBottom);
  const w = scrollEl.clientWidth - padX;
  const h = scrollEl.clientHeight - padY;
  if (w <= 0 || h <= 0) {
    return null;
  }
  return clampDebugZoom(
    Math.min(
      w / LICHTENBERG_DEBUG_REF.width,
      h / LICHTENBERG_DEBUG_REF.height,
    ),
  );
}

function centerPreviewScroll(scrollEl: HTMLElement): void {
  scrollEl.scrollLeft = Math.max(
    0,
    (scrollEl.scrollWidth - scrollEl.clientWidth) / 2,
  );
  scrollEl.scrollTop = Math.max(
    0,
    (scrollEl.scrollHeight - scrollEl.clientHeight) / 2,
  );
}

type LayerItemProps = {
  layer: LichtenbergDebugLayer;
  selected: boolean;
  onSelect: (key: string, additive: boolean) => void;
};

function LayerItem({ layer, selected, onSelect }: LayerItemProps) {
  const style = {
    ...layerDebugColorStyle(layer.key),
    left: `${layer.x}px`,
    top: `${layer.y}px`,
    width: `${layer.width}px`,
    height: `${layer.height}px`,
  };
  const isVideo = layer.mediaKind === "video";
  const isSocket = layer.role === "socket";

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    onSelect(layer.key, e.ctrlKey || e.metaKey);
  };

  return (
    <button
      type="button"
      className={cn(
        "lichtenberg-layout-debug__layer",
        "lichtenberg-layout-debug__layer--selectable",
        isSocket && "lichtenberg-layout-debug__layer--socket",
        isVideo && "lichtenberg-layout-debug__layer--video",
        selected && "lichtenberg-layout-debug__layer--selected",
      )}
      style={style}
      title={`${layer.label} — Klicken zum Auswählen, Strg/Cmd für Mehrfachauswahl`}
      onClick={handleClick}
      aria-pressed={selected}
    >
      <span className="lichtenberg-layout-debug__layer-label">{layer.label}</span>
      {layer.assetUrl == null && layer.videoWebUrl == null ? (
        <div className="lichtenberg-layout-debug__layer-missing">
          Asset nicht gefunden
        </div>
      ) : isVideo ? (
        <div className="lichtenberg-layout-debug__layer-video-wrap" aria-hidden>
          <TransparentDebugVideo
            webUrl={layer.videoWebUrl}
            movUrl={layer.videoMovUrl}
            className="lichtenberg-layout-debug__layer-video"
          />
        </div>
      ) : (
        <img
          src={layer.assetUrl ?? ""}
          alt=""
          className="lichtenberg-layout-debug__layer-img"
          decoding="async"
        />
      )}
    </button>
  );
}

export function LichtenbergLayoutDebugPage() {
  const layers = useMemo(() => buildLichtenbergLayoutDebugLayers(), []);
  const layerByKey = useMemo(
    () => new Map(layers.map((l) => [l.key, l])),
    [layers],
  );

  const [scale, setScale] = useState(1);
  const scaleRef = useLatestRef(scale);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialFitDoneRef = useRef(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el == null) {
      return;
    }

    const applyInitialFit = () => {
      if (initialFitDoneRef.current) {
        return;
      }
      const fit = computeFitPreviewScale(el);
      if (fit == null) {
        return;
      }
      initialFitDoneRef.current = true;
      scaleRef.current = fit;
      setScale(fit);
      requestAnimationFrame(() => centerPreviewScroll(el));
    };

    applyInitialFit();
    if (initialFitDoneRef.current) {
      return;
    }

    const observer = new ResizeObserver(() => applyInitialFit());
    observer.observe(el);
    return () => observer.disconnect();
  }, [scaleRef]);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }
    const panClass = "lichtenberg-layout-debug__scroll--panning";

    const endPan = (pointerId?: number) => {
      const pan = panRef.current;
      if (pan == null) {
        return;
      }
      if (pointerId != null && pan.pointerId !== pointerId) {
        return;
      }
      panRef.current = null;
      el.classList.remove(panClass);
      try {
        el.releasePointerCapture(pan.pointerId);
      } catch {
        /* Die Zeigererfassung kann bereits aufgehoben sein. */
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) {
        el.scrollTop += e.deltaY;
        el.scrollLeft += e.deltaX;
        return;
      }
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const prev = scaleRef.current;
      const next = clampDebugZoom(prev * Math.exp(-e.deltaY * 0.002));
      if (next === prev) {
        return;
      }
      const ratio = next / prev;
      el.scrollLeft = (el.scrollLeft + x) * ratio - x;
      el.scrollTop = (el.scrollTop + y) * ratio - y;
      scaleRef.current = next;
      setScale(next);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 1) {
        return;
      }
      e.preventDefault();
      panRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      };
      el.classList.add(panClass);
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const pan = panRef.current;
      if (pan == null || e.pointerId !== pan.pointerId) {
        return;
      }
      e.preventDefault();
      el.scrollLeft = pan.scrollLeft - (e.clientX - pan.startX);
      el.scrollTop = pan.scrollTop - (e.clientY - pan.startY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 1) {
        endPan(e.pointerId);
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      endPan(e.pointerId);
    };

    const onAuxClick = (e: Event) => {
      if (e instanceof MouseEvent && e.button === 1) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown, { capture: true });
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    el.addEventListener("auxclick", onAuxClick);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown, { capture: true });
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      el.removeEventListener("auxclick", onAuxClick);
      endPan();
    };
  }, [scaleRef]);
  const [showOutlines, setShowOutlines] = useState(true);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set());
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [socketsStackVisible, setSocketsStackVisible] = useState(true);

  const isVisible = (layer: LichtenbergDebugLayer) =>
    !hiddenKeys.has(layer.key);

  const selectedLayers = useMemo(
    () =>
      selectedKeys
        .map((k) => layerByKey.get(k))
        .filter((l): l is LichtenbergDebugLayer => l != null),
    [selectedKeys, layerByKey],
  );

  const mainLayers = layers.filter(
    (l) => l.role !== "socket" && isVisible(l),
  );
  const socketLayers = layers.filter(
    (l) => l.role === "socket" && isVisible(l),
  );

  const toggleVisibility = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelect = useCallback((key: string, additive: boolean) => {
    setSelectedKeys((prev) => {
      if (additive) {
        if (prev.includes(key)) {
          return prev.filter((k) => k !== key);
        }
        return [...prev, key];
      }
      if (prev.length === 1 && prev[0] === key) {
        return [];
      }
      return [key];
    });
  }, []);

  const sidebarGroups = useMemo(
    () => buildLichtenbergSidebarGroups(layers),
    [layers],
  );

  const toggleGroupVisibility = (groupId: string) => {
    const keys = layerKeysInGroup(layers, groupId);
    const allHidden = keys.every((k) => hiddenKeys.has(k));
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (allHidden) {
          next.delete(k);
        } else {
          next.add(k);
        }
      }
      return next;
    });
  };

  return (
    <div className="lichtenberg-layout-debug">
      <header className="lichtenberg-layout-debug__toolbar">
        <Link to={ROUTES.map} className="lichtenberg-layout-debug__back">
          ← Karte
        </Link>
        <label className="lichtenberg-layout-debug__control">
          <input
            type="checkbox"
            checked={showOutlines}
            onChange={(e) => setShowOutlines(e.target.checked)}
          />
          Rahmen &amp; Labels
        </label>
        <label className="lichtenberg-layout-debug__control">
          <input
            type="checkbox"
            checked={socketsStackVisible}
            onChange={(e) => setSocketsStackVisible(e.target.checked)}
          />
          Socket-Layer
        </label>
      </header>

      <div className="lichtenberg-layout-debug__body">
        <aside
          className="lichtenberg-layout-debug__sidebar"
          aria-label="Ebenen und Koordinaten"
        >
          <div className="lichtenberg-layout-debug__sidebar-list">
            {sidebarGroups.map((group) =>
              group.items.length === 0 ? null : (
                <section
                  key={group.id}
                  className="lichtenberg-layout-debug__sidebar-group"
                >
                  <div className="lichtenberg-layout-debug__sidebar-group-head">
                    <h2 className="lichtenberg-layout-debug__sidebar-group-title">
                      {group.title}
                    </h2>
                    <button
                      type="button"
                      className="lichtenberg-layout-debug__stack-toggle"
                      onClick={() => toggleGroupVisibility(group.id)}
                      title="Sichtbarkeit aller Ebenen dieser Gruppe"
                    >
                      Sichtb.
                    </button>
                  </div>
                  <ul className="lichtenberg-layout-debug__layer-list">
                    {group.items.map((layer) => {
                      const hidden = hiddenKeys.has(layer.key);
                      const isSelected = selectedKeys.includes(layer.key);
                      return (
                        <li
                          key={layer.key}
                          className={
                            isSelected
                              ? "lichtenberg-layout-debug__layer-row lichtenberg-layout-debug__layer-row--selected"
                              : "lichtenberg-layout-debug__layer-row"
                          }
                        >
                          <button
                            type="button"
                            className={
                              hidden
                                ? "lichtenberg-layout-debug__visibility-toggle lichtenberg-layout-debug__visibility-toggle--off"
                                : "lichtenberg-layout-debug__visibility-toggle"
                            }
                            onClick={() => toggleVisibility(layer.key)}
                            aria-label={
                              hidden ? "Einblenden" : "Ausblenden"
                            }
                            title={hidden ? "Einblenden" : "Ausblenden"}
                          >
                            {hidden ? "○" : "●"}
                          </button>
                          <button
                            type="button"
                            className="lichtenberg-layout-debug__layer-select"
                            onClick={(e) =>
                              handleSelect(
                                layer.key,
                                e.ctrlKey || e.metaKey,
                              )
                            }
                          >
                            {layer.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ),
            )}
          </div>
          <LayerCoordinatesCompare
            selected={selectedLayers}
            onClear={() => setSelectedKeys([])}
          />
        </aside>

        <div
          ref={scrollRef}
          className="lichtenberg-layout-debug__scroll"
        >
          <div
            className={
              showOutlines
                ? "lichtenberg-layout-debug__stage-wrap lichtenberg-layout-debug__stage-wrap--outlines"
                : "lichtenberg-layout-debug__stage-wrap"
            }
            style={{
              width: `${LICHTENBERG_DEBUG_REF.width * scale}px`,
              height: `${LICHTENBERG_DEBUG_REF.height * scale}px`,
            }}
          >
            <div
              className="lichtenberg-layout-debug__stage"
              style={{
                width: `${LICHTENBERG_DEBUG_REF.width}px`,
                height: `${LICHTENBERG_DEBUG_REF.height}px`,
                transform: `scale(${scale})`,
              }}
              onClick={() => setSelectedKeys([])}
            >
              <div
                className="lichtenberg-layout-debug__stack lichtenberg-layout-debug__stack--main"
                aria-label="Hintergrund, Objekte und Videos"
              >
                {mainLayers.map((layer) => (
                  <LayerItem
                    key={layer.key}
                    layer={layer}
                    selected={selectedKeys.includes(layer.key)}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
              {socketsStackVisible ? (
                <div
                  className="lichtenberg-layout-debug__stack lichtenberg-layout-debug__stack--sockets"
                  aria-label="Sockets"
                >
                  {socketLayers.map((layer) => (
                    <LayerItem
                      key={layer.key}
                      layer={layer}
                      selected={selectedKeys.includes(layer.key)}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
