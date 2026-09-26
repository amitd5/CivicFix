import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const API =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/* =========================================================
   FORMAT HELPERS
   ========================================================= */

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

/* =========================================================
   STATUS / PRIORITY CLASSES
   ========================================================= */

function getStatusClass(status) {
  switch (status) {
    case "submitted":
      return "status-submitted";

    case "under_review":
      return "status-review";

    case "in_progress":
      return "status-progress";

    case "resolved":
      return "status-resolved";

    default:
      return "";
  }
}

function getPriorityClass(priority) {
  switch (priority) {
    case "high":
      return "priority-high";

    case "medium":
      return "priority-medium";

    case "low":
      return "priority-low";

    default:
      return "";
  }
}

/* =========================================================
   DASHBOARD
   ========================================================= */

export default function Dashboard() {
  const navigate = useNavigate();

  /* =======================================================
     USER
     ======================================================= */

  const [user] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "null"
      );
    } catch {
      return null;
    }
  });

  const token =
    localStorage.getItem("access_token") || "";

  const isAdmin = user?.role === "admin";

  /* =======================================================
     COMPLAINTS
     ======================================================= */

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =======================================================
     NOTIFICATIONS
     ======================================================= */

  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] =
    useState(false);

  const [notificationError, setNotificationError] =
    useState("");

  const [showNotifications, setShowNotifications] =
    useState(false);

  /* =======================================================
     FILTERS
     ======================================================= */

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [priorityFilter, setPriorityFilter] =
    useState("all");

  /* =======================================================
     AUTH CHECK
     ======================================================= */

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  /* =======================================================
     LOGOUT
     ======================================================= */

  const logout = useCallback(() => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");

  navigate("/login", {
    replace: true,
  });
}, [navigate]);

  /* =======================================================
     LOAD COMPLAINTS
     ======================================================= */

  const loadComplaints = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      

      const response = await fetch(`${API}/complaints`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      
      /* -----------------------------------------------
         AUTH ERROR
      ------------------------------------------------ */

      if (response.status === 401) {
        console.error(
          "Complaint API returned 401"
        );

        logout();
        return;
      }

      /* -----------------------------------------------
         OTHER API ERRORS
      ------------------------------------------------ */

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          "Complaints API error:",
          errorText
        );

        throw new Error(
          `Failed to load complaints (${response.status})`
        );
      }

      /* -----------------------------------------------
         PARSE RESPONSE
      ------------------------------------------------ */

      const data = await response.json();

      

      /* -----------------------------------------------
         SUPPORT MULTIPLE RESPONSE FORMATS
      ------------------------------------------------ */

      let complaintList = [];

      if (Array.isArray(data)) {
        complaintList = data;
      } else if (
        Array.isArray(data.complaints)
      ) {
        complaintList = data.complaints;
      } else if (
        Array.isArray(data.data)
      ) {
        complaintList = data.data;
      } else if (
        Array.isArray(data.items)
      ) {
        complaintList = data.items;
      } else if (
        data &&
        typeof data === "object"
      ) {
        console.warn(
          "Unexpected complaints response format:",
          data
        );
      }

     
      setComplaints(complaintList);

    } catch (err) {
      console.error(
        "Complaint loading error:",
        err
      );

      setError(
        err.message ||
          "Failed to load complaints."
      );

      setComplaints([]);

    } finally {
      setLoading(false);
    }
    }, [token, logout]);

  /* =======================================================
     LOAD NOTIFICATIONS
     ======================================================= */

  const loadNotifications = useCallback(async () => {
    if (!token) return;

    try {
      setNotificationsLoading(true);
      setNotificationError("");

      const response = await fetch(
        `${API}/notifications`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      
      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "Notifications API error:",
          errorText
        );

        throw new Error(
          `Failed to load notifications (${response.status})`
        );
      }

      const data = await response.json();

      

      if (Array.isArray(data)) {
        setNotifications(data);
      } else if (
        Array.isArray(data.notifications)
      ) {
        setNotifications(
          data.notifications
        );
      } else if (
        Array.isArray(data.data)
      ) {
        setNotifications(data.data);
      } else if (
        Array.isArray(data.items)
      ) {
        setNotifications(data.items);
      } else {
        setNotifications([]);
      }

    } catch (err) {
      console.error(
        "Notification loading error:",
        err
      );

      setNotificationError(
        err.message ||
          "Failed to load notifications."
      );

      setNotifications([]);

    } finally {
      setNotificationsLoading(false);
    }
    }, [token, logout]);

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
  if (!token) return;

  loadComplaints();
  loadNotifications();
}, [token, loadComplaints, loadNotifications]);

  /* =======================================================
     MARK ONE NOTIFICATION AS READ
     ======================================================= */

  const markNotificationRead = async (
    notificationId
  ) => {
    try {
      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );

      const response = await fetch(
        `${API}/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.warn(
          "Notification read API returned:",
          response.status
        );
      }

    } catch (err) {
      console.error(
        "Mark notification error:",
        err
      );
    }
  };

  /* =======================================================
     MARK ALL NOTIFICATIONS AS READ
     ======================================================= */

  const markAllNotificationsRead = async () => {
    try {
      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      const response = await fetch(
        `${API}/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.warn(
          "Mark all notifications API returned:",
          response.status
        );
      }

    } catch (err) {
      console.error(
        "Mark all notifications error:",
        err
      );
    }
  };

  /* =======================================================
     NOTIFICATION CLICK
     ======================================================= */

  const handleNotificationClick = async (
    notification
  ) => {
    if (!notification.is_read) {
      await markNotificationRead(
        notification.id
      );
    }

    setShowNotifications(false);

    if (notification.complaint_id) {
      navigate(
        `/complaints/${notification.complaint_id}`
      );
    }
  };

  /* =======================================================
     FILTER COMPLAINTS
     ======================================================= */

  const filteredComplaints =
    complaints.filter((complaint) => {
      const statusMatch =
        statusFilter === "all" ||
        complaint.status === statusFilter;

      const priorityMatch =
        priorityFilter === "all" ||
        complaint.priority === priorityFilter;

      return (
        statusMatch &&
        priorityMatch
      );
    });

  /* =======================================================
     STATISTICS
     ======================================================= */

  const totalComplaints =
    complaints.length;

  const submittedCount =
    complaints.filter(
      (c) => c.status === "submitted"
    ).length;

  const underReviewCount =
    complaints.filter(
      (c) => c.status === "under_review"
    ).length;

  const inProgressCount =
    complaints.filter(
      (c) => c.status === "in_progress"
    ).length;

  const resolvedCount =
    complaints.filter(
      (c) => c.status === "resolved"
    ).length;

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.is_read
    ).length;

  /* =======================================================
     PROTECT PAGE
     ======================================================= */

  if (!token) {
    return null;
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="dashboard-page">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="dashboard-header">

        {/* BRAND */}

        <div
          className="brand"
          onClick={() =>
            navigate("/dashboard")
          }
          style={{
            cursor: "pointer",
          }}
        >
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

        {/* RIGHT SIDE */}

        <div className="dashboard-actions">

          {/* USER */}

          <div className="user-info">
            <strong>
              {user?.name || "User"}
            </strong>

            <span>
              {isAdmin
                ? "Administrator"
                : "Citizen"}
            </span>
          </div>

          {/* =================================================
              NOTIFICATIONS
          ================================================= */}

          <div
            style={{
              position: "relative",
            }}
          >
            <button
              className="secondary-button"
              onClick={() =>
                setShowNotifications(
                  (previous) => !previous
                )
              }
              title="Notifications"
            >
              🔔

              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: "6px",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* NOTIFICATION PANEL */}

            {showNotifications && (
              <div
                className="notification-panel"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "52px",
                  width: "380px",
                  maxHeight: "500px",
                  overflowY: "auto",
                  zIndex: 9999,
                  background: "#111827",
                  border:
                    "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "14px",
                  padding: "16px",
                  boxShadow:
                    "0 20px 50px rgba(0,0,0,0.45)",
                }}
              >

                {/* PANEL HEADER */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "16px",
                    }}
                  >
                    Notifications
                  </strong>

                  {unreadCount > 0 && (
                    <button
                      onClick={
                        markAllNotificationsRead
                      }
                      className="secondary-button"
                      style={{
                        fontSize: "12px",
                        padding: "7px 10px",
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* LOADING */}

                {notificationsLoading && (
                  <p
                    style={{
                      color: "#94a3b8",
                    }}
                  >
                    Loading notifications...
                  </p>
                )}

                {/* ERROR */}

                {notificationError && (
                  <div
                    style={{
                      color: "#fca5a5",
                      fontSize: "13px",
                      padding: "10px",
                      background:
                        "rgba(239,68,68,0.08)",
                      borderRadius: "8px",
                    }}
                  >
                    {notificationError}
                  </div>
                )}

                {/* EMPTY */}

                {!notificationsLoading &&
                  !notificationError &&
                  notifications.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "30px 10px",
                        color: "#94a3b8",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "30px",
                          marginBottom: "10px",
                        }}
                      >
                        🔔
                      </div>

                      <p
                        style={{
                          margin: 0,
                        }}
                      >
                        No notifications yet.
                      </p>

                      <small
                        style={{
                          display: "block",
                          marginTop: "6px",
                          opacity: 0.65,
                        }}
                      >
                        Updates about your
                        complaints will appear
                        here.
                      </small>
                    </div>
                  )}

                {/* NOTIFICATION LIST */}

                {!notificationsLoading &&
                  notifications.map(
                    (notification) => (
                      <div
                        key={notification.id}
                        onClick={() =>
                          handleNotificationClick(
                            notification
                          )
                        }
                        style={{
                          padding: "13px",
                          marginBottom: "8px",
                          borderRadius: "10px",
                          cursor:
                            notification.complaint_id
                              ? "pointer"
                              : "default",

                          background:
                            notification.is_read
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(59,130,246,0.14)",

                          border:
                            notification.is_read
                              ? "1px solid rgba(255,255,255,0.06)"
                              : "1px solid rgba(59,130,246,0.25)",
                        }}
                      >

                        <div
                          style={{
                            fontSize: "14px",
                            lineHeight: "1.5",
                            marginBottom: "6px",
                          }}
                        >
                          {notification.message ||
                            notification.title ||
                            "New notification"}
                        </div>

                        <small
                          style={{
                            opacity: 0.55,
                            fontSize: "11px",
                          }}
                        >
                          {formatDate(
                            notification.created_at
                          )}
                        </small>

                      </div>
                    )
                  )}

              </div>
            )}
          </div>

          {/* =================================================
              ADMIN: DIRECT COMPLAINTS BUTTON
          ================================================= */}

         <button
            className="secondary-button"
            onClick={() => navigate("/complaints")}
        >
            📋 Complaints
        </button>

          {/* =================================================
              NEW COMPLAINT
          ================================================= */}

          {!isAdmin && (
            <button
              className="primary-button"
              onClick={() =>
                navigate("/create-complaint")
              }
            >
              + New Complaint
            </button>
          )}

          {/* =================================================
              LOGOUT
          ================================================= */}

          <button
            className="secondary-button"
            onClick={logout}
          >
            Logout
          </button>

        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="dashboard-content">

        {/* =================================================
            WELCOME
        ================================================= */}

        <section className="dashboard-welcome">

          <div>
            <h2>
              Welcome,{" "}
              {user?.name || "Citizen"} 👋
            </h2>

            <p>
              Track and manage your civic
              complaints.
            </p>
          </div>

        </section>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <section className="stats-grid">

          <div className="stat-card">
            <span>
              Total Complaints
            </span>

            <strong>
              {totalComplaints}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Submitted
            </span>

            <strong>
              {submittedCount}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Under Review
            </span>

            <strong>
              {underReviewCount}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              In Progress
            </span>

            <strong>
              {inProgressCount}
            </strong>
          </div>

          <div className="stat-card">
            <span>
              Resolved
            </span>

            <strong>
              {resolvedCount}
            </strong>
          </div>

        </section>

        {/* =================================================
            COMPLAINTS
        ================================================= */}

        <section className="complaints-section">

          {/* SECTION HEADER */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: "20px",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >

            <div>
              <h2>
                {isAdmin
                  ? "All Complaints"
                  : "My Complaints"}
              </h2>

              <p>
                {isAdmin
                  ? "View and manage all reported civic issues."
                  : "View and track your reported civic issues."}
              </p>
            </div>

            {/* FILTERS */}

            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
              >
                <option value="all">
                  All Statuses
                </option>

                <option value="submitted">
                  Submitted
                </option>

                <option value="under_review">
                  Under Review
                </option>

                <option value="in_progress">
                  In Progress
                </option>

                <option value="resolved">
                  Resolved
                </option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value
                  )
                }
              >
                <option value="all">
                  All Priorities
                </option>

                <option value="high">
                  High
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="low">
                  Low
                </option>
              </select>

            </div>

          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (
            <div className="loading-state">
              Loading complaints...
            </div>
          )}

          {/* =================================================
              ERROR
          ================================================= */}

          {!loading && error && (
            <div className="error-message">

              {error}

              <button
                className="secondary-button"
                onClick={loadComplaints}
                style={{
                  marginLeft: "10px",
                }}
              >
                Retry
              </button>

            </div>
          )}

          {/* =================================================
              EMPTY
          ================================================= */}

          {!loading &&
            !error &&
            filteredComplaints.length === 0 && (
              <div className="empty-state">

                <div
                  style={{
                    fontSize: "48px",
                    marginBottom: "10px",
                  }}
                >
                  📋
                </div>

                <h3>
                  No complaints found
                </h3>

                <p>
                  {complaints.length === 0
                    ? isAdmin
                      ? "There are no complaints in the system yet."
                      : "You haven't submitted any complaints yet."
                    : "No complaints match the selected filters."}
                </p>

                {!isAdmin &&
                  complaints.length === 0 && (
                    <button
                      className="primary-button"
                      onClick={() =>
                        navigate(
                          "/create-complaint"
                        )
                      }
                    >
                      Create Your First Complaint
                    </button>
                  )}

              </div>
            )}

          {/* =================================================
              COMPLAINT LIST
          ================================================= */}

          {!loading &&
            !error &&
            filteredComplaints.length > 0 && (
              <div className="complaints-grid">

                {filteredComplaints.map(
                  (complaint) => (
                    <div
                      key={complaint.id}
                      className="complaint-card"
                      onClick={() =>
                        navigate(
                          `/complaints/${complaint.id}`
                        )
                      }
                      style={{
                        cursor: "pointer",
                      }}
                    >

                      {/* TITLE + STATUS */}

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: "10px",
                        }}
                      >

                        <div>
                          <h3>
                            {complaint.title ||
                              `Complaint #${complaint.id}`}
                          </h3>

                          <p
                            style={{
                              opacity: 0.7,
                              fontSize: "14px",
                            }}
                          >
                            Complaint #
                            {complaint.id}
                          </p>
                        </div>

                        <span
                          className={`status-badge ${getStatusClass(
                            complaint.status
                          )}`}
                        >
                          {formatStatus(
                            complaint.status
                          )}
                        </span>

                      </div>

                      {/* DESCRIPTION */}

                      <p>
                        {complaint.description ||
                          "No description provided."}
                      </p>

                      {/* CATEGORY + PRIORITY */}

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginTop: "12px",
                        }}
                      >

                        <span className="category-badge">
                          {formatCategory(
                            complaint.category
                          )}
                        </span>

                        <span
                          className={`priority-badge ${getPriorityClass(
                            complaint.priority
                          )}`}
                        >
                          {formatPriority(
                            complaint.priority
                          )}
                        </span>

                      </div>

                      {/* META */}

                      <div
                        style={{
                          marginTop: "15px",
                          fontSize: "13px",
                          opacity: 0.65,
                        }}
                      >

                        {complaint.latitude != null &&
                          complaint.longitude != null && (
                            <div>
                              📍{" "}
                              {complaint.latitude},{" "}
                              {complaint.longitude}
                            </div>
                          )}

                        <div>
                          🕒{" "}
                          {formatDate(
                            complaint.created_at
                          )}
                        </div>

                        {complaint.department && (
                          <div>
                            🏢{" "}
                            {complaint.department}
                          </div>
                        )}

                        {complaint.assigned_to && (
                          <div>
                            👤 Assigned user #
                            {complaint.assigned_to}
                          </div>
                        )}

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

        </section>

      </main>

    </div>
  );
}