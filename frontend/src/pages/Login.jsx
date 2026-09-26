import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // ==========================================
      // STEP 1 — LOGIN
      // ==========================================

      const formData = new URLSearchParams();

      formData.append("username", email.trim());
      formData.append("password", password);

      const loginResponse = await axios.post(
        `${API_URL}/auth/login`,
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 10000,
        }
      );

      console.log("LOGIN RESPONSE:", loginResponse.data);

      const token = loginResponse.data?.access_token;

      if (!token) {
        throw new Error("Server did not return an access token.");
      }

      // ==========================================
      // STEP 2 — SAVE TOKEN
      // ==========================================

      localStorage.setItem("access_token", token);

      // ==========================================
      // STEP 3 — GET CURRENT USER
      // ==========================================

      const meResponse = await axios.get(
        `${API_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        }
      );

      console.log("CURRENT USER:", meResponse.data);

      const user = meResponse.data;

      // ==========================================
      // STEP 4 — SAVE USER
      // ==========================================

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      // ==========================================
      // STEP 5 — ROLE CHECK
      // ==========================================

      if (user.role === "admin") {
        navigate("/dashboard", {
          replace: true,
        });
      } else {
        navigate("/dashboard", {
          replace: true,
        });
      }

    } catch (err) {
      console.error("========== LOGIN ERROR ==========");
      console.error(err);
      console.error("Response:", err.response);
      console.error("Code:", err.code);
      console.error("================================");

      // ==========================================
      // 401 — INVALID CREDENTIALS
      // ==========================================

      if (err.response?.status === 401) {
        setError("Invalid email or password.");
      }

      // ==========================================
      // 403 — FORBIDDEN
      // ==========================================

      else if (err.response?.status === 403) {
        setError(
          err.response.data?.detail ||
          "You do not have permission to access CivicFix."
        );
      }

      // ==========================================
      // 404 — ENDPOINT NOT FOUND
      // ==========================================

      else if (err.response?.status === 404) {
        setError(
          "CivicFix login endpoint was not found."
        );
      }

      // ==========================================
      // 422 — VALIDATION ERROR
      // ==========================================

      else if (err.response?.status === 422) {
        setError(
          "Invalid login request. Please check your email and password."
        );
      }

      // ==========================================
      // NETWORK ERROR
      // ==========================================

      else if (
        err.code === "ERR_NETWORK" ||
        err.code === "ECONNREFUSED"
      ) {
        setError(
          "Cannot connect to CivicFix server. Make sure the backend is running on port 8000."
        );
      }

      // ==========================================
      // TIMEOUT
      // ==========================================

      else if (err.code === "ECONNABORTED") {
        setError(
          "CivicFix server took too long to respond."
        );
      }

      // ==========================================
      // OTHER SERVER ERROR
      // ==========================================

      else if (err.response) {
        const detail = err.response.data?.detail;

        setError(
          typeof detail === "string"
            ? detail
            : `Server error (${err.response.status}).`
        );
      }

      // ==========================================
      // UNKNOWN ERROR
      // ==========================================

      else {
        setError(
          err.message ||
          "Something went wrong. Please try again."
        );
      }

      // Remove potentially stale authentication
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

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
          Welcome Back
        </h2>

        <p className="subtitle">
          Login to manage your civic complaints
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
            LOGIN FORM
        ======================================== */}

        <form onSubmit={handleLogin}>

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
  placeholder="Enter your password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  autoComplete="current-password"
  required
/>

<div className="forgot-password">
  <Link to="/forgot-password">
    Forgot Password?
  </Link>
</div>

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {/* ========================================
            REGISTER
        ======================================== */}

        <p className="auth-footer">

          Don't have an account?{" "}

          <Link to="/register">
            Create account
          </Link>

        </p>

      </div>

    </div>
  );
}

export default Login;