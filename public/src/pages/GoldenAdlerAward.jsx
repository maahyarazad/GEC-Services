import "./GolderAdlerAward.css";
import "../assets/fonts.css";
import PartnersCarousel from "../components/PartnersCarousel";
import HeroSection from "../components/HeroSection";
import HistorySection from "../components/HistorySection";
import { useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AwardRequest from "../components/AwardRequest";
import Footer from "../components/Footer";
import GECCarousel from "../components/GECCarousel";

const GolderAdlerAward = () => {
  useEffect(() => {
    document.title = "Golden Adler Award";
  }, []);

  return (
    <div className="golden-adler-award">
      <HeroSection />
      <AwardRequest />

      <GECCarousel />
      <HistorySection />

      <Footer />
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
      />
    </div>
  );
};

export default GolderAdlerAward;
