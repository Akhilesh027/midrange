import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = "994920263954-rjr4mbek5rjkbip9ea8p9dtpmp3bb8uc.apps.googleusercontent.com";

if (!GOOGLE_CLIENT_ID) {
  console.error("❌ Missing VITE_GOOGLE_CLIENT_ID in frontend .env file");
}

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);