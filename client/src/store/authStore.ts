import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { User } from "../types/auth";

import type {
    SubscriptionInfo,
} from "../types/subscription";

import {
    disconnectSocket,
} from "../socket/socket";

interface AuthState {
    user: User | null;

    token: string | null;

    subscription:
        SubscriptionInfo | null;

    isAuthenticated:
        boolean;

    // ==================================================
    // SET AUTH
    // ==================================================

    setAuth: (
        token: string,
        user: User,
        subscription?:
            SubscriptionInfo | null,
    ) => void;

    // ==================================================
    // UPDATE SUBSCRIPTION
    // ==================================================

    setSubscription: (
        subscription:
            SubscriptionInfo | null,
    ) => void;

    // ==================================================
    // LOGOUT
    // ==================================================

    logout: () => void;

    // ==================================================
    // RESTORE AUTH
    // ==================================================

    loadAuth: () => void;
}

export const useAuthStore =
    create<AuthState>()(
        persist(
            (set) => ({

                // ==================================================
                // DEFAULT STATE
                // ==================================================

                user: null,

                token: null,

                subscription: null,

                isAuthenticated:
                    false,

                // ==================================================
                // LOGIN
                // ==================================================

                setAuth: (
                    token: string,
                    user: User,
                    subscription:
                        SubscriptionInfo | null =
                        null,
                ) => {

                    console.log(
                        "================================",
                    );

                    console.log(
                        "ZUSTAND LOGIN",
                    );

                    console.log(
                        "TOKEN EXISTS:",
                        !!token,
                    );

                    console.log(
                        "USER:",
                        user,
                    );

                    console.log(
                        "ROLE:",
                        user.role,
                    );

                    console.log(
                        "SUBSCRIPTION:",
                        subscription,
                    );

                    console.log(
                        "================================",
                    );

                    // ==============================================
                    // STORE TOKEN
                    // ==============================================

                    localStorage.setItem(
                        "token",
                        token,
                    );

                    // ==============================================
                    // STORE USER
                    // ==============================================

                    localStorage.setItem(
                        "user",
                        JSON.stringify(
                            user,
                        ),
                    );

                    // ==============================================
                    // STORE SUBSCRIPTION
                    // ==============================================

                    if (subscription) {

                        localStorage.setItem(
                            "subscription",
                            JSON.stringify(
                                subscription,
                            ),
                        );

                    } else {

                        localStorage.removeItem(
                            "subscription",
                        );
                    }

                    // ==============================================
                    // UPDATE ZUSTAND
                    // ==============================================

                    set({
                        token,
                        user,
                        subscription,
                        isAuthenticated:
                            true,
                    });
                },

                // ==================================================
                // UPDATE SUBSCRIPTION
                //
                // Useful after:
                //
                // - refresh subscription
                // - plan change
                // - renewal
                // - trial status update
                // ==================================================

                setSubscription: (
                    subscription:
                        SubscriptionInfo | null,
                ) => {

                    console.log(
                        "SUBSCRIPTION UPDATED:",
                        subscription,
                    );

                    if (subscription) {

                        localStorage.setItem(
                            "subscription",
                            JSON.stringify(
                                subscription,
                            ),
                        );

                    } else {

                        localStorage.removeItem(
                            "subscription",
                        );
                    }

                    set({
                        subscription,
                    });
                },

                // ==================================================
                // LOGOUT
                // ==================================================

                logout: () => {

                    console.log(
                        "🔴 LOGGING OUT",
                    );

                    // ==============================================
                    // DISCONNECT SOCKET
                    // ==============================================

                    disconnectSocket();

                    // ==============================================
                    // REMOVE TOKEN
                    // ==============================================

                    localStorage.removeItem(
                        "token",
                    );

                    // ==============================================
                    // REMOVE USER
                    // ==============================================

                    localStorage.removeItem(
                        "user",
                    );

                    // ==============================================
                    // REMOVE SUBSCRIPTION
                    // ==============================================

                    localStorage.removeItem(
                        "subscription",
                    );

                    // ==============================================
                    // RESET STORE
                    // ==============================================

                    set({
                        token: null,

                        user: null,

                        subscription: null,

                        isAuthenticated:
                            false,
                    });

                    console.log(
                        "✅ LOGOUT COMPLETE",
                    );
                },

                // ==================================================
                // MANUAL AUTH RESTORE
                //
                // Kept for compatibility.
                // ==================================================

                loadAuth: () => {

                    // ==============================================
                    // GET TOKEN
                    // ==============================================

                    const token =
                        localStorage.getItem(
                            "token",
                        );

                    // ==============================================
                    // GET USER
                    // ==============================================

                    const storedUser =
                        localStorage.getItem(
                            "user",
                        );

                    // ==============================================
                    // GET SUBSCRIPTION
                    // ==============================================

                    const storedSubscription =
                        localStorage.getItem(
                            "subscription",
                        );

                    // ==============================================
                    // NO AUTH
                    // ==============================================

                    if (
                        !token ||
                        !storedUser
                    ) {

                        set({
                            token: null,

                            user: null,

                            subscription: null,

                            isAuthenticated:
                                false,
                        });

                        return;
                    }

                    try {

                        // ==========================================
                        // PARSE USER
                        // ==========================================

                        const user: User =
                            JSON.parse(
                                storedUser,
                            );

                        if (
                            !user ||
                            !user.role
                        ) {

                            throw new Error(
                                "Invalid stored user",
                            );
                        }

                        // ==========================================
                        // PARSE SUBSCRIPTION
                        // ==========================================

                        let subscription:
                            SubscriptionInfo | null =
                            null;

                        if (
                            storedSubscription
                        ) {

                            subscription =
                                JSON.parse(
                                    storedSubscription,
                                );
                        }

                        // ==========================================
                        // RESTORE STORE
                        // ==========================================

                        set({
                            token,

                            user,

                            subscription,

                            isAuthenticated:
                                true,
                        });

                    } catch (error) {

                        console.error(
                            "AUTH RESTORE ERROR:",
                            error,
                        );

                        // ==========================================
                        // CLEAR INVALID AUTH
                        // ==========================================

                        localStorage.removeItem(
                            "token",
                        );

                        localStorage.removeItem(
                            "user",
                        );

                        localStorage.removeItem(
                            "subscription",
                        );

                        set({
                            token: null,

                            user: null,

                            subscription: null,

                            isAuthenticated:
                                false,
                        });
                    }
                },
            }),

            {
                // ==================================================
                // ZUSTAND STORAGE KEY
                // ==================================================

                name:
                    "nexturn-auth",

                // ==================================================
                // PERSISTED STATE
                // ==================================================

                partialize: (
                    state,
                ) => ({
                    user:
                        state.user,

                    token:
                        state.token,

                    subscription:
                        state.subscription,

                    isAuthenticated:
                        state.isAuthenticated,
                }),

                // ==================================================
                // HYDRATION
                // ==================================================

                onRehydrateStorage:
                    () => {

                        console.log(
                            "🔄 AUTH HYDRATION START",
                        );

                        return (
                            state,
                            error,
                        ) => {

                            if (error) {

                                console.error(
                                    "❌ AUTH HYDRATION ERROR:",
                                    error,
                                );

                                return;
                            }

                            console.log(
                                "✅ AUTH HYDRATION COMPLETE",
                            );

                            console.log(
                                "USER:",
                                state?.user,
                            );

                            console.log(
                                "ROLE:",
                                state?.user
                                    ?.role,
                            );

                            console.log(
                                "AUTH:",
                                state?.isAuthenticated,
                            );

                            console.log(
                                "SUBSCRIPTION:",
                                state?.subscription,
                            );
                        };
                    },
            },
        ),
    );