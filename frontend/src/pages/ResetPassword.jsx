import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError("Invalid password recovery link.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!password) {
      setError("Please enter a new password.");
      return;
    }

    setLoading(true);

    try {
      const formData = new URLSearchParams();

      formData.append("token", token);
      formData.append("new_password", password);

      const response = await axios.post(
        `${API_URL}/auth/reset-password`,
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
          "Password reset successfully. You can now login."
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to reset password. Please try again."
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
          Reset Password
        </h2>

        <p className="subtitle">
          Enter your new password below.
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

          <label htmlFor="password">
            New Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <label htmlFor="confirmPassword">
            Confirm Password
          </label>

          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

        </form>

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

export default ResetPassword;