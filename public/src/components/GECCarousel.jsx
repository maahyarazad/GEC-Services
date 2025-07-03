import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import React, { useEffect, useRef, useState } from "react";
import slider1 from "../assets/media/slider-1.jpg";
import slider2 from "../assets/media/slider-2.jpg";
import slider3 from "../assets/media/slider-3.jpeg";
import slider4 from "../assets/media/slider-4.jpeg";
import slider5 from "../assets/media/slider-5.jpeg";

const GECCarousel = () => {
  const containerRef = useRef(null);
  const [isContainerVisible, setIsContainerVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsContainerVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const settings = {
    className: "center",
    centerMode: true,

    // Drag & swipe
    draggable: true,
    swipe: true,
    touchMove: true,
    swipeToSlide: true,
    swipeThreshold: 10,
    touchThreshold: 10,

    // Pagination & arrows
    dots: false, // remove the duplicate
    arrows: true,
    infinite: true,

    // Animation & autoplay (use reasonable values)
    speed: 500, // 500 ms per slide transition
    autoplay: true,
    autoplaySpeed: 3000, // 3 seconds between auto-advances
    cssEase: "linear",

    slidesToShow: 1,
    slidesToScroll: 1,

    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 1 } },
      { breakpoint: 800, settings: { slidesToShow: 1 } },
      { breakpoint: 600, settings: { slidesToShow: 1 } },
      { breakpoint: 500, settings: { slidesToShow: 1 } },
    ],
  };

  const images = [slider1, slider2, slider3, slider4, slider5];

  return (
    <section className="py-5 mb-5 custom-bg" id="gec-section">
      <div
        ref={containerRef}
        className={`container ${
          isContainerVisible ? "slide-in-y" : "slide-out-y"
        }`}
      >
        <h1 className="text-center golden-text pb-5">
          Moments from the German Emirates Club
        </h1>
        <Slider {...settings} className="gec-slider">
          {images.map((src, index) => (
            <div key={index} className="slide-item">
              <img src={src} alt="client logo" className="client-img" />
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
};

export default GECCarousel;
