import { useRef, useState, useEffect } from "react";

const OtpInput = ({ length = 5, onChange, onComplete }) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputsRef = useRef([]);

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
      } else if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  useEffect(() => {
    if (otp.every((digit) => digit !== "")) {
      onComplete?.(otp.join(""));
    }
  }, [otp, onComplete]);

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
};

export default OtpInput;
