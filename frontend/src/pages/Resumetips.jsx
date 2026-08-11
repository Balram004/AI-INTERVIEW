import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api/interview" });

export default function Resumetips() {
  const navigate = useNavigate();
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tips, setTips] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!resume.trim() || !jobDescription.trim()) return;
    setLoading(true);
    try {
      const res = await API.post("/resume-tips", { resume, jobDescription });
      setTips(res.data.tips);
    } catch {
      alert("Failed to analyze resume");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Resume Tips</h1>
            <p className="text-gray-400 text-sm mt-1">AI-powered resume improvement suggestions</p>
          </div>
          <button onClick={() => navigate("/")} className="text-xs font-mono text-gray-500 hover:text-white">← Back</button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Your Resume</label>
            <textarea rows={5} value={resume} onChange={e => setResume(e.target.value)}
              placeholder="Paste your resume here..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-cyan-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Target Job Description</label>
            <textarea rows={4} value={jobDescription} onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste job description..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-cyan-500 resize-none" />
          </div>
          <button onClick={analyze} disabled={loading || !resume.trim() || !jobDescription.trim()}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm disabled:opacity-50">
            {loading ? "Analyzing..." : "Analyze Resume →"}
          </button>
        </div>

        {tips && (
          <div className="space-y-4">
            {/* Match Score */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-gray-500 mb-1">JOB MATCH SCORE</div>
                <div className={`text-4xl font-bold font-mono ${tips.matchScore >= 7 ? "text-green-400" : tips.matchScore >= 5 ? "text-amber-400" : "text-red-400"}`}>
                  {tips.matchScore}/10
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-gray-500 mb-1">MISSING KEYWORDS</div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {tips.missingKeywords?.map((k, i) => (
                    <span key={i} className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{k}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 space-y-4">
              <div className="text-xs font-mono text-cyan-400">💡 IMPROVEMENT SUGGESTIONS</div>
              {tips.suggestions?.map((s, i) => (
                <div key={i} className="flex gap-3 py-2 border-b border-gray-800 last:border-0">
                  <span className="text-cyan-400 font-mono text-xs mt-0.5">{String(i+1).padStart(2,"0")}</span>
                  <p className="text-sm text-gray-300 leading-relaxed">{s}</p>
                </div>
              ))}
            </div>

            {/* Improved Summary */}
            {tips.improvedSummary && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7">
                <div className="text-xs font-mono text-green-400 mb-3">✨ AI-IMPROVED SUMMARY</div>
                <p className="text-sm text-gray-300 leading-relaxed">{tips.improvedSummary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}