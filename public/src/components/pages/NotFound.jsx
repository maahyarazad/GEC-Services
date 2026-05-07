import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  Typography,
  Paper,
} from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import WhatsAppButton from "../utils/WhatsAppButton";

// ── GEC Brand Tokens ────────────────────────────────────────────────────────
const GEC = {
  gold: "#DDAE3A",
  goldDark: "#b9962b",
  goldLight: "#f0cc6e",
  goldMuted: "rgba(221, 174, 58, 0.12)",
  goldBorder: "rgba(221, 174, 58, 0.25)",
  bg: "linear-gradient(145deg, #f7f4ee 0%, #ede8db 60%, #e4ddd0 100%)",
  cardBg: "#ffffff",
  textPrimary: "#1a1710",
  textSecondary: "#6b6347",
};

export default function NotFound() {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    document.title = "GEC - Services - 404 | Page Not Found";
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: GEC.bg,
        p: 2,
        position: "relative",
        overflow: "hidden",
        // Subtle geometric backdrop
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 15% 85%, rgba(221,174,58,0.10) 0%, transparent 40%),
            radial-gradient(circle at 85% 15%, rgba(221,174,58,0.08) 0%, transparent 40%)
          `,
          pointerEvents: "none",
        },
      }}
    >
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: "20px",
            overflow: "hidden",
            border: `1px solid ${GEC.goldBorder}`,
            boxShadow: "0 8px 40px rgba(185,150,43,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            textAlign: "center",
          }}
        >
          {/* Gold accent bar at top */}
          <Box
            sx={{
              height: 5,
              background: `linear-gradient(90deg, ${GEC.goldDark}, ${GEC.gold}, ${GEC.goldLight}, ${GEC.gold}, ${GEC.goldDark})`,
            }}
          />

          <Box sx={{ px: { xs: 3, sm: 6 }, py: 5 }}>
            {/* 404 Number */}
            <Typography
              component="div"
              sx={{
                fontSize: { xs: "90px", sm: "110px" },
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-4px",
                color: "transparent",
                backgroundImage: `linear-gradient(135deg, ${GEC.goldDark} 0%, ${GEC.gold} 50%, ${GEC.goldLight} 100%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                mb: 1,
                userSelect: "none",
                fontFamily: "'Georgia', serif",
              }}
            >
              404
            </Typography>

            <Divider
              sx={{
                my: 3,
                "&::before, &::after": {
                  borderColor: GEC.goldBorder,
                },
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: GEC.gold,
                  display: "inline-block",
                  mx: 0.5,
                }}
              />
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: GEC.goldMuted,
                  border: `1px solid ${GEC.gold}`,
                  display: "inline-block",
                  mx: 0.5,
                }}
              />
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: GEC.gold,
                  display: "inline-block",
                  mx: 0.5,
                }}
              />
            </Divider>

            {/* Heading */}
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: GEC.textPrimary,
                mb: 1,
                fontFamily: "'Georgia', serif",
                letterSpacing: "-0.3px",
              }}
            >
              Page Not Found
            </Typography>

            {/* Logo */}
            <Box
              sx={{
                my: 3,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Box
                component="img"
                alt="GEC Logo"
                src={`${import.meta.env.VITE_SERVERURL}/uploads/gec-logo.png`}
                sx={{
                  height: 80,
                  cursor: "pointer",
                  filter: "drop-shadow(0 2px 8px rgba(185,150,43,0.20))",
                  transition: "transform 0.3s ease, filter 0.3s ease",
                  "&:hover": {
                    transform: "scale(1.04)",
                    filter: "drop-shadow(0 4px 16px rgba(185,150,43,0.35))",
                  },
                }}
                onClick={() => console.log("🤖")}
              />
            </Box>

            {/* Description */}
            <Typography
              variant="body1"
              sx={{
                color: GEC.textSecondary,
                lineHeight: 1.75,
                fontSize: "15px",
                maxWidth: 380,
                mx: "auto",
                mb: 4,
              }}
            >
              The page you are looking for might have been removed, had its name
              changed, or is temporarily unavailable.
            </Typography>

            {/* CTA Button */}
            <Button
              href="/"
              variant="contained"
              startIcon={<HomeOutlinedIcon />}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              sx={{
                px: 4,
                py: 1.4,
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: 600,
                textTransform: "none",
                letterSpacing: "0.01em",
                background: hovered
                  ? `linear-gradient(135deg, ${GEC.goldDark}, #a07e22)`
                  : `linear-gradient(135deg, ${GEC.gold}, ${GEC.goldDark})`,
                color: "#fff",
                boxShadow: hovered
                  ? `0 6px 24px rgba(185,150,43,0.45)`
                  : `0 3px 12px rgba(185,150,43,0.30)`,
                transition: "all 0.25s ease",
                transform: hovered ? "translateY(-1px)" : "translateY(0)",
                "&:hover": {
                  background: `linear-gradient(135deg, ${GEC.goldDark}, #a07e22)`,
                },
              }}
            >
              Go to Homepage
            </Button>
          </Box>

          {/* Bottom accent bar */}
          <Box
            sx={{
              height: 3,
              background: `linear-gradient(90deg, transparent, ${GEC.goldBorder}, transparent)`,
            }}
          />
        </Paper>

        {/* Footer note */}
        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            mt: 3,
            color: GEC.textSecondary,
            opacity: 0.7,
            letterSpacing: "0.03em",
          }}
        >
          © GEC Services — Need help? Use the chat button below.
        </Typography>
      </Container>

      <WhatsAppButton />
    </Box>
  );
}
