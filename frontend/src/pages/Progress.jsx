import { useNavigate } from "react-router-dom";
 
const COMPANY_BANKS = {
  Google: ["Tell me about a time you solved a complex technical problem.", "How would you design a URL shortener like bit.ly?", "Explain the difference between a process and a thread.", "How do you handle conflicts in a team?", "What is your approach to debugging a production issue?"],
  Amazon: ["Tell me about a time you took ownership of a project.", "Describe a situation where you had to deliver results under pressure.", "How do you prioritize tasks when everything seems urgent?", "Tell me about a time you disagreed with your manager.", "How would you design Amazon's recommendation system?"],
  Microsoft: ["How would you design a parking lot system?", "Tell me about a time you failed and what you learned.", "Explain REST vs GraphQL.", "How do you ensure code quality in your projects?", "Describe your experience with agile methodologies."],
  Flipkart: ["How would you design a flash sale system?", "Tell me about a project where you improved performance.", "How do you handle database scaling?", "What is your approach to API design?", "Describe a time you worked with cross-functional teams."],
  Startup: ["Why do you want to work at a startup?", "How do you handle wearing multiple hats?", "Tell me about a side project you built.", "How do you stay updated with new technologies?", "Describe a time you built something from scratch."],
};
 
export default function Progress() {
  const navigate = useNavigate();
  const history = JSON.parse(localStorage.getItem("interview_history") || "[]");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
 
  const avg = history.length
    ? (history.reduce((a, b) => a + (b.score || 0), 0) / history.length).toFixed(1)
    : 0;
 
  const best = history.length ? Math.max(...history.map(h => h.score || 0)) : 0;
  const total = history.length;
 
  const scoreColor = (s) => s >= 8 ? "#00e5a0" : s >= 5 ? "#4f8eff" : "#ff5e7d";
 
  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
 
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Progress Tracker</h1>
            <p className="text-gray-400 text-sm mt-1">{user.name ? user.name + "'s interview performance" : "Your interview performance over time"}</p>
          </div>
          <button onClick={() => navigate("/home")} className="text-xs font-mono text-gray-500 hover:text-white transition-colors">
            ← Back
          </button>
        </div>
 
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Interviews", value: total, color: "text-cyan-400" },
            { label: "Average Score", value: `${avg}/10`, color: avg >= 8 ? "text-green-400" : avg >= 5 ? "text-amber-400" : "text-red-400" },
            { label: "Best Score", value: `${best}/10`, color: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <div className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
 
        {/* Score Graph */}
        {history.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7">
            <div className="text-xs font-mono text-cyan-400 mb-6">📈 SCORE HISTORY</div>
            <div className="flex items-end gap-3 h-32">
              {[...history].reverse().map((h, i) => {
                const heightPct = ((h.score || 0) / 10) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: scoreColor(h.score) }}>{h.score}</span>
                    <div className="w-full rounded-t-lg transition-all" style={{
                      height: `${heightPct}%`,
                      background: `linear-gradient(to top, ${scoreColor(h.score)}44, ${scoreColor(h.score)})`,
                      minHeight: "8px",
                    }} />
                    <span className="text-xs text-gray-600 font-mono" style={{ fontSize: "10px" }}>{h.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
 
        {/* History List */}
        {history.length > 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 space-y-3">
            <div className="text-xs font-mono text-cyan-400 mb-2">PAST INTERVIEWS</div>
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                <div>
                  <div className="text-sm text-white font-semibold">{h.date}</div>
                  <div className={`text-xs font-mono mt-0.5 ${h.difficulty === "Easy" ? "text-green-400" : h.difficulty === "Medium" ? "text-amber-400" : "text-red-400"}`}>
                    {h.difficulty} · {h.questions} questions
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold font-mono ${scoreColor(h.score) === "#00e5a0" ? "text-green-400" : scoreColor(h.score) === "#4f8eff" ? "text-cyan-400" : "text-red-400"}`}>
                    {h.score}/10
                  </span>
                  <span className={`text-xs border px-2 py-0.5 rounded-full ${
                    h.recommendation === "Hire" ? "border-green-500/30 text-green-400" :
                    h.recommendation === "Consider" ? "border-cyan-500/30 text-cyan-400" :
                    "border-red-500/30 text-red-400"
                  }`}>{h.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
            <p className="text-gray-500 text-sm">No interviews yet — start your first one!</p>
            <button onClick={() => navigate("/home")} className="mt-4 px-6 py-2.5 rounded-xl bg-cyan-500 text-gray-950 font-bold text-sm">
              Start Interview →
            </button>
          </div>
        )}
 
        {/* Company Question Bank */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7">
          <div className="text-xs font-mono text-cyan-400 mb-4">🏢 COMPANY QUESTION BANK</div>
          <div className="space-y-3">
            {Object.entries(COMPANY_BANKS).map(([company, questions]) => (
              <details key={company} className="group">
                <summary className="flex items-center justify-between cursor-pointer py-3 border-b border-gray-800 list-none">
                  <span className="text-sm font-semibold text-white">{company}</span>
                  <span className="text-xs text-gray-500 font-mono">{questions.length} questions ▾</span>
                </summary>
                <div className="pt-3 pb-2 space-y-2">
                  {questions.map((q, i) => (
                    <div key={i} className="flex gap-3 py-2">
                      <span className="text-cyan-400 font-mono text-xs mt-0.5">Q{i+1}</span>
                      <p className="text-sm text-gray-300 leading-relaxed">{q}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
 
        {/* Clear History */}
        {history.length > 0 && (
          <button
            onClick={() => { localStorage.removeItem("interview_history"); window.location.reload(); }}
            className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold text-sm border border-gray-700 transition-all"
          >
            Clear All History
          </button>
        )}
 
      </div>
    </div>
  );
}
 
