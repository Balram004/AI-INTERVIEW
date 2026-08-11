import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateQuestions } from "../services/api";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function Home() {
  const navigate = useNavigate();
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [jdFile, setJdFile] = useState(null);
  const [difficulty, setDifficulty] = useState("Medium");
  const [company, setCompany] = useState("General");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const pdf = await pdfjsLib.getDocument({ data: ev.target.result })
          .promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item) => item.str).join(" ") + "\n";
        }
        if (type === "resume") {
          setResume(text);
          setResumeFile(file.name);
        } else {
          setJobDescription(text);
          setJdFile(file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (type === "resume") {
          setResume(ev.target.result);
          setResumeFile(file.name);
        } else {
          setJobDescription(ev.target.result);
          setJdFile(file.name);
        }
      };
      reader.readAsText(file);
    }
  };
  async function handleStart() {
    if (!resume.trim() || !jobDescription.trim()) {
      setError("Please fill in both fields!");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const previousQuestions = JSON.parse(localStorage.getItem("used_interview_questions") || "[]");
      const res = await generateQuestions({
        resume,
        jobDescription,
        difficulty,
        company: company === "General" ? "" : company,
        excludedQuestions: previousQuestions,
      });
      const questions = res.data.questions;
      localStorage.setItem("used_interview_questions", JSON.stringify([...questions, ...previousQuestions].slice(0, 100)));
      navigate("/interview", {
        state: {
          questions,
          resume,
          jobDescription,
          difficulty,
          company,
        },
      });
    } catch {
      setError("Failed to generate questions. Check your API key.");
    } finally {
      setLoading(false);
    }
  }

  const UploadBtn = ({ type, fileName }) => (
    <div className="flex items-center gap-3 mb-2">
      <label className="cursor-pointer flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs px-3 py-2 rounded-lg transition-colors">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload File
        <input
          type="file"
          accept=".txt,.pdf"
          className="hidden"
          onChange={(e) => handleFileUpload(e, type)}
        />
      </label>
      {fileName && (
        <span className="text-xs text-cyan-400 font-mono">✓ {fileName}</span>
      )}
      <span className="text-xs text-gray-600">or paste below</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.href = "/";
            }}
            className="text-xs font-mono text-gray-500 hover:text-red-400 transition-colors border border-gray-800 px-3 py-1.5 rounded-lg hover:border-red-400"
          >
            Logout →
          </button>
        </div>
        <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono px-4 py-1.5 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          AI Powered · Groq LLaMA 3.3 70B
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          AI Interview <span className="text-cyan-400">Coach</span>
        </h1>
        {user.name && <p className="mt-2 text-sm text-cyan-300 font-medium">Welcome back, {user.name.split(" ")[0]} 👋</p>}
        <p className="mt-3 text-gray-400 text-base max-w-md mx-auto">
          Paste your resume and job description — get personalized interview
          questions with real-time AI feedback.
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
        {/* Resume */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Your Resume
          </label>
          <UploadBtn type="resume" fileName={resumeFile} />
          <textarea
            rows={6}
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume text here..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-cyan-500 transition-colors resize-none"
          />
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Job Description
          </label>
          <UploadBtn type="jd" fileName={jdFile} />
          <textarea
            rows={6}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-cyan-500 transition-colors resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            Difficulty Level
          </label>
          <div className="flex gap-3">
            {["Easy", "Medium", "Hard"].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  difficulty === d
                    ? d === "Easy"
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : d === "Medium"
                        ? "bg-amber-500/20 border-amber-500 text-amber-400"
                        : "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-gray-800 border-gray-700 text-gray-500"
                }`}
              >
                {d === "Easy" ? "🟢" : d === "Medium" ? "🟡" : "🔴"} {d}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2 font-mono">
            Easy: 2min · Medium: 3min · Hard: 4min
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            Target Company Style
          </label>
          <select value={company} onChange={(e) => setCompany(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500">
            {["General", "Google", "Amazon", "Microsoft", "Startup"].map((name) => <option key={name}>{name}</option>)}
          </select>
          <p className="text-xs text-gray-600 mt-2 font-mono">Questions adapt to the selected interview style.</p>
        </div>

        {/* Error */}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* Button */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              Generating Questions...
            </span>
          ) : (
            "Start Interview →"
          )}
        </button>
      </div>
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => navigate("/progress")}
          className="flex-1 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 text-xs font-mono hover:border-cyan-500 hover:text-cyan-400 transition-all"
        >
          📊 Progress & Questions
        </button>
        <button
          onClick={() => navigate("/resume-tips")}
          className="flex-1 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 text-xs font-mono hover:border-cyan-500 hover:text-cyan-400 transition-all"
        >
          📝 Resume Tips
        </button>
      </div>

      <p className="mt-6 text-xs text-gray-600 font-mono">
        Your data is never stored · Powered by Groq
      </p>
    </div>
  );
}
