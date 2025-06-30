import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";

const OtpInput = forwardRef(({ length = 5, onChange, onComplete }, ref) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputsRef = useRef([]);
  const completedRef = useRef(false);

  const handleChange = (element, index) => {
    const value = element.value.replace(/[^0-9]/g, "");
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    onChange?.(newOtp.join(""));

    if (value && index < length - 1) {
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

  // Expose `clear` function to parent via ref
  useImperativeHandle(ref, () => ({
    clear: () => {
      const cleared = new Array(length).fill("");
      setOtp(cleared);
      completedRef.current = false;
      onChange?.("");
      inputsRef.current[0]?.focus();
    },
  }));

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {otp.map((digit, idx) => (
        <input
          key={idx}
          type="text"
          maxLength="1"
          value={digit}
          ref={(el) => (inputsRef.current[idx] = el)}
          onChange={(e) => handleChange(e.target, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          className="otp-box"
          style={{
            width: "2.5em",
            height: "2.5em",
            fontSize: "1.5em",
            textAlign: "center",
          }}
        />
      ))}
    </div>
  );
});

export default OtpInput;
