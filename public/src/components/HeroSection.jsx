// src/components/HeroSection.jsx
import React from "react";
import heroVideo from "../assets/media/stars-field.webm";
import TenDayCountdown from "./TenDayCountdown";
const HeroSection = () => {
  return (
    <section className="hero-section">
      <span className="floating-header">
        <img
          alt="The Golden Adler Award"
          src="../src/assets/media/golden-adler-1.png"
        ></img>
        <h1>The Golden Adler Awards</h1>
      </span>
      <video
        playsInline
        autoPlay
        muted
        loop
        poster="../src/assets/media/field-of-stars.png"
      >
        <source src={heroVideo} type="video/webm" />
        Your browser does not support the video tag.
      </video>
      <div className="count-down">
        <TenDayCountdown />
        <a href="#awardsrequest">Apply to receive your award</a>
      </div>
      <div className="floating-logo">
        <img
          alt="German Emirates Club Logo"
          src="../src/assets/media/gec-logo-20-years.webp"
        ></img>
      </div>
    </section>
  );
};

export default HeroSection;
