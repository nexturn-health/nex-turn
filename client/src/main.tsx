import {
    StrictMode,
} from "react";

import {
    createRoot,
} from "react-dom/client";

import {
    PostHogProvider,
} from "@posthog/react";

import {
    HelmetProvider,
} from "react-helmet-async";

import "./index.css";

import App from "./App";

import {
    useAuthStore,
} from "./store/authStore";

import posthog, {
    initPostHog,
} from "./analytics/posthog";

/*
 * Load saved authentication before rendering
 */
useAuthStore
    .getState()
    .loadAuth();

/*
 * Initialize PostHog
 */
initPostHog();

const rootElement =
    document.getElementById(
        "root",
    );

if (!rootElement) {
    throw new Error(
        "Root element not found",
    );
}

createRoot(
    rootElement,
).render(
    <StrictMode>
        <HelmetProvider>
            <PostHogProvider
                client={posthog}
            >
                <App />
            </PostHogProvider>
        </HelmetProvider>
    </StrictMode>,
);