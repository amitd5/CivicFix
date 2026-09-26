import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();

      formData.append("email", email.trim());

      const response = await axios.post(
        `${API_URL}/auth/forgot-password`,
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 15000,
        }
      );

      setMessage(
        response.data?.message ||
        "If an account exists with this email, a recovery link has been sent."
      );

    } catch (err) {
      console.error("FORGOT PASSWORD ERROR:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to process your request. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

        {/* BRAND */}

        <div className="brand">

          <div className="brand-icon">
            C
          </div>

          <div>
            <h1>CivicFix</h1>

            <p>
              Smart Civic Complaint Management
            </p>
          </div>

        </div>

        {/* TITLE */}

        <h2>
          Forgot Password?
        </h2>

        <p className="subtitle">
          Enter your email and we'll send you a password recovery link.
        </p>

        {/* SUCCESS */}

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* FORM */}

        <form onSubmit={handleSubmit}>

          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Sending..."
              : "Send Recovery Link"}
          </button>

        </form>

        {/* BACK TO LOGIN */}

        <p className="auth-footer">

          Remember your password?{" "}

          <Link to="/login">
            Back to Login
          </Link>

        </p>

      </div>

    </div>
  );
}

export default ForgotPassword;