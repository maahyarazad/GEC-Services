import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

const AlertDialogContext = createContext(null);

export const AlertDialogProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const [actionTitle, setActionTitle] = useState("Confirm");
  const [btnStyle, setBtnStyle] = useState({
    text: "Proceed",
    color: "primary",
  });

  const onProceedRef = useRef(null);
  const onCancelRef = useRef(null);

  const openDialog = useCallback(
    (msg, title, style, onProceed, onCancel) => {
      setMessage(msg);
      setActionTitle(title || "Confirm");
      setBtnStyle({
        text: style?.text || "Proceed",
        color: style?.color || "primary",
      });

      onProceedRef.current = onProceed;
      onCancelRef.current = onCancel;
      setOpen(true);
    },
    []
  );

  const handleClose = () => {
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
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {actionTitle}
        </DialogTitle>

        <DialogContent>
          {typeof message === "string" ? (
            <DialogContentText id="alert-dialog-description">
              {message}
            </DialogContentText>
          ) : (
            message
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleClose}
            size="small"
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            onClick={handleProceed}
            size="small"
            variant="contained"
            color={btnStyle.color}
            sx={{ textTransform: "none" }}
          >
            {btnStyle.text}
          </Button>
        </DialogActions>
      </Dialog>
    </AlertDialogContext.Provider>
  );
};

// Hook
export const useAlertDialog = () => {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error(
      "useAlertDialog must be used within an AlertDialogProvider"
    );
  }
  return context;
};
