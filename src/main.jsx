import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import PaymentCallback from "./components/PaymentCallback.jsx";
import PrivacyPolicy from "./components/PrivacyPolicy.jsx";
import TermsOfService from "./components/TermsOfService.jsx";
import ResetPassword from "./components/ResetPassword.jsx";
import "./styles.css";
import "./chapter4-preview.css";

/*
 * /payment/callback, /privacy, /terms, and /reset-password are the
 * only real routes (the rest still falls through to App, which
 * keeps deciding what to show via its in-memory `step` state
 * exactly as before -- routing is additive here, not a replacement
 * for that). All four render regardless of auth state, same as App
 * does while signed out (it shows AuthScreen).
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
