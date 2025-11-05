import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Slide from "@mui/material/Slide";

const AlertDialogContext = createContext(null);

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="left" ref={ref} {...props} />;
});

export const AlertDialogProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [btnStyle, setBtnStyle] = useState({});
  const [actionTitle, setActionTitle] = useState("");
  const onProceedRef = useRef(null);
  const onCancelRef = useRef(null);

  const openDialog = useCallback((msg, title, style, onProceed, onCancel) => {
    setMessage(msg || "");
    setActionTitle(title || "Confirm");
    setBtnStyle(style || { text: "Proceed", color: "primary" });
    onProceedRef.current = onProceed;
    onCancelRef.current = onCancel;
    setOpen(true);
  }, []);

  const handleCancel = () => {
    setOpen(false);
    onCancelRef.current?.();
  };

  const handleProceed = () => {
    setOpen(false);
    onProceedRef.current?.();
  };

  return (
    <AlertDialogContext.Provider value={{ openDialog }}>
      {children}

      <Dialog
        open={open}
        onClose={handleCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        TransitionComponent={Transition}
        keepMounted
      >
        <DialogTitle id="alert-dialog-title">{actionTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" sx={{ color: "black" }}>
            {message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCancel}
            size="small"
            variant="contained"
            style={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            onClick={handleProceed}
            style={{ textTransform: "none" }}
            variant="outlined"
            color={btnStyle.color}
          >
            {btnStyle.text}
          </Button>
        </DialogActions>
      </Dialog>
    </AlertDialogContext.Provider>
  );
};

// Custom hook for easy access
export const useAlertDialog = () => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error("useAlertDialog must be used within an AlertDialogProvider");
  }
  return context;
};
