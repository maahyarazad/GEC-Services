import React, { useRef, useState } from "react";

export default function SimpleAudioPlayer({ audioUrl }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Pause audio on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <>
      <button onClick={togglePlay} style={{ padding: "8px 16px" }}>
        {isPlaying ? "Pause Audio" : "Play Audio"}
      </button>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="auto" />
    </>
  );
}
