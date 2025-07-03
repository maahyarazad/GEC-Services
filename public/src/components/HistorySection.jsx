import React, { useEffect, useRef, useState } from "react";

const ShortHistory = () => {
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const [isContainerVisible, setIsContainerVisible] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

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
        });
      },
      { threshold: 0.1 }
    );

    const targets = [containerRef.current, headerRef.current];

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
    <section id="short-history" className="section">
      <div className="container">
        <div className="row">
          <div
            ref={containerRef}
            className={`col-12 col-lg-12 p-5 ${
              isContainerVisible ? "slide-in-x" : "slide-out-x"
            }`}
          >
            <h2 className="golden-text pb-2">
              The German Emirates Club History
            </h2>
            <p
              className={`custom-header pb-2  ${
                isHeaderVisible ? "slide-in-x" : "slide-out-x"
              }`}
              ref={headerRef}
            >
              <em>
                The German Emirates Club was founded in 2006 to provide a
                platform for the whole German-speaking community within the UAE.
                Membership is exclusive and only upon invitation. The Club
                offers special services which provide members with online
                information in German covering all social and business affairs.
                <br />
                <br />
                In addition to the German Emirates Club, the UAE also has a rich
                history of interactions with Germany, dating back to the early
                20th century when German explorer Hermann Burchardt visited the
                British Trucial States. Formal diplomatic relations were
                established in 1972, and the UAE opened an embassy in Bonn in
                1976. The two countries have since fostered a strategic
                partnership, with joint initiatives in areas like energy,
                academia, and trade.
              </em>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShortHistory;
