import type { LichtenbergDebugLayer } from "./lichtenbergLayoutDebugLayers";

type Props = {
  selected: LichtenbergDebugLayer[];
  onClear: () => void;
};

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function LayerCoordinatesCompare({ selected, onClear }: Props) {
  if (selected.length === 0) {
    return (
      <div className="lichtenberg-layout-debug__compare lichtenberg-layout-debug__compare--empty">
        <p>
          Ebene in der Liste oder auf der Karte wählen. Strg/Cmd + Klick für
          Mehrfachauswahl zum Vergleichen.
        </p>
      </div>
    );
  }

  const first = selected[0];
  const ref = first;

  return (
    <div className="lichtenberg-layout-debug__compare">
      <div className="lichtenberg-layout-debug__compare-head">
        <h2 className="lichtenberg-layout-debug__compare-title">
          Koordinaten ({selected.length})
        </h2>
        <button
          type="button"
          className="lichtenberg-layout-debug__stack-toggle"
          onClick={onClear}
        >
          Auswahl löschen
        </button>
      </div>
      <div className="lichtenberg-layout-debug__compare-scroll">
        <table className="lichtenberg-layout-debug__compare-table">
          <thead>
            <tr>
              <th scope="col">Ebene</th>
              <th scope="col">x</th>
              <th scope="col">y</th>
              <th scope="col">Breite</th>
              <th scope="col">Höhe</th>
              <th scope="col">rechts</th>
              <th scope="col">unten</th>
            </tr>
          </thead>
          <tbody>
            {selected.map((layer) => {
              const right = layer.x + layer.width;
              const bottom = layer.y + layer.height;
              return (
                <tr key={layer.key}>
                  <td className="lichtenberg-layout-debug__compare-name">
                    <span className="lichtenberg-layout-debug__compare-label">
                      {layer.label}
                    </span>
                    <span className="lichtenberg-layout-debug__compare-source">
                      {layer.configSource}
                    </span>
                    {layer.usedConfigDefaults ? (
                      <span className="lichtenberg-layout-debug__compare-warn">
                        Defaults (fehlende position/size)
                      </span>
                    ) : null}
                  </td>
                  <td>{fmt(layer.x)}</td>
                  <td>{fmt(layer.y)}</td>
                  <td>{fmt(layer.width)}</td>
                  <td>{fmt(layer.height)}</td>
                  <td>{fmt(right)}</td>
                  <td>{fmt(bottom)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {selected.length > 1 ? (
          <table className="lichtenberg-layout-debug__compare-table lichtenberg-layout-debug__compare-table--delta">
            <caption className="lichtenberg-layout-debug__compare-caption">
              Differenz zur ersten Auswahl ({first.label})
            </caption>
            <thead>
              <tr>
                <th scope="col">Ebene</th>
                <th scope="col">Δx</th>
                <th scope="col">Δy</th>
                <th scope="col">Δ Breite</th>
                <th scope="col">Δ Höhe</th>
                <th scope="col">Δ Mitte x</th>
                <th scope="col">Δ Mitte y</th>
              </tr>
            </thead>
            <tbody>
              {selected.slice(1).map((layer) => {
                const cx = layer.x + layer.width / 2;
                const cy = layer.y + layer.height / 2;
                const rcx = ref.x + ref.width / 2;
                const rcy = ref.y + ref.height / 2;
                return (
                  <tr key={`delta-${layer.key}`}>
                    <td className="lichtenberg-layout-debug__compare-name">
                      {layer.label}
                    </td>
                    <td>{fmt(layer.x - ref.x)}</td>
                    <td>{fmt(layer.y - ref.y)}</td>
                    <td>{fmt(layer.width - ref.width)}</td>
                    <td>{fmt(layer.height - ref.height)}</td>
                    <td>{fmt(cx - rcx)}</td>
                    <td>{fmt(cy - rcy)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
        {selected.some((l) => l.gameUsageNote) ? (
          <ul className="lichtenberg-layout-debug__compare-notes">
            {selected
              .filter((l) => l.gameUsageNote)
              .map((l) => (
                <li key={`note-${l.key}`}>
                  <strong>{l.label}:</strong> {l.gameUsageNote}
                </li>
              ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
