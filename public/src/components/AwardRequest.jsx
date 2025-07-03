import React, { useEffect, useRef, useState } from "react";
import AwardRegistration from "./AwardRegistrationForm";

const AwardRequest = () => {
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const submitRef = useRef(null);
  const [isContainerVisible, setIsContainerVisible] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [isSubmitVisible, setIsSubmitVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === containerRef.current) {
            setIsContainerVisible(entry.isIntersecting);
          }
          if (entry.target === headerRef.current) {
            setIsHeaderVisible(entry.isIntersecting);
          }
          if (entry.target === submitRef.current) {
            setIsSubmitVisible(entry.isIntersecting);
          }
        });
      },
      { threshold: 0.1 }
    );

    const targets = [
      containerRef.current,
      headerRef.current,
      submitRef.current,
    ];

    targets.forEach((target) => {
      if (target) observer.observe(target);
    });

    return () => {
      targets.forEach((target) => {
        if (target) observer.unobserve(target);
      });
    };
  }, []);

  return (
    <section id="award-request" className="section">
      <div className="container">
        <div className="row">
          <div
            id="awardsrequest"
            ref={containerRef}
            className={`col-12 col-lg-12 p-5 ${
              isContainerVisible ? "slide-in-x" : "slide-out-x"
            }`}
          >
            <h1 className="golden-text pb-2">
              Apply for the Golden Adler Award
            </h1>
            <div className="row second-section-row">
              <div>
                <img
                  src="../src/assets/media/bbreakfast.jpg"
                  alt="Placeholder"
                  width={200}
                  height={300}
                />
              </div>
              <div>
                <h3
                  className={`custom-header pb-2 font-l ${
                    isHeaderVisible ? "slide-in-x" : "slide-out-x"
                  }`}
                  ref={headerRef}
                >
                  If you are a company from Germany, Austria, or Switzerland
                  with offices in the United Arab Emirates and believe you have
                  exceptional products, services, or achievements to showcase,
                  we invite you to bring them to our attention. The German
                  Emirates Club will evaluate, announce, and award your
                  achievements during the German Forum 2025.
                  <br></br>
                  <br></br>
                  This prestigious event will be presented by the German
                  Emirates Club during the German Forum 2025 on 17th June 2025
                  in Dubai.
                </h3>

                <div
                  ref={submitRef}
                  className={`${
                    isSubmitVisible
                      ? "slide-in-x-reverse"
                      : "slide-out-x-reverse"
                  }`}
                >
                  <AwardRegistration />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AwardRequest;
