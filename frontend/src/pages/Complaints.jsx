import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL;

const STATUS_OPTIONS = [
    "submitted",
    "under_review",
    "in_progress",
    "resolved",
];

const PAGE_SIZE = 8;

// Wraps a two-word axis label ("Under Review") onto two lines instead of
// letting it run into its neighbor, while keeping the text upright (0°).
function WrappingAxisTick({ x, y, payload }) {
    const words = String(payload.value).split(" ");

    return (
        <g transform={`translate(${x},${y})`}>
            <text textAnchor="middle" fill="#94a3b8" fontSize={11}>
                {words.map((word, index) => (
                    <tspan key={index} x={0} dy={index === 0 ? 14 : 13}>
                        {word}
                    </tspan>
                ))}
            </text>
        </g>
    );
}

function Complaints() {
    const navigate = useNavigate();

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [search, setSearch] = useState("");

    const [page, setPage] = useState(1);

    // =========================================================
// NOTIFICATIONS
// =========================================================

const [notifications, setNotifications] = useState([]);
const [notificationsLoading, setNotificationsLoading] = useState(false);
const [notificationError, setNotificationError] = useState("");
const [showNotifications, setShowNotifications] = useState(false);

    // =========================================================
    // STATISTICS
    // =========================================================

    const [showStatistics, setShowStatistics] = useState(false);
    const [statistics, setStatistics] = useState(null);
    const [statisticsLoading, setStatisticsLoading] = useState(false);
    const [statisticsError, setStatisticsError] = useState("");

    // =========================================================
    // GET LOGGED-IN USER
    // =========================================================

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    }, []);

    const isAdmin = user?.role === "admin";

    // =========================================================
    // FETCH COMPLAINTS
    // =========================================================

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            setError("");

            const currentToken = localStorage.getItem("access_token");

            if (!currentToken) {
                navigate("/login");
                return;
            }

            const response = await fetch(
                `${API_URL}${isAdmin ? "/admin/complaints" : "/complaints"}`,
                {
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                    },
                });

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");
                navigate("/login");
                return;
            }

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `Server returned ${response.status}`);
            }

            const data = await response.json();

            setComplaints(
                Array.isArray(data)
                    ? data
                    : data.complaints || data.data || []
            );
        } catch (err) {
            console.error("Failed to fetch complaints:", err);
            setError(err.message || "Unable to load complaints");
        } finally {
            setLoading(false);
        }
    };
    // =========================================================
// NOTIFICATIONS
// =========================================================

const loadNotifications = async () => {
    try {
        const currentToken = localStorage.getItem("access_token");

        if (!currentToken) {
            navigate("/login");
            return;
        }

        setNotificationsLoading(true);
        setNotificationError("");

        const response = await fetch(
            `${API_URL}/notifications`,
            {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
            }
        );

        if (response.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            navigate("/login");
            return;
        }

        if (!response.ok) {
            throw new Error(
                `Failed to load notifications (${response.status})`
            );
        }

        const data = await response.json();

        setNotifications(
            Array.isArray(data)
                ? data
                : data.notifications || data.data || []
        );

    } catch (err) {
        console.error("Notification loading error:", err);
        setNotificationError(
            err.message || "Failed to load notifications"
        );
    } finally {
        setNotificationsLoading(false);
    }
};


const markNotificationRead = async (notificationId) => {
    try {
        const currentToken = localStorage.getItem("access_token");

        const response = await fetch(
            `${API_URL}/notifications/${notificationId}/read`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error("Failed to mark notification as read");
        }

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

    } catch (err) {
        console.error(
            "Mark notification read error:",
            err
        );
    }
};


const markAllNotificationsRead = async () => {
    try {
        const currentToken = localStorage.getItem("access_token");

        const response = await fetch(
            `${API_URL}/notifications/read-all`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(
                "Failed to mark all notifications as read"
            );
        }

        setNotifications((previous) =>
            previous.map((notification) => ({
                ...notification,
                is_read: true,
            }))
        );

    } catch (err) {
        console.error(
            "Mark all notifications read error:",
            err
        );
    }
};


