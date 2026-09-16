import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import PaymentCallback from "./components/PaymentCallback.jsx";
import "./styles.css";
import "./chapter4-preview.css";

/*
 * Only /payment/callback is a real route (the page Paystack
 * redirects back to). Everything else still falls through to
 * App, which keeps deciding what to show via its in-memory
 * `step` state exactly as before -- routing is additive here,
 * not a replacement for that.
 */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
