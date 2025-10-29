import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { TemplateForm } from "./components/templates/TemplateForm";
import { Admin } from "./components/admin/Admin";
import { Login } from "./components/utils/Login";
import { GuestRegistration } from "./components/guestRegistration/GuestRegistration";
import 'nprogress/nprogress.css';
import NProgress from 'nprogress';
import { useEffect, useRef } from "react";
import { SuccessTemplatePage } from "./components/templates/SuccessTemplatePage";
import NotFound from "./components/pages/NotFound";
import { WebSocketProvider } from "./components/admin/WebSocketContext";
import { Buffer } from 'buffer';
window.Buffer = Buffer;
import { SnackbarProvider } from "./components/Providers/Snackbar";
import { AlertDialogProvider } from "./components/Providers/AlertProvider";
import { SlideModalProvider } from "./components/Providers/SlideModalProvider";
import { PurchaseMemberShip } from "./components/pages/PurchaseMemberShip";



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
        <Route path="/registration/:event" element={<TemplateForm />} />
        <Route path="/registration/:event/success" element={<SuccessTemplatePage />} />
        <Route path="/guest-registration/:eventSlug" element={<GuestRegistration />} />
        <Route path="/purchase-membership" element={<PurchaseMemberShip />} />
        <Route
          path="/admin"
          element={
            <WebSocketProvider>
              <Admin />
            </WebSocketProvider>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  useEffect(() => {
    const setVhVar = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    // Run at start
    setVhVar();

    // Update on resize / orientation change
    window.addEventListener("resize", setVhVar);

    return () => {
      window.removeEventListener("resize", setVhVar);
    };

  }, []);
  return (
    <BrowserRouter>
      <SnackbarProvider>
        <AlertDialogProvider>
          <SlideModalProvider>

            <AppRoutes />
          </SlideModalProvider>
        </AlertDialogProvider>
      </SnackbarProvider>
    </BrowserRouter>
  );
}

export default App;
