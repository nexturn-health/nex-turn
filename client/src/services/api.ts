import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL,

  headers: {
    "Content-Type":
      "application/json",
  },

  timeout:
    10000,
});

// ============================================================
// REQUEST INTERCEPTOR
// ADD JWT TOKEN
// ============================================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "token",
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(
      error,
    );
  },
);

// ============================================================
// RESPONSE INTERCEPTOR
// GLOBAL AUTH + SUBSCRIPTION ERRORS
// ============================================================

api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    const status =
      error?.response?.status;

    const code =
      error?.response?.data
        ?.code;

    // ========================================================
    // 401 - UNAUTHORIZED
    // ========================================================

    if (status === 401) {
      console.log(
        "401 UNAUTHORIZED - CLEARING AUTH",
      );

      localStorage.removeItem(
        "token",
      );

      localStorage.removeItem(
        "user",
      );

      localStorage.removeItem(
        "subscription",
      );

      window.dispatchEvent(
        new CustomEvent(
          "auth-unauthorized",
        ),
      );
    }

    // ========================================================
    // TRIAL EXPIRED
    // ========================================================

    if (
      code ===
      "TRIAL_EXPIRED"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "subscription-expired",
          {
            detail: {
              code:
                "TRIAL_EXPIRED",

              message:
                error?.response
                  ?.data?.message,
            },
          },
        ),
      );
    }

    // ========================================================
    // SUBSCRIPTION EXPIRED
    // ========================================================

    if (
      code ===
      "SUBSCRIPTION_EXPIRED"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "subscription-expired",
          {
            detail: {
              code:
                "SUBSCRIPTION_EXPIRED",

              message:
                error?.response
                  ?.data?.message,
            },
          },
        ),
      );
    }

    // ========================================================
    // PREMIUM REQUIRED
    // ========================================================

    if (
      code ===
      "PREMIUM_REQUIRED"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "premium-required",
          {
            detail: {
              code:
                "PREMIUM_REQUIRED",

              message:
                error?.response
                  ?.data?.message,
            },
          },
        ),
      );
    }

    // ========================================================
    // HOSPITAL INACTIVE
    // ========================================================

    if (
      code ===
      "HOSPITAL_INACTIVE"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          "hospital-inactive",
          {
            detail: {
              code:
                "HOSPITAL_INACTIVE",

              message:
                error?.response
                  ?.data?.message,
            },
          },
        ),
      );
    }

    return Promise.reject(
      error,
    );
  },
);

export default api;