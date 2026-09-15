import React, { useMemo } from "react";
import {
    Box,
    Typography,Chip
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

// Hoisted out of the component: this object never depends on props, so
// re-creating it on every render only produced a new `sx` identity for MUI to diff.
const successAlertSx = {
    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    border: "1px solid rgba(34, 197, 94, 0.3)",
    borderLeft: "4px solid #16a34a",
    color: "#14532d",
    fontWeight: 500,
    borderRadius: "10px",
    boxShadow: "0 4px 20px rgba(34, 197, 94, 0.12), 0 1px 4px rgba(0,0,0,0.06)",
    padding: "10px 16px",
    "& .MuiAlert-icon": { color: "#16a34a", fontSize: "20px" },
    "& .MuiAlert-message": { padding: 0, fontSize: "0.875rem", lineHeight: 1.5 },
    "& .MuiAlert-action": {
        paddingTop: 0,
        "& .MuiIconButton-root": { color: "#15803d", opacity: 0.7 },
    },
};

// Takes the two fields it actually reads instead of the whole wizardState object.
// wizardState gets a new identity on every setWiz(), which would defeat React.memo.
function ResultPanel({ rowCount, faultyRecords }) {

    const faultyCount = faultyRecords?.length ?? 0;
    const validCount = rowCount ?? 0;

    const metrics = useMemo(() => [
        { label: "Total rows", value: validCount + faultyCount, color: "text.primary" },
        { label: "Valid rows", value: validCount, color: "success.main" },
        { label: "Faulty rows", value: faultyCount, color: faultyCount ? "warning.main" : "success.main" },
    ], [validCount, faultyCount]);

    return (
  <Box sx={{ maxHeight: 180, overflowY: "auto", py: 1 }}>

    {/* ── Summary metrics ── */}
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.25, mb: 2 }}>
      {metrics.map(({ label, value, color }) => (
        <Box key={label} sx={{ bgcolor: "action.hover", borderRadius: 1, p: 1.25 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={500} color={color}>
            {value}
          </Typography>
        </Box>
      ))}
    </Box>

    {/* ── No faults ── */}
    {!faultyCount && (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, ...successAlertSx }}>
        <CheckCircleOutlineIcon color="success" fontSize="small" />
        <Typography variant="body2" color="success.dark">
          All rows passed validation. Ready to import.
        </Typography>
      </Box>
    )}

    {/* ── Faulty records ── */}
    {!!faultyCount && (
      <>
        <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Faulty records
        </Typography>

        {faultyRecords.map((rec) => {
          const displayName =
            [rec.data["First Name"], rec.data["Last Name"]].filter(Boolean).join(" ") ||
            rec.data["Company Email"] ||
            `Row ${rec.rowNumber}`;

          return (
            <Box
              key={rec.rowNumber}
              sx={{ border: "0.5px solid", borderColor: "divider", borderRadius: 1, mb: 1, overflow: "hidden" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1, bgcolor: "action.hover", borderBottom: "0.5px solid", borderColor: "divider" }}>
                <Typography variant="body2" fontWeight={500}>
                  Row {rec.rowNumber} · {displayName}
                </Typography>
                <Chip
                  label={`${rec.reasons.length} issue${rec.reasons.length > 1 ? "s" : ""}`}
                  size="small"
                  color="warning"
                  sx={{ height: 20, fontSize: 11 }}
                />
              </Box>

              <Box component="ul" sx={{ m: 0, py: 1, px: 1.5, listStyle: "none" }}>
                {rec.reasons.map((reason, i) => (
                  <Box component="li" key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, py: 0.25 }}>
                    <Box sx={{ mt: "6px", width: 5, height: 5, minWidth: 5, borderRadius: "50%", bgcolor: "warning.main" }} />
                    <Typography variant="caption" color="text.secondary">{reason}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </>
    )}

  </Box>
)

}

export default React.memo(ResultPanel);
