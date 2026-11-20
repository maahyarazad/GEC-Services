import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Box, TextField } from "@mui/material";
import { GEC } from "../PartnerOnboarding/PartnerOnboardingStyles";

const OtpInput = forwardRef(({ length = 5, onChange, onComplete, useGECStyle = false }, ref) => {
    const [otp, setOtp] = useState(new Array(length).fill(""));
    const inputsRef = useRef([]);
    const completedRef = useRef(false);

// Fill the boxes from startIndex with the digits of a typed, autofilled or pasted value.
    const fillFrom = (startIndex, rawValue) => {
        const digits = rawValue.replace(/[^0-9]/g, "");
        if (!digits) return;

        const newOtp = [...otp];
        let last = startIndex;
        for (let i = 0; i < digits.length && startIndex + i < length; i++) {
            newOtp[startIndex + i] = digits[i];
            last = startIndex + i;
        }
        setOtp(newOtp);
        onChange?.(newOtp.join(""));
        inputsRef.current[Math.min(last + 1, length - 1)]?.focus();
    };

    const handleChange = (value, index) => {
        // Typing over a filled box gives two characters: keep the new one.
        // Three or more (autofill) spread over the next boxes.
        fillFrom(index, value.length === 2 ? value.slice(-1) : value);
    };

    const handlePaste = (e, index) => {
        e.preventDefault();
        // A full code always fills from the first box; a short paste starts at the clicked box.
        const text = e.clipboardData.getData("text");
        const digits = text.replace(/[^0-9]/g, "");
        fillFrom(digits.length >= length ? 0 : index, text);
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
        focus: () => {
            const first = inputsRef.current[0];
            if (!first) return;
            first.focus({ preventScroll: true });
            first.scrollIntoView({ behavior: "smooth", block: "center" });
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

         // ── Focused — driven by real DOM focus, not MUI class ─────
"&:focus-within .MuiOutlinedInput-notchedOutline": {
    borderColor: `${GEC.gold} !important`,
    borderWidth: "1px !important",
},
"&:focus-within": {
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
                    onPaste={(e) => handlePaste(e, idx)}
                    inputRef={(el) => (inputsRef.current[idx] = el)}
                    inputProps={{
                        maxLength: length,
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