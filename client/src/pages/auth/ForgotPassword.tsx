import { useState } from "react";
import {
  ArrowLeft,
  Mail,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { forgotPassword } from "../../services/auth.api";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState("");

  const [error, setError] = useState("");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // ==============================
    // VALIDATION
    // ==============================

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address");
      return;
    }

    try {
      setLoading(true);

      // ==============================
      // FORGOT PASSWORD API
      // ==============================

      const response = await forgotPassword(
        trimmedEmail,
      );

      if (!response.success) {
        setError(
          response.message ||
            "Unable to process your request.",
        );

        return;
      }

      // ==============================
      // SUCCESS
      // ==============================

      setSuccess(
        response.message ||
          "If an account exists with this email, password reset instructions have been sent.",
      );

      // Clear email
      setEmail("");
    } catch (error: any) {
      console.error(
        "Forgot password error:",
        error,
      );

      const message =
        error?.response?.data?.message ||
        "Unable to send password reset email. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">

      <div className="w-full max-w-md">

        {/* ============================== */}
        {/* LOGO */}
        {/* ============================== */}

        <div className="mb-8 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl shadow-lg shadow-blue-600/20">
            🏥
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            NexTurn
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Queue Management System
          </p>

        </div>

        {/* ============================== */}
        {/* CARD */}
        {/* ============================== */}

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">

          {/* BACK BUTTON */}

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={17} />

            Back to login
          </button>

          {/* ============================== */}
          {/* TITLE */}
          {/* ============================== */}

          <div className="mb-7">

            <h2 className="text-2xl font-bold text-slate-900">
              Forgot password?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your email address and we'll send
              you instructions to reset your password.
            </p>

          </div>

          {/* ============================== */}
          {/* ERROR */}
          {/* ============================== */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ============================== */}
          {/* SUCCESS */}
          {/* ============================== */}

          {success && (
            <div className="mb-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">

              <CheckCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <p className="leading-6">
                {success}
              </p>

            </div>
          )}

          {/* ============================== */}
          {/* FORM */}
          {/* ============================== */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* EMAIL */}

            <div>

              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email Address
              </label>

              <div className="relative">

                <Mail
                  size={19}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);

                    if (error) {
                      setError("");
                    }

                    if (success) {
                      setSuccess("");
                    }
                  }}
                  placeholder="admin@hospital.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

            </div>

            {/* ============================== */}
            {/* SUBMIT */}
            {/* ============================== */}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                  Sending...
                </>
              ) : (
                <>
                  <Mail size={18} />

                  Send Reset Link
                </>
              )}

            </button>

          </form>

          {/* ============================== */}
          {/* FOOTER */}
          {/* ============================== */}

          <div className="mt-6 text-center">

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Remember your password? Sign in
            </button>

          </div>

        </div>

      </div>

    </main>
  );
};

export default ForgotPassword;