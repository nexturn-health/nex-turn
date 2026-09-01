import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { User } from "../types/auth";

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;

    setAuth: (token: string, user: User) => void;
    logout: () => void;
    loadAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({

            // ==========================================
            // INITIAL STATE
            // ==========================================

            user: null,

            token: null,

            isAuthenticated: false,


            // ==========================================
            // LOGIN
            // ==========================================

            setAuth: (
                token: string,
                user: User,
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
                    "================================",
                );


                // ------------------------------------------
                // Save token for Axios/API
                // ------------------------------------------

                localStorage.setItem(
                    "token",
                    token,
                );


                // ------------------------------------------
                // Save user
                // ------------------------------------------

                localStorage.setItem(
                    "user",
                    JSON.stringify(user),
                );


                // ------------------------------------------
                // Update Zustand
                // ------------------------------------------

                set({
                    token,
                    user,
                    isAuthenticated: true,
                });
            },


            // ==========================================
            // LOGOUT
            // ==========================================

            logout: () => {

                console.log(
                    "================================",
                );

                console.log(
                    "ZUSTAND LOGOUT",
                );

                console.log(
                    "================================",
                );


                // ------------------------------------------
                // Remove authentication
                // ------------------------------------------

                localStorage.removeItem(
                    "token",
                );

                localStorage.removeItem(
                    "user",
                );


                // ------------------------------------------
                // Clear Zustand
                // ------------------------------------------

                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                });
            },


            // ==========================================
            // RESTORE AUTH
            // ==========================================

            loadAuth: () => {

                console.log(
                    "================================",
                );

                console.log(
                    "RESTORING AUTH",
                );

                console.log(
                    "================================",
                );


                const token =
                    localStorage.getItem(
                        "token",
                    );

                const storedUser =
                    localStorage.getItem(
                        "user",
                    );


                // ------------------------------------------
                // Nothing stored
                // ------------------------------------------

                if (
                    !token ||
                    !storedUser
                ) {

                    console.log(
                        "NO AUTH FOUND",
                    );


                    set({
                        token: null,
                        user: null,
                        isAuthenticated: false,
                    });

                    return;
                }


                // ------------------------------------------
                // Restore user
                // ------------------------------------------

                try {

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


                    console.log(
                        "AUTH RESTORED",
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
                        "TOKEN EXISTS:",
                        !!token,
                    );


                    set({
                        token,
                        user,
                        isAuthenticated: true,
                    });

                } catch (error) {

                    console.error(
                        "FAILED TO RESTORE AUTH:",
                        error,
                    );


                    localStorage.removeItem(
                        "token",
                    );

                    localStorage.removeItem(
                        "user",
                    );


                    set({
                        token: null,
                        user: null,
                        isAuthenticated: false,
                    });
                }
            },
        }),

        // ==========================================
        // ZUSTAND PERSIST CONFIG
        // ==========================================

        {
            name: "nexturn-auth",

            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated:
                    state.isAuthenticated,
            }),
        },
    ),
);