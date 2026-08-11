import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

export default function Report() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { report, allAnswers, difficulty = "Medium" } = state || {};

  // Create one history entry per report mount; do not write during rendering.
  const [updated] = useState(() => {
    const history = JSON.parse(localStorage.getItem("interview_history") || "[]");
    if (!report) return history;
    const newEntry = { date: new Date().toLocaleDateString("en-IN"), score: report.overallScore, recommendation: report.recommendation, difficulty, questions: allAnswers?.length || 0 };
    return [newEntry, ...history.slice(0, 4)];
  });
  useEffect(() => {
    if (report) localStorage.setItem("interview_history", JSON.stringify(updated));
  }, [report, updated]);

  if (!report) return <Navigate to="/home" replace />;

  // PDF Download
  const downloadPDF = () => {
    const content = `
AI INTERVIEW COACH — REPORT
============================
Date: ${new Date().toLocaleDateString("en-IN")}
Difficulty: ${difficulty}
Overall Score: ${report.overallScore}/10
Recommendation: ${report.recommendation}

SUMMARY
-------
${report.summary}

TOP STRENGTHS
-------------
${report.topStrengths?.map((s, i) => `${i + 1}. ${s}`).join("\n")}

AREAS TO IMPROVE
----------------
${report.areasToImprove?.map((s, i) => `${i + 1}. ${s}`).join("\n")}

QUESTION-WISE PERFORMANCE
--------------------------
${allAnswers.map((qa, i) => `
Q${i + 1}: ${qa.question}
Your Answer: ${qa.answer}
Score: ${qa.feedback?.score}/10
Time Taken: ${qa.timeTaken || "N/A"}s
`).join("\n---\n")}
    `;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const speakFeedback = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const text = "Interview feedback. Overall score " + report.overallScore + " out of 10. " + report.summary + " Top strengths: " + (report.topStrengths || []).join(". ") + ". Areas to improve: " + (report.areasToImprove || []).join(". ");
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const downloadCertificate = () => {
    const candidateName = JSON.parse(localStorage.getItem("user") || "{}").name || "Interview Candidate";
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
    const certificate = [
      "<!doctype html><html><head><title>Interview Certificate</title><style>",
      "body{margin:0;font-family:Georgia,serif;background:#07131d;color:#eaf8ff;padding:40px}.certificate{max-width:900px;margin:auto;padding:70px;border:12px solid #22d3ee;outline:2px solid #7dd3fc;outline-offset:-22px;text-align:center;min-height:520px;box-sizing:border-box;background:radial-gradient(circle at top,#123047,#07131d 70%)}.badge{color:#22d3ee;text-transform:uppercase;letter-spacing:4px;font:700 13px Arial}.title{font-size:50px;margin:35px 0 12px;color:#fff}.name{font-size:38px;color:#67e8f9;border-bottom:1px solid #22d3ee;display:inline-block;padding:0 24px 10px;margin:18px}.copy{font-size:18px;line-height:1.7;color:#cbd5e1}.score{font:700 32px Arial;color:#fff;margin:28px}.footer{display:flex;justify-content:space-between;margin-top:70px;font:14px Arial;color:#94a3b8}@media print{body{padding:0;background:#07131d}.certificate{height:100vh;max-width:none;border-width:12px}}</style></head><body><main class='certificate'>",
      "<div class='badge'>AI Interview Coach</div><h1 class='title'>Certificate of Completion</h1>",
      "<p class='copy'>This certifies that</p><div class='name'>", escapeHtml(candidateName), "</div>",
      "<p class='copy'>has successfully completed an AI-powered ", escapeHtml(difficulty), " interview assessment.</p>",
      "<div class='score'>Overall Score: ", escapeHtml(report.overallScore), " / 10</div>",
      "<p class='copy'>Recommendation: ", escapeHtml(report.recommendation), "</p>",
      "<div class='footer'><span>Date: ", escapeHtml(new Date().toLocaleDateString("en-IN")), "</span><span>Verified Assessment</span></div>",
      "</main><script>window.print();</script></body></html>",
    ].join("");
    const certificateWindow = window.open("", "_blank");
    if (certificateWindow) {
      certificateWindow.document.write(certificate);
      certificateWindow.document.close();
    }
  };

  const scoreColor = report.overallScore >= 8 ? "text-green-400" : report.overallScore >= 5 ? "text-cyan-400" : "text-red-400";
  const recColor = report.recommendation === "Hire"
    ? "bg-green-500/20 text-green-400 border-green-500/30"
    : report.recommendation === "Consider"
    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";
  const diffColor = difficulty === "Easy" ? "text-green-400" : difficulty === "Medium" ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Interview Report</h1>
          <p className="text-gray-400 text-sm mt-1">AI-generated performance analysis</p>
          <span className={`text-xs font-mono mt-2 inline-block ${diffColor}`}>
            {difficulty === "Easy" ? "🟢" : difficulty === "Medium" ? "🟡" : "🔴"} {difficulty} Level
          </span>
        </div>

        {/* Score */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-gray-500 mb-1">OVERALL SCORE</div>
            <div className={`text-6xl font-bold ${scoreColor}`}>
              {report.overallScore}<span className="text-2xl text-gray-600">/10</span>
            </div>
            <div className="text-xs text-gray-600 font-mono mt-1">{allAnswers.length} questions answered</div>
          </div>
          <div className={`border px-5 py-2.5 rounded-full text-sm font-bold ${recColor}`}>
            {report.recommendation}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7">
          <div className="text-xs font-mono text-cyan-400 mb-3">SUMMARY</div>
          <p className="text-gray-300 text-sm leading-relaxed">{report.summary}</p>
        </div>

        {/* Strengths + Improvements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="text-xs font-mono text-green-400 mb-3">✓ TOP STRENGTHS</div>
            <ul className="space-y-2">
              {report.topStrengths?.map((s, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-green-400">▸</span>{s}</li>
              ))}
            </ul>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="text-xs font-mono text-amber-400 mb-3">⚠ IMPROVE</div>
            <ul className="space-y-2">
              {report.areasToImprove?.map((s, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-amber-400">▸</span>{s}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Q&A */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 space-y-5">
          <div className="text-xs font-mono text-cyan-400">ALL QUESTIONS & ANSWERS</div>
          {allAnswers.map((qa, i) => {
            const sc = qa.feedback?.score || 0;
            const c = sc >= 8 ? "text-green-400" : sc >= 5 ? "text-amber-400" : "text-red-400";
            return (
              <div key={i} className="border-t border-gray-800 pt-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div className="text-sm font-semibold text-white flex-1 pr-4">Q{i+1}: {qa.question}</div>
                  <span className={`text-sm font-bold font-mono ${c}`}>{sc}/10</span>
                </div>
                <div className="text-sm text-gray-400">Your answer: {qa.answer}</div>
                {qa.timeTaken && <div className="text-xs text-gray-600 font-mono">⏱ {qa.timeTaken}s</div>}
              </div>
            );
          })}
        </div>

        {/* History */}
        {updated.length > 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7">
            <div className="text-xs font-mono text-cyan-400 mb-4">📊 INTERVIEW HISTORY</div>
            {updated.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <span className="text-xs text-gray-500 font-mono">{h.date}</span>
                  <span className={`ml-2 text-xs font-mono ${h.difficulty === "Easy" ? "text-green-400" : h.difficulty === "Medium" ? "text-amber-400" : "text-red-400"}`}>{h.difficulty}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold font-mono ${h.score >= 8 ? "text-green-400" : h.score >= 5 ? "text-cyan-400" : "text-red-400"}`}>{h.score}/10</span>
                  <span className={`text-xs border px-2 py-0.5 rounded-full ${h.recommendation === "Hire" ? "border-green-500/30 text-green-400" : h.recommendation === "Consider" ? "border-cyan-500/30 text-cyan-400" : "border-red-500/30 text-red-400"}`}>{h.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={downloadPDF}
            className="flex-1 py-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm border border-gray-700 transition-all flex items-center justify-center gap-2">
            ⬇ Download Report
          </button>
          <button onClick={speakFeedback}
            className="py-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm border border-gray-700 transition-all">
            Hear Feedback
          </button>
          <button onClick={downloadCertificate}
            className="py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm transition-all">
            Download Certificate
          </button>
          <button onClick={() => navigate("/home")}
            className="sm:col-span-3 py-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm border border-gray-700 transition-all">
            Start New Interview →
          </button>
        </div>

      </div>
    </div>
  );
}
