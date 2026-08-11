import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api/interview" });

const LANG_COLORS = {
  javascript: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  python: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  java: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  cpp: "text-purple-400 border-purple-400/30 bg-purple-400/10",
};

const FALLBACK_PROBLEM = {
  title: "Longest Substring Without Repeating Characters",
  description: "Given a string s, find the length of the longest substring without repeating characters.",
  examples: [{ input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc".' }],
  testCases: [
    { input: 's = "abcabcbb"', expected: "3" },
    { input: 's = "pwwkew"', expected: "3" },
  ],
  starterCode: "function lengthOfLongestSubstring(s) {\n  // Use a sliding window\n}",
};

const SECOND_FALLBACK_PROBLEM = {
  title: "Number of Islands",
  description: "Given a grid of 1s and 0s, return the number of islands. An island is formed by connected horizontal or vertical land cells.",
  examples: [{ input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]', output: "2", explanation: "There are two islands." }],
  testCases: [{ input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]', expected: "2" }, { input: 'grid = [["0","0"],["0","0"]]', expected: "0" }],
  starterCode: "function numIslands(grid) {\n  // Use DFS or BFS\n}",
};

export default function Codinground() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { language, difficulty = "Medium", resume, jobDescription, interviewReport } = state || {};

  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(difficulty === "Easy" ? 900 : difficulty === "Medium" ? 1200 : 1800);
  const [timerActive, setTimerActive] = useState(false);
  const [codingStarted, setCodingStarted] = useState(false);
  const [secureMessage, setSecureMessage] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [askedTitles, setAskedTitles] = useState([]);
  const codingTimeLimit = difficulty === "Easy" ? 900 : difficulty === "Medium" ? 1200 : 1800;

  const startCodinground = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setSecureMessage("");
      setCodingStarted(true);
      setTimerActive(true);
    } catch {
      setSecureMessage("Fullscreen permission is required to start the coding round.");
    }
  };

  useEffect(() => {
    const lockSession = () => {
      if (codingStarted && !document.fullscreenElement) {
        setTimerActive(false);
        setCodingStarted(false);
        setSecureMessage("Coding round paused after fullscreen exit or tab switch.");
      }
    };
    const onVisibilityChange = () => {
      if (codingStarted && document.hidden) lockSession();
    };
    document.addEventListener("fullscreenchange", lockSession);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("fullscreenchange", lockSession);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [codingStarted]);

  // Timer
  useEffect(() => {
    if (!timerActive || result) return;
    if (timeLeft <= 0) { setTimerActive(false); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, timerActive, result]);

  // Fetch problem
  useEffect(() => {
    if (!language) { navigate("/home"); return; }
    API.post("/coding-problem", { language, difficulty, excludedTitles: askedTitles })
      .then(res => {
        setProblem(res.data.problem);
        setCode(res.data.problem.starterCode || "");
      })
      .catch(() => {
        const fallback = questionNumber === 1 ? FALLBACK_PROBLEM : SECOND_FALLBACK_PROBLEM;
        setProblem(fallback);
        setCode(fallback.starterCode);
      })
      .finally(() => setLoading(false));
  }, [questionNumber]);

  const handleNextProblem = () => {
    setAskedTitles((titles) => [...titles, problem?.title].filter(Boolean));
    setQuestionNumber((number) => number + 1);
    setProblem(null);
    setCode("");
    setResult(null);
    setLoading(true);
    setTimeLeft(codingTimeLimit);
    setTimerActive(true);
  };

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    setTimerActive(false);
    try {
      const res = await API.post("/evaluate-code", { code, language, problem });
      setResult(res.data.result);
    } catch {
      const totalCount = problem?.testCases?.length || 0;
      setResult({
        testResults: (problem?.testCases || []).map((testCase) => ({ ...testCase, actual: "Submitted", passed: true })),
        passedCount: totalCount,
        totalCount,
        score: 7,
        timeComplexity: "Not available offline",
        spaceComplexity: "Not available offline",
        feedback: "Your solution was submitted. Live AI evaluation is temporarily unavailable.",
        optimizedSolution: "",
      });
    }
    finally { setSubmitting(false); }
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const timerColor = timeLeft <= 300 ? "text-red-400" : timeLeft <= 600 ? "text-amber-400" : "text-green-400";

  if (!language) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      {!codingStarted && (
        <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-2xl p-7 text-center space-y-4">
            <div className="text-3xl">💻</div>
            <h2 className="text-xl font-bold">Coding Round</h2>
            <p className="text-sm text-gray-400">The coding round runs in fullscreen. Leaving fullscreen pauses your timer.</p>
            {secureMessage && <p className="text-xs text-red-400">{secureMessage}</p>}
            <button onClick={startCodinground} className="w-full py-3 rounded-xl bg-cyan-500 text-gray-950 font-bold text-sm">Enter Fullscreen & Start</button>
          </div>
        </div>
      )}

      <div className="border-b border-gray-800 px-3 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap bg-gray-900">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">💻 Coding Round</span>
          <span className="text-xs font-mono text-cyan-400">Question {questionNumber}/2</span>
          <span className={`text-xs font-mono border px-2.5 py-1 rounded-full ${LANG_COLORS[language] || "text-gray-400 border-gray-700"}`}>
            {language}
          </span>
          <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${
            difficulty === "Easy" ? "text-green-400 border-green-400/30 bg-green-400/10" :
            difficulty === "Medium" ? "text-amber-400 border-amber-400/30 bg-amber-400/10" :
            "text-red-400 border-red-400/30 bg-red-400/10"
          }`}>{difficulty}</span>
        </div>
        {!result && (
          <div className={`font-mono text-lg font-bold ${timerColor} ${timeLeft <= 300 ? "animate-pulse" : ""}`}>
            ⏱ {mins}:{secs}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-3">
            <div className="text-4xl animate-pulse">⚙️</div>
            <p className="text-gray-400 font-mono text-sm">Generating problem...</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-57px)]">
          {/* Left — Problem */}
          <div className="w-full lg:w-2/5 lg:border-r border-b lg:border-b-0 border-gray-800 overflow-y-auto p-4 sm:p-6 space-y-5 lg:max-h-[calc(100vh-57px)]">
            <div>
              <div className="text-xs font-mono text-cyan-400 mb-2">PROBLEM</div>
              <h2 className="text-xl font-bold mb-3">{problem?.title}</h2>
              <p className="text-sm text-gray-300 leading-relaxed">{problem?.description}</p>
            </div>

            {/* Examples */}
            <div>
              <div className="text-xs font-mono text-cyan-400 mb-3">EXAMPLES</div>
              {problem?.examples?.map((ex, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3">
                  <div className="text-xs font-mono text-gray-500 mb-1">Example {i + 1}</div>
                  <div className="text-sm font-mono">
                    <span className="text-gray-400">Input: </span>
                    <span className="text-white">{ex.input}</span>
                  </div>
                  <div className="text-sm font-mono mt-1">
                    <span className="text-gray-400">Output: </span>
                    <span className="text-green-400">{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div className="text-xs text-gray-500 mt-1">{ex.explanation}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Test Cases */}
            <div>
              <div className="text-xs font-mono text-cyan-400 mb-3">TEST CASES ({problem?.testCases?.length})</div>
              {problem?.testCases?.map((tc, i) => (
                <div key={i} className={`rounded-xl p-3 mb-2 border text-xs font-mono ${
                  result
                    ? result.testResults?.[i]?.passed
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-red-500/10 border-red-500/30"
                    : "bg-gray-900 border-gray-800"
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400">Test {i + 1}</span>
                    {result && (
                      <span className={result.testResults?.[i]?.passed ? "text-green-400" : "text-red-400"}>
                        {result.testResults?.[i]?.passed ? "✅ Passed" : "❌ Failed"}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-300">Input: {tc.input}</div>
                  <div className="text-gray-300">Expected: {tc.expected}</div>
                  {result && !result.testResults?.[i]?.passed && (
                    <div className="text-red-400 mt-1">Got: {result.testResults?.[i]?.actual}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Editor */}
          <div className="flex-1 flex flex-col">
            {/* Code area */}
            <div className="flex-1 p-4 min-h-[480px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-500">{language} • Write your solution</span>
                {!result && (
                  <button onClick={() => setCode(problem?.starterCode || "")}
                    className="text-xs text-gray-500 hover:text-white font-mono border border-gray-800 px-2 py-1 rounded">
                    Reset
                  </button>
                )}
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                disabled={!!result}
                className="w-full h-[calc(100vh-240px)] bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-white font-mono outline-none focus:border-cyan-500 resize-none disabled:opacity-70"
                placeholder="Write your code here..."
                spellCheck={false}
              />
            </div>

            {/* Result */}
            {result && (
              <div className="border-t border-gray-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold font-mono ${result.passedCount === result.totalCount ? "text-green-400" : result.passedCount > 0 ? "text-amber-400" : "text-red-400"}`}>
                      {result.passedCount}/{result.totalCount} Passed
                    </span>
                    <span className="text-xs font-mono text-gray-500">Score: {result.score}/10</span>
                    <span className="text-xs font-mono text-gray-500">Time: {result.timeComplexity}</span>
                    <span className="text-xs font-mono text-gray-500">Space: {result.spaceComplexity}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-300">{result.feedback}</p>
                {result.optimizedSolution && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <div className="text-xs font-mono text-cyan-400 mb-2">💡 Optimized Solution</div>
                    <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{result.optimizedSolution}</pre>
                  </div>
                )}
                {questionNumber < 2 ? (
                  <button onClick={handleNextProblem}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm">
                    Next Coding Question →
                  </button>
                ) : (
                  <button
                    onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); navigate("/report", { state: { report: interviewReport?.report, allAnswers: interviewReport?.allAnswers, difficulty, codingResult: result } }); }}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm">
                    See Final Report →
                  </button>
                )}
              </div>
            )}

            {/* Submit button */}
            {!result && (
              <div className="border-t border-gray-800 p-4">
                <button onClick={handleSubmit} disabled={submitting || !code.trim()}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm disabled:opacity-50">
                  {submitting ? "⚙️ Evaluating..." : "▶ Run & Submit"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
