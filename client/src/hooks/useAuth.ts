import { useAuthStore } from "../store/authStore";

export const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    setAuth,
    logout,
    loadAuth,
  } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    setAuth,
    logout,
    loadAuth,
  };
};