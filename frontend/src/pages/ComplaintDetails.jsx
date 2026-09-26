import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

function formatStatus(status) {
  if (!status) return "Unknown";

  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function formatCategory(category) {
  if (!category) return "Unknown";

  return category
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function formatPriority(priority) {
  if (!priority) return "Unknown";

  return (
    priority.charAt(0).toUpperCase() +
    priority.slice(1)
  );
}

function formatDate(date) {
  if (!date) return "—";

  try {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date;
  }
}

function ComplaintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");

  const [complaint, setComplaint] = useState(null);
  const [history, setHistory] = useState([]);
  const [responses, setResponses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] =
    useState(true);
  const [responsesLoading, setResponsesLoading] =
    useState(true);

  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] =
    useState(false);
  const [sendingResponse, setSendingResponse] =
    useState(false);

  const [responseMessage, setResponseMessage] =
    useState("");

  const [error, setError] = useState("");
  const [historyError, setHistoryError] =
    useState("");
  const [responseError, setResponseError] =
    useState("");
  const [imageError, setImageError] =
    useState("");

  /*
   * -------------------------------------------------------
   * LOGGED-IN USER
   * -------------------------------------------------------
   */

  let user = null;

  try {
    user = JSON.parse(
      localStorage.getItem("user") || "null"
    );
  } catch {
    user = null;
  }

  const isAdmin = user?.role === "admin";

  /*
   * -------------------------------------------------------
   * LOGOUT
   * -------------------------------------------------------
   */

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  }, [navigate]);

  /*
   * -------------------------------------------------------
   * GET COMPLAINT
   * -------------------------------------------------------
   */

  const fetchComplaint = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/complaints/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.status === 403) {
        setError(
          "You do not have permission to view this complaint."
        );
        return;
      }

      if (response.status === 404) {
        setError("Complaint not found.");
        return;
      }

      if (!response.ok) {
        const errorData =
          await response.json().catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to load complaint."
        );
      }

      const data = await response.json();

      setComplaint(data);
    } catch (err) {
      console.error(
        "COMPLAINT DETAILS ERROR:",
        err
      );

      setError(
        err.message ||
          "Unable to load complaint."
      );
    } finally {
      setLoading(false);
    }
  }, [id, token, logout]);

  /*
   * -------------------------------------------------------
   * GET STATUS HISTORY
   * -------------------------------------------------------
   */

  const fetchHistory = useCallback(async () => {
    if (!token) return;

    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await fetch(
        `${API_URL}/complaints/${id}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.status === 403) {
        setHistoryError(
          "You do not have permission to view the history."
        );
        return;
      }

      if (response.status === 404) {
        setHistoryError(
          "Complaint history not found."
        );
        return;
      }

      if (!response.ok) {
        const errorData =
          await response.json().catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to load complaint history."
        );
      }

      const data = await response.json();

      setHistory(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error("HISTORY ERROR:", err);

      setHistoryError(
        err.message ||
          "Unable to load status history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [id, token, logout]);

  /*
   * -------------------------------------------------------
   * GET ADMIN RESPONSES
   * -------------------------------------------------------
   */

  const fetchResponses = useCallback(async () => {
    if (!token) return;

    try {
      setResponsesLoading(true);
      setResponseError("");

      const response = await fetch(
        `${API_URL}/complaints/${id}/responses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.status === 403) {
        setResponseError(
          "You do not have permission to view responses."
        );
        return;
      }

      if (response.status === 404) {
        setResponseError(
          "Complaint responses not found."
        );
        return;
      }

      if (!response.ok) {
        const errorData =
          await response.json().catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to load responses."
        );
      }

      const data = await response.json();

      setResponses(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "RESPONSES ERROR:",
        err
      );

      setResponseError(
        err.message ||
          "Unable to load responses."
      );
    } finally {
      setResponsesLoading(false);
    }
  }, [id, token, logout]);

  /*
   * -------------------------------------------------------
   * LOAD EVERYTHING
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (!token) {
      navigate("/login", {
        replace: true,
      });
      return;
    }

    fetchComplaint();
    fetchHistory();
    fetchResponses();
  }, [
    token,
    navigate,
    fetchComplaint,
    fetchHistory,
    fetchResponses,
  ]);

  /*
   * -------------------------------------------------------
   * ADMIN - SEND RESPONSE
   * -------------------------------------------------------
   */

  const sendResponse = async () => {
    if (!isAdmin) return;

    const message = responseMessage.trim();

    if (!message) {
      setResponseError(
        "Response message cannot be empty."
      );
      return;
    }

    try {
      setSendingResponse(true);
      setResponseError("");

      const response = await fetch(
        `${API_URL}/complaints/${id}/responses`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
          }),
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.status === 403) {
        setResponseError(
          "Only administrators can send responses."
        );
        return;
      }

      const data =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to send response."
        );
      }

      setResponses((current) => [
        ...current,
        data,
      ]);

      setResponseMessage("");
    } catch (err) {
      console.error(
        "SEND RESPONSE ERROR:",
        err
      );

      setResponseError(
        err.message ||
          "Unable to send response."
      );
    } finally {
      setSendingResponse(false);
    }
  };

  /*
   * -------------------------------------------------------
   * ADMIN - UPDATE STATUS
   * -------------------------------------------------------
   */

  const updateStatus = async (newStatus) => {
    if (!isAdmin) return;

    if (
      !complaint ||
      newStatus === complaint.status
    ) {
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(
        `${API_URL}/complaints/${id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.status === 403) {
        alert(
          "Only administrators can update complaint status."
        );
        return;
      }

      const data =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to update complaint status."
        );
      }

      setComplaint(data);

      await fetchHistory();
    } catch (err) {
      console.error(
        "STATUS UPDATE ERROR:",
        err
      );

      alert(
        err.message ||
          "Unable to update complaint status."
      );
    } finally {
      setUpdating(false);
    }
  };

  /*
   * -------------------------------------------------------
   * IMAGE URL
   * -------------------------------------------------------
   */

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
      return null;
    }

    if (
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://")
    ) {
      return imageUrl;
    }

    return `${API_URL}${imageUrl}`;
  };

  /*
   * -------------------------------------------------------
   * ADMIN - UPLOAD / REPLACE EVIDENCE
   * -------------------------------------------------------
   */

  const uploadComplaintImage = async (file) => {
    if (!file || !isAdmin) return;

    /*
     * Frontend validation
     */

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setImageError(
        "Only JPG, PNG, and WebP images are allowed."
      );
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setImageError(
        "Image must be smaller than 5 MB."
      );
      return;
    }

    setUploadingImage(true);
    setImageError("");

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/complaints/${id}/image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (response.status === 403) {
        setImageError(
          "Only administrators can upload or replace evidence."
        );
        return;
      }

      const data =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail?.message ||
            data?.detail ||
            "Failed to upload image."
        );
      }

      setComplaint((current) => ({
        ...current,
        image_url: data.image_url,
      }));
    } catch (err) {
      console.error(
        "IMAGE UPLOAD ERROR:",
        err
      );

      setImageError(
        err.message ||
          "Unable to upload image."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  /*
   * -------------------------------------------------------
   * LOADING
   * -------------------------------------------------------
   */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050f20",
          color: "#94a3b8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            border: "3px solid #1e293b",
            borderTopColor: "#22d3ee",
            borderRadius: "50%",
            animation:
              "civicSpin 0.8s linear infinite",
          }}
        />

        <span>
          Loading complaint...
        </span>

        <style>
          {`
            @keyframes civicSpin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    );
  }

  /*
   * -------------------------------------------------------
   * ERROR
   * -------------------------------------------------------
   */

  if (error || !complaint) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050f20",
          color: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            padding: "35px",
            borderRadius: "18px",
            border: "1px solid #1e3a5f",
            background:
              "linear-gradient(145deg, #0b1b31, #081426)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "42px",
              marginBottom: "15px",
            }}
          >
            ⚠️
          </div>

          <h2
            style={{
              margin: "0 0 10px",
              fontSize: "25px",
            }}
          >
            Complaint Not Found
          </h2>

          <p
            style={{
              color: "#64748b",
              marginBottom: "25px",
            }}
          >
            {error ||
              "Unable to load this complaint."}
          </p>

          <button
            onClick={() =>
              navigate("/complaints")
            }
            style={{
              border: "1px solid #164e63",
              background: "#0c3047",
              color: "#67e8f9",
              padding: "11px 18px",
              borderRadius: "9px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            ← Back to Complaints
          </button>
        </div>
      </div>
    );
  }

  const imageUrl = getImageUrl(
    complaint.image_url
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050f20",
        color: "#e2e8f0",
        padding: "40px 30px 70px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* BACK */}

        <button
          onClick={() =>
            navigate("/complaints")
          }
          style={{
            border: "none",
            background: "transparent",
            color: "#67e8f9",
            cursor: "pointer",
            padding: "0",
            marginBottom: "24px",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          ← Back to Complaints
        </button>

        {/* HEADER */}

        <div
          style={{
            background:
              "linear-gradient(135deg, #0b1d34, #0b2639)",
            border: "1px solid #164e63",
            borderRadius: "20px",
            padding: "30px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              color: "#22d3ee",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "2px",
              marginBottom: "12px",
            }}
          >
            CIVICFIX COMPLAINT
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: "13px",
                  marginBottom: "8px",
                }}
              >
                Complaint #{complaint.id}
              </div>

              <h1
                style={{
                  margin: "0",
                  fontSize: "32px",
                  lineHeight: "1.2",
                  color: "#f8fafc",
                }}
              >
                {complaint.title}
              </h1>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 13px",
                borderRadius: "10px",
                background:
                  complaint.status === "resolved"
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(59,130,246,0.12)",
                color:
                  complaint.status === "resolved"
                    ? "#86efac"
                    : "#93c5fd",
                border:
                  complaint.status === "resolved"
                    ? "1px solid rgba(34,197,94,0.2)"
                    : "1px solid rgba(59,130,246,0.2)",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              <span>●</span>

              {formatStatus(
                complaint.status
              )}
            </span>
          </div>
        </div>

        {/* MAIN GRID */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.5fr) minmax(300px, 0.8fr)",
            gap: "24px",
          }}
        >
          {/* LEFT COLUMN */}

          <div>
            {/* DESCRIPTION */}

            <section
              style={{
                background: "#0b192d",
                border: "1px solid #1b3554",
                borderRadius: "18px",
                padding: "26px",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 18px",
                  fontSize: "19px",
                }}
              >
                Complaint Description
              </h2>

              <p
                style={{
                  margin: "0",
                  color: "#94a3b8",
                  lineHeight: "1.8",
                  whiteSpace: "pre-wrap",
                }}
              >
                {complaint.description ||
                  "No description provided."}
              </p>
            </section>

            {/* LOCATION */}

            <section
              style={{
                background: "#0b192d",
                border: "1px solid #1b3554",
                borderRadius: "18px",
                padding: "26px",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 20px",
                  fontSize: "19px",
                }}
              >
                📍 Location
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "15px",
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    background: "#091528",
                    borderRadius: "10px",
                    border: "1px solid #172c46",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: "11px",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                    }}
                  >
                    Latitude
                  </span>

                  <strong
                    style={{
                      color: "#dbeafe",
                    }}
                  >
                    {complaint.latitude ??
                      "Not provided"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "16px",
                    background: "#091528",
                    borderRadius: "10px",
                    border: "1px solid #172c46",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: "11px",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                    }}
                  >
                    Longitude
                  </span>

                  <strong
                    style={{
                      color: "#dbeafe",
                    }}
                  >
                    {complaint.longitude ??
                      "Not provided"}
                  </strong>
                </div>
              </div>
            </section>

            {/* EVIDENCE */}

            <section
              style={{
                background: "#0b192d",
                border: "1px solid #1b3554",
                borderRadius: "18px",
                padding: "26px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                  marginBottom: "18px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "19px",
                  }}
                >
                  📷 Complaint Evidence
                </h2>

                {isAdmin && (
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 15px",
                      borderRadius: "9px",
                      background: uploadingImage
                        ? "#164e63"
                        : "#22d3ee",
                      color: uploadingImage
                        ? "#94a3b8"
                        : "#06111f",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: uploadingImage
                        ? "not-allowed"
                        : "pointer",
                      opacity:
                        uploadingImage ? 0.7 : 1,
                    }}
                  >
                    {uploadingImage
                      ? "Uploading..."
                      : complaint.image_url
                      ? "📎 Replace Evidence"
                      : "📎 Upload Evidence"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingImage}
                      style={{
                        display: "none",
                      }}
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0];

                        if (file) {
                          uploadComplaintImage(
                            file
                          );
                        }

                        event.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>

              {imageError && (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "11px 13px",
                    borderRadius: "9px",
                    background: "#3f1720",
                    border: "1px solid #7f1d1d",
                    color: "#fca5a5",
                    fontSize: "13px",
                  }}
                >
                  ⚠️ {imageError}
                </div>
              )}

              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={complaint.title}
                  style={{
                    width: "100%",
                    maxHeight: "500px",
                    objectFit: "contain",
                    borderRadius: "12px",
                    background: "#050f20",
                    border: "1px solid #172c46",
                    cursor: "zoom-in",
                  }}
                  onClick={() =>
                    window.open(
                      imageUrl,
                      "_blank"
                    )
                  }
                  onError={(event) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    borderRadius: "12px",
                    border: "1px dashed #294766",
                    background: "#091528",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  No evidence image uploaded yet.
                </div>
              )}
            </section>

            {/* STATUS HISTORY */}

            <section
              style={{
                background: "#0b192d",
                border: "1px solid #1b3554",
                borderRadius: "18px",
                padding: "26px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  marginBottom: "20px",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 5px",
                    fontSize: "19px",
                  }}
                >
                  Status History
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "12px",
                  }}
                >
                  Track how this complaint progressed.
                </p>
              </div>

              {historyLoading ? (
                <div
                  style={{
                    color: "#64748b",
                    padding: "20px 0",
                  }}
                >
                  Loading history...
                </div>
              ) : historyError ? (
                <div
                  style={{
                    color: "#fca5a5",
                    padding: "20px 0",
                  }}
                >
                  {historyError}
                </div>
              ) : history.length === 0 ? (
                <div
                  style={{
                    color: "#64748b",
                    padding: "25px 0",
                    textAlign: "center",
                  }}
                >
                  No status changes recorded yet.
                </div>
              ) : (
                <div
                  style={{
                    position: "relative",
                    paddingLeft: "24px",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "6px",
                      top: "8px",
                      bottom: "8px",
                      width: "1px",
                      background: "#24405e",
                    }}
                  />

                  {history.map(
                    (item, index) => (
                      <div
                        key={
                          item.id ??
                          `${item.changed_at}-${index}`
                        }
                        style={{
                          position: "relative",
                          paddingBottom:
                            index ===
                            history.length - 1
                              ? "0"
                              : "24px",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: "-22px",
                            top: "4px",
                            width: "9px",
                            height: "9px",
                            borderRadius: "50%",
                            background: "#22d3ee",
                            boxShadow:
                              "0 0 0 4px rgba(34,211,238,0.1)",
                          }}
                        />

                        <div
                          style={{
                            color: "#e2e8f0",
                            fontWeight: "600",
                            fontSize: "14px",
                          }}
                        >
                          {formatStatus(
                            item.old_status
                          )}{" "}
                          →{" "}
                          {formatStatus(
                            item.new_status
                          )}
                        </div>

                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "11px",
                            marginTop: "5px",
                          }}
                        >
                          {formatDate(
                            item.changed_at
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>

            {/* ADMIN RESPONSES */}

            <section
              style={{
                background: "#0b192d",
                border: "1px solid #1b3554",
                borderRadius: "18px",
                padding: "26px",
                marginTop: "24px",
              }}
            >
              <div
                style={{
                  color: "#22d3ee",
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "1.5px",
                  marginBottom: "8px",
                }}
              >
                ADMIN COMMUNICATION
              </div>

              <h2
                style={{
                  margin: "0 0 7px",
                  fontSize: "19px",
                }}
              >
                Admin Responses
              </h2>

              <p
                style={{
                  margin: "0 0 20px",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                Messages and updates from CivicFix
                administrators.
              </p>

              {/* RESPONSE HISTORY */}

              {responsesLoading ? (
                <div
                  style={{
                    color: "#64748b",
                    padding: "15px 0",
                  }}
                >
                  Loading responses...
                </div>
              ) : responseError &&
                responses.length === 0 ? (
                <div
                  style={{
                    color: "#fca5a5",
                    padding: "15px 0",
                  }}
                >
                  {responseError}
                </div>
              ) : responses.length === 0 ? (
                <div
                  style={{
                    color: "#64748b",
                    padding: "20px 0",
                    textAlign: "center",
                  }}
                >
                  No admin responses yet.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginBottom: isAdmin
                      ? "22px"
                      : "0",
                  }}
                >
                  {responses.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "15px",
                        borderRadius: "10px",
                        background: "#0f2742",
                        border:
                          "1px solid #254768",
                      }}
                    >
                      <div
                        style={{
                          color: "#e2e8f0",
                          fontSize: "14px",
                          lineHeight: "1.6",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.message}
                      </div>

                      <div
                        style={{
                          marginTop: "9px",
                          color: "#64748b",
                          fontSize: "11px",
                        }}
                      >
                        {item.responder_name ||
                          "CivicFix Admin"}{" "}
                        ·{" "}
                        {formatDate(
                          item.created_at
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ADMIN RESPONSE FORM */}

              {isAdmin && (
                <div
                  style={{
                    borderTop:
                      "1px solid #1b3554",
                    paddingTop: "20px",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      color: "#cbd5e1",
                      fontSize: "12px",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Add Admin Response
                  </label>

                  <textarea
                    value={responseMessage}
                    onChange={(event) =>
                      setResponseMessage(
                        event.target.value
                      )
                    }
                    placeholder="Write a response to the citizen..."
                    disabled={sendingResponse}
                    rows={4}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      resize: "vertical",
                      padding: "12px",
                      borderRadius: "10px",
                      border:
                        "1px solid #254768",
                      background: "#08182b",
                      color: "#e2e8f0",
                      outline: "none",
                      fontSize: "13px",
                      lineHeight: "1.5",
                    }}
                  />

                  {responseError && (
                    <div
                      style={{
                        color: "#fca5a5",
                        fontSize: "11px",
                        marginTop: "8px",
                      }}
                    >
                      {responseError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={sendResponse}
                    disabled={
                      sendingResponse ||
                      !responseMessage.trim()
                    }
                    style={{
                      marginTop: "12px",
                      padding: "11px 18px",
                      border: "none",
                      borderRadius: "9px",
                      background:
                        sendingResponse ||
                        !responseMessage.trim()
                          ? "#164e63"
                          : "#22d3ee",
                      color:
                        sendingResponse ||
                        !responseMessage.trim()
                          ? "#94a3b8"
                          : "#06111f",
                      fontWeight: "700",
                      cursor:
                        sendingResponse ||
                        !responseMessage.trim()
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {sendingResponse
                      ? "Sending..."
                      : "Send Response"}
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN */}

          <div>
            {/* COMPLAINT INFORMATION */}

            <section
              style={{
                background: "#0b192d",
                border: "1px solid #1b3554",
                borderRadius: "18px",
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 20px",
                  fontSize: "18px",
                }}
              >
                Complaint Information
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: "11px",
                      marginBottom: "5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Category
                  </span>

                  <strong>
                    {formatCategory(
                      complaint.category
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    height: "1px",
                    background: "#172c46",
                  }}
                />

                <div>
                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: "11px",
                      marginBottom: "5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Priority
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      padding: "6px 10px",
                      borderRadius: "7px",
                      background:
                        complaint.priority ===
                        "high"
                          ? "rgba(239,68,68,0.12)"
                          : complaint.priority ===
                            "medium"
                          ? "rgba(245,158,11,0.12)"
                          : "rgba(34,197,94,0.12)",
                      color:
                        complaint.priority ===
                        "high"
                          ? "#fca5a5"
                          : complaint.priority ===
                            "medium"
                          ? "#fcd34d"
                          : "#86efac",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    {formatPriority(
                      complaint.priority
                    )}
                  </span>
                </div>

                <div
                  style={{
                    height: "1px",
                    background: "#172c46",
                  }}
                />

                <div>
                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: "11px",
                      marginBottom: "5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Created
                  </span>

                  <strong
                    style={{
                      fontSize: "13px",
                    }}
                  >
                    {formatDate(
                      complaint.created_at
                    )}
                  </strong>
                </div>

                {complaint.created_by && (
                  <>
                    <div
                      style={{
                        height: "1px",
                        background: "#172c46",
                      }}
                    />

                    <div>
                      <span
                        style={{
                          display: "block",
                          color: "#64748b",
                          fontSize: "11px",
                          marginBottom: "5px",
                          textTransform:
                            "uppercase",
                        }}
                      >
                        Created By
                      </span>

                      <strong>
                        User #
                        {complaint.created_by}
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ADMIN STATUS UPDATE */}

            {isAdmin && (
              <section
                style={{
                  background:
                    "linear-gradient(145deg, #0b1d34, #0b1729)",
                  border:
                    "1px solid #164e63",
                  borderRadius: "18px",
                  padding: "24px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    color: "#22d3ee",
                    fontSize: "10px",
                    fontWeight: "700",
                    letterSpacing: "1.5px",
                    marginBottom: "8px",
                  }}
                >
                  ADMIN ACTION
                </div>

                <h2
                  style={{
                    margin: "0 0 7px",
                    fontSize: "18px",
                  }}
                >
                  Update Status
                </h2>

                <p
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    lineHeight: "1.6",
                    marginBottom: "18px",
                  }}
                >
                  Changing the status will create a
                  new entry in the complaint history.
                </p>

                <select
                  value={complaint.status}
                  disabled={updating}
                  onChange={(event) =>
                    updateStatus(
                      event.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "12px 13px",
                    borderRadius: "9px",
                    border:
                      "1px solid #254768",
                    background: "#0b1d34",
                    color: "#dbeafe",
                    outline: "none",
                    cursor: updating
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  {STATUS_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                {updating && (
                  <div
                    style={{
                      marginTop: "10px",
                      color: "#67e8f9",
                      fontSize: "11px",
                    }}
                  >
                    Updating status...
                  </div>
                )}
              </section>
            )}

            {/* ACTIONS */}

            <section
              style={{
                background: "#0b192d",
                border: "1px solid #1b3554",
                borderRadius: "18px",
                padding: "24px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 16px",
                  fontSize: "18px",
                }}
              >
                Actions
              </h2>

              <button
                onClick={() =>
                  navigate("/complaints")
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "9px",
                  border:
                    "1px solid #1e3a5f",
                  background: "#0e2037",
                  color: "#93c5fd",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                ← All Complaints
              </button>
            </section>
          </div>
        </div>

        {/* FOOTER */}

        <footer
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            marginTop: "35px",
            padding: "0 4px",
            color: "#34445b",
            fontSize: "11px",
          }}
        >
          <span>© 2026 CivicFix</span>

          <span>
            Making cities better, one complaint at a
            time.
          </span>
        </footer>
      </div>

      {/* RESPONSIVE */}

      <style>
        {`
          @media (max-width: 800px) {
            div[style*="minmax(0, 1.5fr)"] {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 600px) {
            body {
              overflow-x: hidden;
            }
          }
        `}
      </style>
    </div>
  );
}

export default ComplaintDetails;