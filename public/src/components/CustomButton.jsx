import React from "react";
import Button from "@mui/material/Button";

const CustomButton = ({ children, onClick, ...props }) => {
  return (
    <Button
      variant="contained"
      size="small"
      sx={{ textTransform: "none", fontFamily: "inherit" }}
      onClick={onClick}
      className="awardregistrationsubmit"
      {...props}
    >
      {children}
    </Button>
  );
};

export default CustomButton;
