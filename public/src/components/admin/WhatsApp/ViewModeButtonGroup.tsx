// ViewModeButtonGroup.tsx

type ViewMode = "default" | "blacklist" | "corrupted" | "guest_list";

interface ViewModeButtonGroupProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const buttons: { label: string; mode: ViewMode }[] = [
  { label: "Main Contact Book", mode: "default" },
  { label: "Blacklist",         mode: "blacklist" },
  { label: "Corrupted Contacts",mode: "corrupted" },
  { label: "Guest List",        mode: "guest_list" },
];



export default function ViewModeButtonGroup({ viewMode, setViewMode }: ViewModeButtonGroupProps) {
  return (
    <div className="btn-group" role="group">
      {buttons.map(({ label, mode }) => (
        <button
          key={mode}
          type="button"
          style={{ height: 32, fontSize: '0.8rem' }}
          className={`btn ${viewMode === mode ? "btn-secondary active" : "btn-outline-secondary"}`}
          onClick={() => setViewMode(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}