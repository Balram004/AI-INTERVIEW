import { Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Interview from "./pages/Interview";
import Report from "./pages/Report";
import Progress from "./pages/Progress";
import ResumeTips from "./pages/ResumeTips";
import CodingRound from "./pages/Codinground";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Auth />} />
      <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/interview" element={<PrivateRoute><Interview /></PrivateRoute>} />
      <Route path="/report" element={<PrivateRoute><Report /></PrivateRoute>} />
      <Route path="/progress" element={<PrivateRoute><Progress /></PrivateRoute>} />
      <Route path="/coding" element={<PrivateRoute><CodingRound /></PrivateRoute>} />
      <Route path="/resume-tips" element={<PrivateRoute><ResumeTips /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
}
