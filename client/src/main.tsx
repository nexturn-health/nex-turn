import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { useAuthStore } from "./store/authStore";

useAuthStore.getState().loadAuth();

createRoot(document.getElementById("root")!).render(
<StrictMode>
    <App />
</StrictMode>
);