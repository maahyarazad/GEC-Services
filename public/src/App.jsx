import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { TemplateForm } from "./components/templates/TemplateForm";
import { Admin } from "./components/admin/Admin";
import { Login } from "./components/utils/Login";
import { GuestRegistration } from "./components/guestRegistration/GuestRegistration";
import 'nprogress/nprogress.css';
import NProgress from 'nprogress';
import { useEffect, useRef } from "react";

const RouteLoader = () => {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      NProgress.start();
    }

    // Let the DOM update before stopping
    requestAnimationFrame(() => {
      NProgress.done();
      prevPathRef.current = location.pathname;
    });
  }, [location]);

  return null;
};

function AppRoutes() {
  return (
    <>
      <RouteLoader />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registration/*" element={<TemplateForm />} />
        <Route path="/guest-registration/:eventSlug" element={<GuestRegistration />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
