import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PostHogProvider } from "@posthog/react";

import "./index.css";
import App from "./App";

import { useAuthStore } from "./store/authStore";

import posthog, {
    initPostHog,
} from "./analytics/posthog";

/*
 * Load saved login before app renders.
 */
useAuthStore
    .getState()
    .loadAuth();

/*
 * Initialize PostHog before wrapping app.
 */
initPostHog();

createRoot(
    document.getElementById("root")!,
).render(
    <StrictMode>
        <PostHogProvider client={posthog}>
            <App />
        </PostHogProvider>
    </StrictMode>,
);