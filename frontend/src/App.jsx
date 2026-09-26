
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";


import Dashboard from "./pages/Dashboard";
import Complaints from "./pages/Complaints";
import ComplaintDetails from "./pages/ComplaintDetails";
import CreateComplaint from "./pages/CreateComplaint";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Authentication */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
  path="/reset-password"
  element={<ResetPassword />}
/>


        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/verify-email"
          element={<VerifyEmail />}
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/create-complaint"
          element={<CreateComplaint />}
        />

        {/* Complaints */}
        <Route
          path="/complaints"
          element={<Complaints />}
        />

        {/* Complaint Details */}
        <Route
          path="/complaints/:id"
          element={<ComplaintDetails />}
        />

        {/* Unknown route */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;