const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
        await markNotificationRead(notification.id);
    }

    setShowNotifications(false);

    if (notification.complaint_id) {
        navigate(
            `/complaints/${notification.complaint_id}`
        );
    }
};


const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read
).length;


const getNotificationIcon = (type) => {
    switch (type) {
        case "status_changed":
            return "🔄";

        case "complaint_resolved":
            return "✅";

        case "admin_response":
            return "💬";

        default:
            return "🔔";
    }
};


const getNotificationTitle = (type) => {
    switch (type) {
        case "status_changed":
            return "Status Changed";

        case "complaint_resolved":
            return "Complaint Resolved";

        case "admin_response":
            return "Admin Response";

        default:
            return "Notification";
    }
};


const formatNotificationTime = (createdAt) => {
    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const diff =
        Math.floor(
            (Date.now() - date.getTime()) / 1000
        );

    if (diff < 60) {
        return "Just now";
    }

    if (diff < 3600) {
        return `${Math.floor(diff / 60)}m ago`;
    }

    if (diff < 86400) {
        return `${Math.floor(diff / 3600)}h ago`;
    }

    if (diff < 604800) {
        return `${Math.floor(diff / 86400)}d ago`;
    }

    return date.toLocaleDateString();
};

    // =========================================================
    // FETCH ADMIN STATISTICS
    // =========================================================

    const fetchStatistics = async () => {
        if (!isAdmin) return;

        try {
            setStatisticsLoading(true);
            setStatisticsError("");

            const currentToken = localStorage.getItem("access_token");

            if (!currentToken) {
                navigate("/login");
                return;
            }

            const response = await fetch(
                `${API_URL}/admin/stats`,
                {
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                    },
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");
                navigate("/login");
                return;
            }

            if (!response.ok) {
                const text = await response.text();
                throw new Error(
                    text || `Server returned ${response.status}`
                );
            }

            const data = await response.json();

            setStatistics(data);
            setShowStatistics(true);

        } catch (err) {
            console.error("Failed to fetch statistics:", err);

            setStatisticsError(
                err.message || "Unable to load statistics"
            );

        } finally {
            setStatisticsLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // =========================================================
    // FILTER
    // =========================================================

    const filteredComplaints = useMemo(() => {
        return complaints.filter((complaint) => {
            const matchesStatus =
                !statusFilter ||
                complaint.status?.toLowerCase() === statusFilter.toLowerCase();

            const matchesPriority =
                !priorityFilter ||
                complaint.priority?.toLowerCase() === priorityFilter.toLowerCase();

            const searchText = search.trim().toLowerCase();

            const matchesSearch =
                !searchText ||
                complaint.title?.toLowerCase().includes(searchText) ||
                complaint.description?.toLowerCase().includes(searchText) ||
                complaint.category?.toLowerCase().includes(searchText) ||
                String(complaint.id).includes(searchText);

            return matchesStatus && matchesPriority && matchesSearch;
        });
    }, [complaints, statusFilter, priorityFilter, search]);

    // =========================================================
    // PAGINATION
    // =========================================================

    const totalPages = Math.max(
        1,
        Math.ceil(filteredComplaints.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const visibleComplaints = filteredComplaints.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    useEffect(() => {
        setPage(1);
    }, [statusFilter, priorityFilter, search]);

    // =========================================================
    // CLEAR FILTERS
    // =========================================================

    const clearFilters = () => {
        setStatusFilter("");
        setPriorityFilter("");
        setSearch("");
        setPage(1);
    };

    // =========================================================
    // DETAILS — navigates to the dedicated ComplaintDetails page
    // =========================================================

    const openDetails = (complaint) => {
        navigate(`/complaints/${complaint.id}`);
    };

    // =========================================================
    // STATISTICS CHART DATA
    // =========================================================

    const statusChartData = statistics
        ? [
            { name: "Submitted", value: statistics.submitted || 0 },
            { name: "Under Review", value: statistics.under_review || 0 },
            { name: "In Progress", value: statistics.in_progress || 0 },
            { name: "Resolved", value: statistics.resolved || 0 },
        ]
        : [];

    const priorityChartData = statistics
        ? [
            { name: "High", value: statistics.high_priority || 0 },
            { name: "Medium", value: statistics.medium_priority || 0 },
            { name: "Low", value: statistics.low_priority || 0 },
        ]
        : [];

    const categoryCounts = complaints.reduce((accumulator, complaint) => {
        const category = complaint.category || "Other";
        accumulator[category] = (accumulator[category] || 0) + 1;
        return accumulator;
    }, {});

    const categoryChartData = Object.entries(categoryCounts).map(
        ([name, value]) => ({
            name: name
                .replaceAll("_", " ")
                .replace(/\b\w/g, (letter) => letter.toUpperCase()),
            value,
        })
    );

    // =========================================================
    // HELPERS
    // =========================================================

    const formatStatus = (status) => {
        if (!status) return "Unknown";

        return status
            .replaceAll("_", " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase());
    };

    const formatDate = (date) => {
        if (!date) return "—";

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) {
            return "—";
        }

        return parsed.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const initials = (user?.name || "User")
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner" />
                <p>Loading complaints...</p>
            </div>
        );
    }

    // =========================================================
    // PAGE
    // =========================================================

    return (
        <div className="dashboard">

            {/* ================= NAVBAR ================= */}

            <nav className="dashboard-nav">
                <div className="dashboard-brand">
                    <div className="dashboard-brand-icon">C</div>
                    <div>
                        <h1>CivicFix</h1>
                        <span>{isAdmin ? "Admin Portal" : "Citizen Portal"}</span>
                    </div>
                </div>

                <div className="dashboard-user">
                    <div
    style={{
        position: "relative",
    }}
>
    <button
        className="notification-button"
        aria-label="Notifications"
        type="button"
        onClick={() => {
            setShowNotifications(
                (previous) => !previous
            );

            if (!showNotifications) {
                loadNotifications();
            }
        }}
        style={{
            position: "relative",
        }}
    >
        🔔

        {unreadNotifications > 0 && (
            <span
                style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    minWidth: "19px",
                    height: "19px",
                    padding: "0 5px",
                    borderRadius: "999px",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #07111f",
                    lineHeight: 1,
                }}
            >
                {unreadNotifications > 99
                    ? "99+"
                    : unreadNotifications}
            </span>
        )}
    </button>

    {showNotifications && (
        <div
            style={{
                position: "absolute",
                top: "calc(100% + 12px)",
                right: 0,
                width: "390px",
                maxWidth: "calc(100vw - 30px)",
                background: "#0b1728",
                border: "1px solid #1b3450",
                borderRadius: "14px",
                boxShadow:
                    "0 20px 50px rgba(0,0,0,0.45)",
                overflow: "hidden",
                zIndex: 1000,
            }}
        >
            {/* HEADER */}
            <div
                style={{
                    padding: "16px 18px",
                    borderBottom:
                        "1px solid #1b3450",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                }}
            >
                <div>
                    <strong
                        style={{
                            display: "block",
                            color: "#f8fafc",
                            fontSize: "15px",
                        }}
                    >
                        Notifications
                    </strong>

                    <span
                        style={{
                            display: "block",
                            color: "#64748b",
                            fontSize: "11px",
                            marginTop: "3px",
                        }}
                    >
                        {unreadNotifications === 0
                            ? "You're all caught up"
                            : `${unreadNotifications} unread`}
                    </span>
                </div>

                {unreadNotifications > 0 && (
                    <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        style={{
                            border: "none",
                            background: "transparent",
                            color: "#60a5fa",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: "700",
                        }}
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* BODY */}
            <div
                style={{
                    maxHeight: "420px",
                    overflowY: "auto",
                }}
            >
                {notificationsLoading ? (
                    <div
                        style={{
                            padding: "35px 20px",
                            textAlign: "center",
                            color: "#94a3b8",
                            fontSize: "13px",
                        }}
                    >
                        <div
                            className="loading-spinner"
                            style={{
                                margin: "0 auto 12px",
                            }}
                        />

                        Loading notifications…
                    </div>
                ) : notificationError ? (
                    <div
                        style={{
                            padding: "30px 20px",
                            textAlign: "center",
                            color: "#f87171",
                            fontSize: "12px",
                        }}
                    >
                        ⚠ {notificationError}

                        <button
                            type="button"
                            onClick={loadNotifications}
                            style={{
                                display: "block",
                                margin: "12px auto 0",
                                padding: "7px 12px",
                                borderRadius: "7px",
                                border:
                                    "1px solid #29445f",
                                background: "#102238",
                                color: "#dbeafe",
                                cursor: "pointer",
                                fontSize: "11px",
                            }}
                        >
                            Try again
                        </button>
                    </div>
                ) : notifications.length === 0 ? (
                    <div
                        style={{
                            padding: "45px 20px",
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "30px",
                                marginBottom: "10px",
                            }}
                        >
                            🔕
                        </div>

                        <strong
                            style={{
                                display: "block",
                                color: "#e2e8f0",
                                fontSize: "13px",
                            }}
                        >
                            No notifications
                        </strong>

                        <p
                            style={{
                                color: "#64748b",
                                fontSize: "11px",
                                margin: "6px 0 0",
                            }}
                        >
                            New complaint updates
                            will appear here.
                        </p>
                    </div>
                ) : (
                    notifications.map(
                        (notification) => (
                            <button
                                key={notification.id}
                                type="button"
                                onClick={() =>
                                    handleNotificationClick(
                                        notification
                                    )
                                }
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    gap: "12px",
                                    textAlign: "left",
                                    padding: "14px 16px",
                                    border: "none",
                                    borderBottom:
                                        "1px solid #13283f",
                                    background:
                                        notification.is_read
                                            ? "#0b1728"
                                            : "#0f2035",
                                    cursor: "pointer",
                                }}
                            >
                                <div
                                    style={{
                                        width: "34px",
                                        height: "34px",
                                        minWidth: "34px",
                                        borderRadius: "10px",
                                        background:
                                            notification.is_read
                                                ? "#13243a"
                                                : "#17385b",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent:
                                            "center",
                                        fontSize: "16px",
                                    }}
                                >
                                    {getNotificationIcon(
                                        notification.type
                                    )}
                                </div>

                                <div
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems:
                                                "center",
                                            justifyContent:
                                                "space-between",
                                            gap: "8px",
                                        }}
                                    >
                                        <strong
                                            style={{
                                                color:
                                                    notification.is_read
                                                        ? "#cbd5e1"
                                                        : "#f8fafc",
                                                fontSize: "12px",
                                            }}
                                        >
                                            {getNotificationTitle(
                                                notification.type
                                            )}
                                        </strong>

                                        {!notification.is_read && (
                                            <span
                                                style={{
                                                    width: "7px",
                                                    height: "7px",
                                                    minWidth: "7px",
                                                    borderRadius:
                                                        "50%",
                                                    background:
                                                        "#3b82f6",
                                                }}
                                            />
                                        )}
                                    </div>

                                    <p
                                        style={{
                                            color: "#94a3b8",
                                            fontSize: "11px",
                                            lineHeight: 1.5,
                                            margin: "5px 0",
                                        }}
                                    >
                                        {notification.message}
                                    </p>

                                    <span
                                        style={{
                                            color: "#475569",
                                            fontSize: "10px",
                                        }}
                                    >
                                        {formatNotificationTime(
                                            notification.created_at
                                        )}
                                    </span>
                                </div>
                            </button>
                        )
                    )
                )}
            </div>
        </div>
    )}
