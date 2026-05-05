import {
  Box,
  Typography,
  Chip,
  Collapse,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

const TwilioCreditWarning = ({ twilioCreditLow, twilioCreditLowMessage }) => {
  return (
<Collapse in={twilioCreditLow} unmountOnExit>
  <Box
    sx={{
      width: "100%",
      height: "calc(100vh - 180px)",
      borderRadius: 1,
      overflow: "hidden",
      border: "2px solid",
      borderColor: "error.main",
      bgcolor: "#1a0a00",
      display: "flex",
      flexDirection: "column",
      animation: "pulse-border 2.5s ease-in-out infinite",
      "@keyframes pulse-border": {
        "0%, 100%": {
          boxShadow:
            "0 0 0 0 rgba(255,80,0,0.6), inset 0 0 40px rgba(255,80,0,0.05)",
        },
        "50%": {
          boxShadow:
            "0 0 0 8px rgba(255,80,0,0), inset 0 0 60px rgba(255,80,0,0.12)",
        },
      },
    }}
  >
    {/* Animated stripe top bar */}
    <Box
      sx={{
        height: 8,
        flexShrink: 0,
        background:
          "repeating-linear-gradient(90deg, #ff5000 0px, #ff5000 20px, #1a0a00 20px, #1a0a00 28px)",
        backgroundSize: "56px 100%",
        animation: "stripe-move 1s linear infinite",
        "@keyframes stripe-move": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "56px 0" },
        },
      }}
    />

    {/* Centered Content */}
    <Box
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2.25, sm: 3.5 },
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 560 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
          <Box
            sx={{
              flexShrink: 0,
              width: { xs: 42, sm: 52 },
              height: { xs: 42, sm: 52 },
              bgcolor: "rgba(255,80,0,0.15)",
              border: "1.5px solid rgba(255,80,0,0.5)",
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "icon-shake 1.4s ease-in-out infinite",
              "@keyframes icon-shake": {
                "0%, 100%": { transform: "rotate(-8deg) scale(1.1)" },
                "25%": { transform: "rotate(8deg) scale(1.15)" },
                "50%": { transform: "rotate(-4deg) scale(1.1)" },
                "75%": { transform: "rotate(4deg) scale(1.12)" },
              },
            }}
          >
            <WarningAmberRoundedIcon
              sx={{ color: "#ff5000", fontSize: { xs: 22, sm: 28 } }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 10,
                fontFamily: "monospace",
                color: "#ff5000",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                mb: 0.5,
              }}
            >
              Critical Alert · Twilio
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 18, sm: 24 },
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              Low Credit Balance
            </Typography>
          </Box>
        </Box>

        {/* Divider */}
        <Box
          sx={{
            height: 1,
            background:
              "linear-gradient(90deg, rgba(255,80,0,0.5) 0%, rgba(255,80,0,0.05) 100%)",
            mb: 2.5,
          }}
        />

        {/* Message body */}
        <Typography
          sx={{
            fontSize: { xs: 13, sm: 15 },
            color: "#ccb8a8",
            lineHeight: 1.65,
            fontWeight: 700,
            fontFamily: "monospace",
            mb: 2.5,
          }}
        >
          {twilioCreditLowMessage.moreInfo}
        </Typography>

        {/* Error code chip */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            bgcolor: "rgba(255,80,0,0.1)",
            border: "1px solid rgba(255,80,0,0.35)",
            borderRadius: 1,
            px: 1.75,
            py: 1,
            fontFamily: "monospace",
            fontSize: { xs: 11, sm: 13 },
            color: "#ff7a3d",
            letterSpacing: "0.04em",
            wordBreak: "break-all",
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 15, color: "#ff5000" }} />
          <Typography
            component="span"
            sx={{
              fontSize: 10,
              color: "#ff5000",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              mr: 0.5,
              fontFamily: "monospace",
            }}
          >
            Code
          </Typography>
          {twilioCreditLowMessage.code}
        </Box>
      </Box>
    </Box>

    {/* Animated stripe bottom bar */}
    <Box
      sx={{
        height: 8,
        flexShrink: 0,
        background:
          "repeating-linear-gradient(90deg, #ff5000 0px, #ff5000 20px, #1a0a00 20px, #1a0a00 28px)",
        backgroundSize: "56px 100%",
        animation: "stripe-move 1s linear infinite",
      }}
    />
  </Box>
</Collapse>
  );
};

export default TwilioCreditWarning;