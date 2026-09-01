import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Add JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    console.log("TOKEN BEING SENT:", token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle common API errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.log("401 UNAUTHORIZED - CLEARING AUTH");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Don't redirect here yet.
      // We'll handle authentication with ProtectedRoute.
    }

    return Promise.reject(error);
  },
);

export default api;