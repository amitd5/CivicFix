import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Register() {

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {

    e.preventDefault();

    setError("");
    setLoading(true);

    try {

      const params = new URLSearchParams();

      params.append("name", name.trim());
      params.append("email", email.trim().toLowerCase());
      params.append("password", password);

      const response = await axios.post(
        `${API_URL}/auth/register`,
        params,
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          timeout: 15000,
        }
      );

      console.log(
        "REGISTER RESPONSE:",
        response.data
      );

      // ==========================================
      // GO TO OTP VERIFICATION
      // ==========================================

      if (response.data?.requires_verification) {

        navigate("/verify-email", {
          replace: true,
          state: {
            email: email.trim().toLowerCase(),
          },
        });

        return;
      }

      // Fallback
     navigate("/verify-email", {
  state: {
    email: email.trim(),
  },
});

    } catch (err) {

      console.error(
        "========== REGISTER ERROR =========="
      );

      console.error(err);
      console.error("Response:", err.response);

      setError(
        err.response?.data?.detail ||
        "Registration failed. Please try again."
      );

    } finally {

      setLoading(false);

    }
  };

  return (

    <div className="auth-page">

      <div className="auth-card">

        {/* ========================================
            BRAND
        ======================================== */}

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

        {/* ========================================
            TITLE
        ======================================== */}

        <h2>
          Create Account
        </h2>

        <p className="subtitle">
          Report and track your civic issues
        </p>

        {/* ========================================
            ERROR
        ======================================== */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* ========================================
            FORM
        ======================================== */}

        <form onSubmit={handleRegister}>

          {/* NAME */}

          <label htmlFor="name">
            Full Name
          </label>

          <input
            id="name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />

          {/* EMAIL */}

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

          {/* PASSWORD */}

          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          {/* CREATE ACCOUNT */}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </button>

        </form>

        {/* ========================================
            LOGIN
        ======================================== */}

        <p className="auth-footer">

          Already have an account?{" "}

          <Link to="/login">
            Login
          </Link>

        </p>

      </div>

    </div>
  );
}

export default Register;
