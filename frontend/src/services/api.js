// import axios from "axios";

// const API = axios.create({
//   baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/interview",
//   timeout: 45000,
// });

// export const generateQuestions = (data) => API.post("/questions", data);
// export const getFeedback = (data) => API.post("/feedback", data);
// export const getReport = (data) => API.post("/report", data);
// export const getResumeTips = (data) => API.post("/resume-tips", data);
// export const getHRQuestions = (data) => API.post("/hr-questions", data);
// export const detectLanguage = (data) => API.post("/detect-language", data);
// export const getCodingProblem = (data) => API.post("/coding-problem", data);
// export const evaluateCode = (data) => API.post("/evaluate-code", data);

import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API = axios.create({ baseURL: `${BASE}/api/interview`, timeout: 45000 });
export const AUTH = axios.create({ baseURL: `${BASE}/api/auth`, timeout: 45000 });

export const generateQuestions = (data) => API.post("/questions", data);
export const getFeedback = (data) => API.post("/feedback", data);
export const getReport = (data) => API.post("/report", data);
export const getResumeTips = (data) => API.post("/resume-tips", data);
export const getHRQuestions = (data) => API.post("/hr-questions", data);
export const detectLanguage = (data) => API.post("/detect-language", data);
export const getCodingProblem = (data) => API.post("/coding-problem", data);
export const evaluateCode = (data) => API.post("/evaluate-code", data);

// Auth
export const registerUser = (data) => AUTH.post("/register", data);
export const loginUser = (data) => AUTH.post("/login", data);
export const saveInterview = (data) => AUTH.post("/save-interview", data);
export const getProfile = (token) => AUTH.get("/profile", { headers: { Authorization: `Bearer ${token}` } });