import React, { useEffect, useState, useRef } from 'react';
import { useSnackbar } from '../../Providers/Snackbar';
import { Button, CircularProgress, IconButton } from '@mui/material';
import { IoPlayCircle } from "react-icons/io5";
import { MdPauseCircleFilled } from "react-icons/md";
const QuickReply = ({ CloseModal, incoming_message }) => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Audio playback state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!message.trim()) {
        showSnackbar("Cannot send empty message", "warning");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SERVERURL}/api/whatsapp/quick-reply`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, incoming_message }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        console.error(responseData.error);
        showSnackbar(responseData.message, "error");
      } else {
        showSnackbar(responseData.message, "success");
        CloseModal();
      }
    } catch (error) {
      console.error(error);
      showSnackbar(error.message || "Unexpected error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  const hasMedia =
    Number(incoming_message?.payload_NumMedia) > 0 &&
    incoming_message?.payload_MediaUrl0;

  // Play/pause toggle for audio
  const toggleAudio = () => {
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
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Construct the backend URL to stream the media
  const audioUrl = hasMedia
    ? `${import.meta.env.VITE_SERVERURL}/api/whatsapp/download-media?mediaUrl=${encodeURIComponent(
        incoming_message.payload_MediaUrl0
      )}`
    : null;

  return (
    <form onSubmit={handleSubmit}>
      <div className="container pt-2">
        <div className="py-2 d-flex justify-content-start align-items-center">
          Reply to: <strong className='ps-2'>{incoming_message?.payload_Body}</strong>

        {hasMedia && (
          <div >
            <IconButton onClick={toggleAudio} style={{fontSize:16}}>
               
                 {isPlaying ? <div><MdPauseCircleFilled size={20}/> Pause</div> :  <div><IoPlayCircle size={20}/> Play</div>}
            </IconButton>
           
           

            {/* Hidden audio element */}
            <audio ref={audioRef} src={audioUrl} preload="auto" />
          </div>
        )}
        </div>

        <div className="row">
          <div className="col mb-3">
            <label>Your Message:</label>
            <textarea
              rows={4}
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="form-control"
            />
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={loading}
              sx={{ textTransform: 'none', width: '100%' }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default QuickReply;
