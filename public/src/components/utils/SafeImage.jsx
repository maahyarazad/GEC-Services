import { useState } from "react";
import GECDefaultBackground from "../../assets/media/GECBackground.png";

export default function SafeImage({ src, alt, fallback = GECDefaultBackground, width = 200, height = 80 }) {
  const [error, setError] = useState(false);

  return (
    <img
      src={error ? fallback : src}
      alt={alt}
      onError={() => setError(true)}
      style={{ width, height, objectFit: "cover" }}
    />
  );
}
