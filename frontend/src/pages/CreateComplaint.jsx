import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

const API =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function CreateComplaint() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [imageUrl, setImageUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Get user's current location
  const getLocation = () => {
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      },
      (err) => {
        console.error("Location error:", err);
        setError(
          "Unable to get your location. Please allow location access and try again."
        );
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    // Basic validation
    if (!title.trim()) {
      setError("Please enter a complaint title.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a complaint description.");
      return;
    }

    if (!category) {
      setError("Please select a category.");
      return;
    }

    if (!priority) {
      setError("Please select a priority.");
      return;
    }

    if (latitude === "" || longitude === "") {
      setError("Please provide your location before submitting.");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("You are not logged in. Please login again.");
        navigate("/login");
        return;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: category,
        priority: priority,
        latitude: Number(latitude),
        longitude: Number(longitude),
        image_url: imageUrl.trim() || null,
      };

      console.log("Submitting complaint:", payload);

      const response = await axios.post(
        `${API}/complaints`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Complaint created:", response.data);

      setSuccess("Complaint submitted successfully!");

      // Give the user a moment to see the success message
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);

    } catch (err) {
      console.error("Complaint creation error:", err);

      // Handle FastAPI validation errors safely
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        const messages = detail
          .map((item) => {
            if (typeof item === "string") {
              return item;
            }

            return item?.msg || "Invalid input";
          })
          .join(", ");

        setError(messages);
      } else if (typeof detail === "string") {
        setError(detail);
      } else if (err.response?.status === 401) {
        setError("Your session has expired. Please login again.");
      } else if (err.response?.status === 403) {
        setError("You are not authorized to create complaints.");
      } else if (err.response?.status === 422) {
        setError("Some complaint details are invalid. Please check the form.");
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to submit complaint."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div
        className="auth-card"
        style={{
          width: "min(650px, 92vw)",
        }}
      >

        {/* BRAND */}
        <div className="brand">
          <div className="brand-icon">
            C
          </div>

          <div>
            <h1>CivicFix</h1>
            <p>Smart Civic Complaint Management</p>
          </div>
        </div>

        {/* TITLE */}
        <h2>Create Complaint</h2>

        <p className="subtitle">
          Report a civic issue in your area
        </p>

        {/* ERROR */}
        {error && (
          <div
            className="error-message"
            style={{
              marginBottom: "16px",
              whiteSpace: "normal",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "16px",
              borderRadius: "10px",
              background: "rgba(34, 197, 94, 0.12)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              color: "#4ade80",
            }}
          >
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* TITLE */}
          <label>Complaint Title</label>

          <input
            type="text"
            placeholder="Example: Large pothole near main road"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            required
          />

          {/* DESCRIPTION */}
          <label>Description</label>

          <textarea
            placeholder="Describe the issue in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            required
            rows={5}
            style={{
              width: "100%",
              resize: "vertical",
              padding: "14px",
              marginBottom: "18px",
              borderRadius: "10px",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              background: "rgba(15, 23, 42, 0.7)",
              color: "white",
              fontSize: "15px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />

          {/* CATEGORY */}
          <label>Category</label>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
            required
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "18px",
              borderRadius: "10px",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              background: "#0b1728",
              color: category ? "white" : "#64748b",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
          >
            <option value="">Select category</option>
            <option value="roads">Roads / Infrastructure</option>
            <option value="electricity">Electricity</option>
            <option value="water">Water Supply</option>
            <option value="sanitation">Sanitation</option>
            <option value="garbage">Garbage / Waste</option>
            <option value="streetlight">Streetlight</option>
            <option value="traffic">Traffic</option>
            <option value="parks">Parks / Public Spaces</option>
            <option value="other">Other</option>
          </select>

          {/* PRIORITY */}
          <label>Priority</label>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={loading}
            required
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "18px",
              borderRadius: "10px",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              background: "#0b1728",
              color: "white",
              fontSize: "15px",
              boxSizing: "border-box",
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          {/* LOCATION */}
          <label>Location</label>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              disabled={loading}
              required
              style={{ marginBottom: 0 }}
            />

            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              disabled={loading}
              required
              style={{ marginBottom: 0 }}
            />
          </div>

          <button
            type="button"
            onClick={getLocation}
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px",
              marginBottom: "18px",
              borderRadius: "10px",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              background: "rgba(14, 165, 233, 0.08)",
              color: "#38bdf8",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            📍 Use My Current Location
          </button>

          {/* OPTIONAL IMAGE URL */}
          <label>Image URL (optional)</label>

          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={loading}
          />

          {/* SUBMIT */}
          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Complaint"}
          </button>

        </form>

        {/* BACK */}
        <p className="auth-footer">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            style={{
              background: "none",
              border: "none",
              color: "#38bdf8",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ← Back to Dashboard
          </button>
        </p>

      </div>

    </div>
  );
}