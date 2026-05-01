import { useState } from "react";
export default function HoverItem({
  isSelected,
  onClick,
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  const bg = isSelected
    ? "bg-primary text-white"
    : hovered
    ? "bg-light"
    : "";

  return (
    <li
      className={`px-3 py-2 ${bg}`}
      style={{ cursor: "pointer" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {children}
    </li>
  );
}