</div>
                    <div className="user-avatar">{initials}</div>
                    <div className="user-info">
                        <strong>{user?.name || "User"}</strong>
                        <span>{user?.role === "admin" ? "Administrator" : "Citizen"}</span>
                    </div>
                    <button className="logout-button" type="button" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </nav>

            {/* ================= LAYOUT ================= */}

            <div className="dashboard-layout">

                <aside className="dashboard-sidebar">
                    <div className="sidebar-title">{isAdmin ? "MANAGEMENT" : "MENU"}</div>

                    <button
                        className="sidebar-item"
                        type="button"
                        onClick={() => navigate("/dashboard")}
                    >
                        <span>📊</span>
                        Dashboard
                    </button>

                    <button className="sidebar-item active" type="button">
                        <span>📋</span>
                        Complaints
                    </button>

                    {!isAdmin && (
                        <button
                            className="sidebar-item"
                            type="button"
                            onClick={() => navigate("/create-complaint")}
                        >
                            <span>➕</span>
                            Report Issue
                        </button>
                    )}
                </aside>

                <main className="dashboard-content">

                    {/* HERO */}

                    <section className="dashboard-hero">
                        <div>
                            <div className="hero-label">
                                {isAdmin ? "COMPLAINT MANAGEMENT" : "MY COMPLAINTS"}
                            </div>
                            <h2>{isAdmin ? "All Complaints" : "My Complaints"}</h2>
                            <p>
                                {isAdmin
                                    ? "Review, filter and manage citizen complaints submitted through CivicFix."
                                    : "Track the civic complaints you have submitted."}
                            </p>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            {isAdmin && (
                                <button
                                    className="refresh-button"
                                    type="button"
                                    onClick={fetchStatistics}
                                    disabled={statisticsLoading}
                                >
                                    {statisticsLoading ? "Loading..." : "📊 Statistics"}
                                </button>
                            )}

                            <button className="refresh-button" type="button" onClick={fetchComplaints}>
                                ↻ Refresh
                            </button>
                        </div>
                    </section>

                    {/* ================= ADMIN STATISTICS ================= */}

                    {isAdmin && showStatistics && statistics && (
                        <section className="complaints-section" style={{ marginBottom: "24px" }}>
                            <div className="section-header">
                                <div>
                                    <h2>📊 Complaint Statistics</h2>
                                    <p>Overview of complaints submitted through CivicFix.</p>
                                </div>

                                <button
                                    className="refresh-button"
                                    type="button"
                                    onClick={() => setShowStatistics(false)}
                                >
                                    ✕ Close
                                </button>
                            </div>

                            {statisticsError && (
                                <div className="dashboard-error">⚠️ {statisticsError}</div>
                            )}

                            {/* TOTAL */}

                            <div
                                style={{
                                    marginBottom: "24px",
                                    padding: "20px",
                                    borderRadius: "12px",
                                    background: "#0b1d34",
                                    border: "1px solid #254768",
                                }}
                            >
                                <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                                    TOTAL COMPLAINTS
                                </span>
                                <div
                                    style={{
                                        fontSize: "32px",
                                        fontWeight: "700",
                                        marginTop: "5px",
                                        color: "#e2e8f0",
                                    }}
                                >
                                    {statistics.total_complaints}
                                </div>
                            </div>

                            {/* CHARTS */}

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                                    gap: "20px",
                                }}
                            >
                                {/* STATUS CHART */}

                                <div
                                    style={{
                                        padding: "20px",
                                        borderRadius: "12px",
                                        background: "#0b1d34",
                                        border: "1px solid #254768",
                                    }}
                                >
                                    <h3>Complaints by Status</h3>

                                    <div style={{ width: "100%", height: "300px" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={statusChartData}
                                                barCategoryGap="32%"
                                                margin={{ top: 25, right: 12, left: 0, bottom: 10 }}
                                            >
                                                <CartesianGrid
                                                    vertical={false}
                                                    strokeDasharray="3 3"
                                                    stroke="#1c3352"
                                                />

                                                <XAxis
                                                    dataKey="name"
                                                    interval={0}
                                                    height={44}
                                                    axisLine={{ stroke: "#254768" }}
                                                    tickLine={false}
                                                    tick={<WrappingAxisTick />}
                                                />

                                                <YAxis
                                                    allowDecimals={false}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: "#8ea2c2", fontSize: 12 }}
                                                    width={28}
                                                />

                                                <Tooltip
                                                    cursor={{ fill: "rgba(34, 211, 238, 0.08)" }}
                                                    labelFormatter={(label) => `Status: ${label}`}
                                                    formatter={(value, name) => [
                                                        value,
                                                        name === "value" ? "Complaints" : name,
                                                    ]}
                                                    contentStyle={{
                                                        backgroundColor: "#101f3a",
                                                        border: "1px solid rgba(34, 211, 238, 0.4)",
                                                        borderRadius: "10px",
                                                        padding: "10px 14px",
                                                        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
                                                    }}
                                                    labelStyle={{
                                                        color: "#22d3ee",
                                                        fontWeight: "700",
                                                        marginBottom: "4px",
                                                    }}
                                                    itemStyle={{ color: "#e2e8f0" }}
                                                />

                                                <Bar
                                                    dataKey="value"
                                                    fill="#22d3ee"
                                                    radius={[6, 6, 0, 0]}
                                                    maxBarSize={42}
                                                    isAnimationActive={true}
                                                    animationDuration={700}
                                                    animationEasing="ease-out"
                                                >
                                                    {statusChartData.map((_, index) => (
                                                        <Cell
                                                            key={`status-cell-${index}`}
                                                            fill="#22d3ee"
                                                            className="status-bar-cell"
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* PRIORITY CHART */}

                                <div
                                    style={{
                                        padding: "20px",
                                        borderRadius: "12px",
                                        background: "#0b1d34",
                                        border: "1px solid #254768",
                                    }}
                                >
                                    <h3>Priority Distribution</h3>

                                    <div style={{ width: "100%", height: "300px" }}>
                                        <ResponsiveContainer width="100%" height={260}>
                                            <PieChart>
                                                <Pie
                                                    data={priorityChartData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={75}
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                    labelLine={false}
                                                >
                                                    {priorityChartData
                                                        .filter((entry) => entry.value > 0)
                                                        .map((entry, index) => {
                                                            const colors = {
                                                                High: "#ef4444",
                                                                Medium: "#f59e0b",
                                                                Low: "#22c55e",
                                                            };

                                                            return (
                                                                <Cell
                                                                    key={`priority-${index}`}
                                                                    fill={colors[entry.name]}
                                                                />
                                                            );
                                                        })}
                                                </Pie>

                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* CATEGORY CHART */}

                                <div
                                    style={{
                                        padding: "20px",
                                        borderRadius: "12px",
                                        background: "#0b1d34",
                                        border: "1px solid #254768",
                                    }}
                                >
                                    <h3>Complaints by Category</h3>

                                    <div style={{ width: "100%", height: "300px" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={categoryChartData}
                                                barCategoryGap="32%"
                                                margin={{ top: 25, right: 12, left: 0, bottom: 10 }}
                                            >
                                                {/* Horizontal reference lines only — no vertical
                                                    grid, for a cleaner look */}
                                                <CartesianGrid
                                                    vertical={false}
                                                    strokeDasharray="3 3"
                                                    stroke="#1c3352"
                                                />

                                                <XAxis
                                                    dataKey="name"
                                                    interval={0}
                                                    axisLine={{ stroke: "#254768" }}
                                                    tickLine={false}
                                                    tick={{ fill: "#8ea2c2", fontSize: 12 }}
                                                    dy={8}
                                                />

                                                <YAxis
                                                    allowDecimals={false}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: "#8ea2c2", fontSize: 12 }}
                                                    width={28}
                                                />

                                                <Tooltip
                                                    cursor={{ fill: "rgba(167, 139, 250, 0.08)" }}
                                                    labelFormatter={(label) => `Category: ${label}`}
                                                    formatter={(value) => [value, "Complaints"]}
                                                    contentStyle={{
                                                        backgroundColor: "#101f3a",
                                                        border: "1px solid rgba(167, 139, 250, 0.4)",
                                                        borderRadius: "10px",
                                                        padding: "10px 14px",
                                                        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.35)",
                                                    }}
                                                    labelStyle={{
                                                        color: "#c4b5fd",
                                                        fontWeight: "700",
                                                        marginBottom: "4px",
                                                    }}
                                                    itemStyle={{ color: "#e2e8f0" }}
                                                />

                                                <Bar
                                                    dataKey="value"
                                                    fill="#a78bfa"
                                                    radius={[6, 6, 0, 0]}
                                                    maxBarSize={42}
                                                    isAnimationActive={true}
                                                    animationDuration={700}
                                                    animationEasing="ease-out"
                                                >
                                                    {categoryChartData.map((_, index) => (
                                                        <Cell
                                                            key={`category-cell-${index}`}
                                                            fill="#a78bfa"
                                                            className="category-bar-cell"
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* ERROR */}

                    {error && <div className="dashboard-error">⚠️ {error}</div>}

                    {/* FILTERS + TABLE */}

                    <section className="complaints-section">
                        <div className="section-header">
                            <div>
                                <h2>{isAdmin ? "Complaint Records" : "Your Complaint Records"}</h2>
                                <p>
                                    {filteredComplaints.length} complaint
                                    {filteredComplaints.length !== 1 ? "s" : ""} found
                                </p>
                            </div>

                            <span className="complaint-count">Total: {complaints.length}</span>
                        </div>

                        <div className="complaint-filters">
                            <div className="filter-group">
                                <label>Search</label>
                                <input
                                    type="text"
                                    placeholder="Search complaints..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>

                            <div className="filter-group">
                                <label>Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value)}
                                >
                                    <option value="">All statuses</option>
                                    {STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>
                                            {formatStatus(status)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Priority</label>
                                <select
                                    value={priorityFilter}
                                    onChange={(event) => setPriorityFilter(event.target.value)}
                                >
                                    <option value="">All priorities</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>

                            <button className="clear-filter-button" type="button" onClick={clearFilters}>
                                Clear
                            </button>
                        </div>

                        {visibleComplaints.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📭</div>
                                <h3>No complaints found</h3>
                                <p>
                                    {isAdmin
                                        ? "There are no complaints matching your filters."
                                        : "You haven't submitted any complaints yet."}
                                </p>

                                {!isAdmin && (
                                    <button
                                        className="primary-button"
                                        style={{ marginTop: "18px", padding: "0 20px" }}
                                        onClick={() => navigate("/create-complaint")}
                                    >
                                        Report a Complaint
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="complaints-table">
                                <div className="table-header">
                                    <span>ID</span>
                                    <span>Complaint</span>
                                    <span>Category</span>
                                    <span>Priority</span>
                                    <span>Status</span>
                                    <span>Action</span>
                                </div>

                                {visibleComplaints.map((complaint) => (
                                    <div className="table-row" key={complaint.id}>
                                        <span className="complaint-id">#{complaint.id}</span>

                                        <div className="complaint-name">
                                            <strong>{complaint.title || "Untitled complaint"}</strong>
                                            <small>{formatDate(complaint.created_at)}</small>
                                        </div>

                                        <span className="category-text">
                                            {complaint.category || "General"}
                                        </span>

                                        <span
                                            className={`priority ${complaint.priority?.toLowerCase() || "medium"}`}
                                        >
                                            {complaint.priority || "Medium"}
                                        </span>

                                        <span className={`status ${complaint.status || "submitted"}`}>
                                            <span className="status-dot" />
                                            {formatStatus(complaint.status || "submitted")}
                                        </span>

                                        <button
                                            className="view-complaint-button"
                                            type="button"
                                            onClick={() => openDetails(complaint)}
                                        >
                                            View
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {filteredComplaints.length > PAGE_SIZE && (
                            <div className="pagination">
                                <button
                                    type="button"
                                    disabled={currentPage === 1}
                                    onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                                >
                                    ← Previous
                                </button>

                                <span>
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    type="button"
                                    disabled={currentPage === totalPages}
                                    onClick={() =>
                                        setPage((previous) => Math.min(totalPages, previous + 1))
                                    }
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
}

export default Complaints;