import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Box, TextField } from "@mui/material";
import { GEC } from "../PartnerOnboarding/PartnerOnboardingStyles";

const OtpInput = forwardRef(({ length = 5, onChange, onComplete, useGECStyle = false }, ref) => {
    const [otp, setOtp] = useState(new Array(length).fill(""));
    const inputsRef = useRef([]);
    const completedRef = useRef(false);

    const handleChange = (value, index) => {
        const sanitized = value.replace(/[^0-9]/g, "");
        if (!sanitized) return;

        const newOtp = [...otp];
        newOtp[index] = sanitized;
        setOtp(newOtp);
        onChange?.(newOtp.join(""));

        if (index < length - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace") {
            const newOtp = [...otp];
            if (otp[index]) {
                newOtp[index] = "";
                setOtp(newOtp);
                onChange?.(newOtp.join(""));
                completedRef.current = false;
            } else if (index > 0) {
                inputsRef.current[index - 1]?.focus();
            }
        }
    };

    useEffect(() => {
        if (otp.every((digit) => digit !== "") && !completedRef.current) {
            completedRef.current = true;
            onComplete?.(otp.join(""));
        }
    }, [otp, onComplete]);

    useImperativeHandle(ref, () => ({
        clear: () => {
            const cleared = new Array(length).fill("");
            setOtp(cleared);
            completedRef.current = false;
            onChange?.("");
            inputsRef.current[0]?.focus();
        },
        blurAll: () => {
            inputsRef.current.forEach((input) => input?.blur());
        },
    }));

    const defaultSx = {
        width: 48,
        "& .MuiOutlinedInput-notchedOutline": {
            bottom: 2,
            top: -14,
        },
        "& .MuiOutlinedInput-root": {
            height: 48,
            fontSize: "1.3rem",
            fontWeight: 600,
            borderRadius: 1.5,
            "& input": {
                height: "100%",
                boxSizing: "border-box",
                p: 0,
                textAlign: "center",
            },
        },
    };

    const gecSx = {
        width: 48,

        "& .MuiOutlinedInput-notchedOutline": {
            bottom: 2,
            top: -14,
            borderColor: GEC.goldBorder,
        },

        "& .MuiOutlinedInput-root": {
            height: 48,
            fontSize: "1.3rem",
            fontWeight: 700,
            borderRadius: 1.5,
            background: "#faf8f3",
            color: GEC.textPrimary,
            transition: "box-shadow 0.2s ease",

            "& input": {
                height: "100%",
                boxSizing: "border-box",
                p: 0,
                textAlign: "center",
                caretColor: GEC.gold,
            },

            // ── Hover ──────────────────────────────────────────────────
            "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: GEC.gold,
            },

            // ── Focused — kill blue, apply gold ───────────────────────
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: `${GEC.gold} !important`,
                borderWidth: "1px !important",
            },
            "&.Mui-focused": {
                boxShadow: `0 0 0 3px ${GEC.goldMuted}`,
                borderRadius: 1.5,
            },
        },
    };

    return (
        <Box sx={{ display: "flex", gap: 1 }}>
            {otp.map((digit, idx) => (
                <TextField
                    key={idx}
                    value={digit}
                    onChange={(e) => handleChange(e.target.value, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    inputRef={(el) => (inputsRef.current[idx] = el)}
                    inputProps={{
                        maxLength: 1,
                        inputMode: "numeric",
                        pattern: "[0-9]*",
                    }}
                    sx={useGECStyle ? gecSx : defaultSx}
                />
            ))}
        </Box>
    );
});

export default OtpInput;