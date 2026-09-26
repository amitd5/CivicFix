import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL

function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const emailFromState = location.state?.email || "";

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const formData = new URLSearchParams();

      formData.append("email", email.trim());
      formData.append("otp", otp.trim());

      const response = await axios.post(
        `${API_URL}/auth/verify-email`,
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      setSuccess(
        response.data?.message ||
        "Email verified successfully."
      );

      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            email: email.trim(),
          },
        });
      }, 1200);

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setResending(true);

    try {
      const formData = new URLSearchParams();

      formData.append("email", email.trim());

      const response = await axios.post(
        `${API_URL}/auth/resend-otp`,
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      setSuccess(
        response.data?.message ||
        "A new OTP has been sent."
      );

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to resend OTP."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

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

        <h2>
          Verify Your Email
        </h2>

        <p className="subtitle">
          Enter the 6-digit OTP sent to your email
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        <form onSubmit={handleVerify}>

          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="otp">
            Verification OTP
          </label>

          <input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength="6"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) =>
              setOtp(
                e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6)
              )
            }
            required
          />

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>

        </form>

        <button
          type="button"
          className="secondary-button"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Sending..." : "Resend OTP"}
        </button>

        <p className="auth-footer">

          Already verified?{" "}

          <Link to="/login">
            Login
          </Link>

        </p>

      </div>

    </div>
  );
}

export default VerifyEmail;
