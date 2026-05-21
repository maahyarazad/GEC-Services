// ViewModeButtonGroup.tsx

type ViewMode = "default" | "blacklist" | "corrupted";

interface ViewModeButtonGroupProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const buttons: { label: string; mode: ViewMode; shortLabel: string }[] = [
  { label: "Main Contact Book",  shortLabel: "Contacts",  mode: "default" },
  { label: "Blacklist",          shortLabel: "Blacklist", mode: "blacklist" },
  { label: "Corrupted Contacts", shortLabel: "Corrupted", mode: "corrupted" },
];

export default function ViewModeButtonGroup({ viewMode, setViewMode }: ViewModeButtonGroupProps) {
  return (
    <div
      className="btn-group flex-wrap"  // 👈 allows wrapping on small screens
      role="group"
    >
      {buttons.map(({ label, shortLabel, mode }) => (
        <button
          key={mode}
          type="button"
          className={`btn ${viewMode === mode ? "btn-secondary active" : "btn-outline-secondary"} d-flex align-items-center justify-content-center`}
          style={{ height: 32, fontSize: '0.8rem' }}
          onClick={() => setViewMode(mode)}
        >
          {/* 👇 show short label on mobile, full label on desktop */}
          <span className="d-inline d-md-none align-self-center">{shortLabel}</span>
          <span className="d-none d-md-inline align-self-center">{label}</span>
        </button>
      ))}
    </div>
  );
}