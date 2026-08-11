import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { generateQuestions, getFeedback, getReport } from "../services/api";
import { detectLanguage } from "../services/api";

const DIFFICULTY_COLORS = {
  Easy: "text-green-400 bg-green-400/10 border-green-400/30",
  Medium: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  Hard: "text-red-400 bg-red-400/10 border-red-400/30",
};
const TIMER_LIMITS = { Easy: 120, Medium: 180, Hard: 240 };

// ── Instructions Modal ──────────────────────────────────────────
function InstructionsModal({ difficulty, onStart }) {
  const [fsError, setFsError] = useState("");

  const handleStart = async () => {
    try {
      await document.documentElement.requestFullscreen();
      onStart();
    } catch {
      setFsError("Please allow fullscreen to start the interview.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="text-2xl font-bold">Interview Instructions</h2>
          <p className="text-gray-400 text-sm mt-1">Read carefully before starting</p>
        </div>

        {/* Difficulty */}
        <div className={`border rounded-xl p-3 text-center text-sm font-bold ${
          difficulty === "Easy" ? "border-green-500/30 bg-green-500/10 text-green-400" :
          difficulty === "Medium" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" :
          "border-red-500/30 bg-red-500/10 text-red-400"
        }`}>
          {difficulty === "Easy" ? "🟢" : difficulty === "Medium" ? "🟡" : "🔴"} {difficulty} Level —{" "}
          {TIMER_LIMITS[difficulty] / 60} min per question
        </div>

        {/* Rules */}
        <div className="space-y-3">
          {[
            { icon: "⛶", text: "Fullscreen mode is mandatory — interview will start in fullscreen" },
            { icon: "📹", text: "Enable camera for a real interview experience (optional)" },
            { icon: "⏱", text: `You have ${TIMER_LIMITS[difficulty]}s per question — answer before time runs out` },
            { icon: "🎙", text: "Voice input available — speak your answer directly" },
            { icon: "⚠️", text: "Tab switching is tracked — stay focused on the interview" },
            { icon: "🤖", text: "AI will give instant feedback after each answer" },
          ].map((r, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-lg mt-0.5">{r.icon}</span>
              <p className="text-sm text-gray-300 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>

        {fsError && (
          <p className="text-red-400 text-xs text-center font-mono">{fsError}</p>
        )}

        <button onClick={handleStart}
          className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm transition-all hover:-translate-y-0.5">
          Enter Fullscreen & Start Interview →
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function Interview() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { questions: initialQuestions, resume, jobDescription, difficulty = "Medium", company = "General" } = state || {};

  const [showInstructions, setShowInstructions] = useState(true);
  const [questions, setQuestions] = useState(initialQuestions || []);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allAnswers, setAllAnswers] = useState([]);
  const [listening, setListening] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_LIMITS[difficulty]);
  const [timerActive, setTimerActive] = useState(false);
  const [timerWarning, setTimerWarning] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [tabWarning, setTabWarning] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [securityLock, setSecurityLock] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const submittingRef = useRef(false);

  // Tab switch detection
  useEffect(() => {
    const handle = () => {
      if (document.hidden && !showInstructions) {
        setTabWarning(true);
        setSecurityLock(true);
        setTimerActive(false);
        setTabSwitchCount(c => c + 1);
        setTimeout(() => setTabWarning(false), 3000);
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, [showInstructions]);

  // Exit fullscreen detection
  useEffect(() => {
    const handle = () => {
      if (!document.fullscreenElement && !showInstructions) {
        setTabWarning(true);
        setSecurityLock(true);
        setTimerActive(false);
        setTimeout(() => setTabWarning(false), 3000);
      }
    };
    document.addEventListener("fullscreenchange", handle);
    return () => document.removeEventListener("fullscreenchange", handle);
  }, [showInstructions]);

  // Timer
  useEffect(() => {
    setTimeLeft(TIMER_LIMITS[difficulty]);
    setTimerActive(!showInstructions);
    setTimerWarning(false);
  }, [currentQ, difficulty, showInstructions]);

  useEffect(() => {
    if (!timerActive || feedback || showInstructions) return;
   if (timeLeft <= 0) {
  setTimerActive(false);
  if (answer.trim()) {
    handleSubmitAnswerSafe();
  } else {
    setAnswer("No answer provided — time ran out!");
    setTimeout(() => handleSubmitAnswerSafe("No answer provided - time ran out."), 500);
  }
  return;
} 
    if (timeLeft <= 30) setTimerWarning(true);
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, timerActive, feedback, showInstructions]);

  // Voice
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = false; r.lang = "en-US";
      r.onresult = e => { setAnswer(p => p + " " + e.results[0][0].transcript); setListening(false); };
      r.onend = () => setListening(false);
      recognitionRef.current = r;
    }
  }, []);

  // Camera
  const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 320, height: 240 }, 
      audio: false 
    });
    streamRef.current = stream;
    setCameraOn(true);
    // Wait for videoRef to be available
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      }
    }, 100);
  } catch (err) {
    alert("Camera error: " + err.message);
  }
};

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), []);
  useEffect(() => {
  if (!showInstructions) {
    startCamera();
  }
}, [showInstructions]);

  function toggleVoice() {
    if (!recognitionRef.current) return alert("Voice not supported in this browser");
    if (listening) { recognitionRef.current.stop(); setListening(false); }
    else { recognitionRef.current.start(); setListening(true); }
  }

  async function resumeSecureInterview() {
    try {
      await document.documentElement.requestFullscreen();
      setSecurityLock(false);
      setTimerActive(true);
    } catch {
      setRequestError("Fullscreen is required to continue the interview.");
    }
  }

  async function regenerateCurrentQuestion() {
    if (regenerating || answer.trim() || feedback) return;
    setRegenerating(true);
    setRequestError("");
    try {
      const usedQuestions = JSON.parse(localStorage.getItem("used_interview_questions") || "[]");
      const excludedQuestions = [...usedQuestions, ...questions];
      const response = await generateQuestions({
        resume,
        jobDescription,
        company: company === "General" ? "" : company,
        excludedQuestions,
        count: 1,
      });
      const replacement = response.data?.questions?.[0];
      if (!replacement) throw new Error("No replacement question");
      setQuestions((current) => current.map((question, index) => index === currentQ ? replacement : question));
      localStorage.setItem("used_interview_questions", JSON.stringify([replacement, ...usedQuestions].slice(0, 100)));
    } catch {
      setRequestError("Could not generate a replacement question. Please continue with this one.");
    } finally {
      setRegenerating(false);
    }
  }

  function createOfflineFeedback(question, submittedAnswer) {
    const wordCount = submittedAnswer.split(/\s+/).filter(Boolean).length;
    const score = Math.max(4, Math.min(8, Math.round(4 + wordCount / 30)));
    return {
      score,
      strengths: ["Answered the question directly", "Used relevant interview context"],
      improvements: ["Add a specific example from a project", "Explain the outcome or impact of your work"],
      betterAnswer: `For this question, explain the context, the action you took, and the result. Include the tools you used and a measurable outcome where possible.`,
    };
  }

  async function handleSubmitAnswerSafe(answerOverride) {
    const submittedAnswer = (typeof answerOverride === "string" ? answerOverride : answer).trim();
    if (!submittedAnswer || submittingRef.current) return;

    submittingRef.current = true;
    setTimerActive(false);
    clearTimeout(timerRef.current);
    setLoading(true);
    setRequestError("");

    let nextFeedback;
    try {
      const res = await getFeedback({ question: questions[currentQ], answer: submittedAnswer, resume, jobDescription });
      nextFeedback = res.data?.feedback;
      if (!nextFeedback) throw new Error("No feedback returned");
    } catch {
      nextFeedback = createOfflineFeedback(questions[currentQ], submittedAnswer);
      setRequestError("AI is temporarily unavailable, so offline feedback was used.");
    }

    setFeedback(nextFeedback);
    setAllAnswers((previous) => [...previous, {
      question: questions[currentQ],
      answer: submittedAnswer,
      feedback: nextFeedback,
      difficulty,
      timeTaken: TIMER_LIMITS[difficulty] - timeLeft,
    }]);
    submittingRef.current = false;
    setLoading(false);
  }

  async function handleSubmitAnswer(answerOverride) {
    const submittedAnswer = (typeof answerOverride === "string" ? answerOverride : answer).trim();
    if (!submittedAnswer || submittingRef.current) return;
    submittingRef.current = true;
    setRequestError("");
    setTimerActive(false);
    clearTimeout(timerRef.current);
    setLoading(true);
    try {
      const res = await getFeedback({ question: questions[currentQ], answer: submittedAnswer, resume, jobDescription });
      if (!res.data?.feedback) throw new Error("No feedback returned");
      setFeedback(res.data.feedback);
      setAllAnswers(prev => [...prev, {
        question: questions[currentQ], answer: submittedAnswer,
        feedback: res.data.feedback, difficulty,
        timeTaken: TIMER_LIMITS[difficulty] - timeLeft,
      }]);
    } catch {
       setRequestError("Retrying feedback request...");
       try {
      await new Promise(r => setTimeout(r, 2000)); // 2 sec wait
      const res = await getFeedback({ 
        question: questions[currentQ], 
        answer, 
        resume, 
        jobDescription 
      });
      setFeedback(res.data.feedback);
      setAllAnswers(prev => [...prev, {
        question: questions[currentQ], answer,
        feedback: res.data.feedback, difficulty,
        timeTaken: TIMER_LIMITS[difficulty] - timeLeft,
      }]);
      
    }
     catch {
      alert("Failed to get feedback — please try again");
      setTimerActive(true);}
     }
    finally { submittingRef.current = false; setLoading(false); }
  }


  async function handleNext() {
    if (currentQ + 1 < questions.length) {
      setCurrentQ(q => q + 1); setAnswer(""); setFeedback(null); setRequestError("");
    } else {
      setLoading(true);
      try {
        const res = await getReport({ answers: allAnswers, jobDescription });
        if (document.fullscreenElement) document.exitFullscreen();
        stopCamera();
        let language = "javascript";
        try {
          const languageResponse = await detectLanguage({ resume });
          if (languageResponse.data?.hasCode && languageResponse.data?.language) language = languageResponse.data.language;
        } catch {
          // JavaScript is a reliable default for the coding round.
        }
        navigate("/coding", {
          state: {
            language,
            difficulty,
            resume,
            jobDescription,
            interviewReport: {
              report: res.data.report,
              allAnswers,
              proctoring: {
                integrityScore: Math.max(0, 100 - tabSwitchCount * 15),
                tabSwitches: tabSwitchCount,
                cameraUsed: cameraOn,
              },
            },
          },
        });
      } catch { alert("Failed to generate report"); }
      finally { setLoading(false); }
    }
  }

  if (!questions.length) { navigate("/home"); return null; }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const timerColor = timeLeft <= 30 ? "text-red-400" : timeLeft <= 60 ? "text-amber-400" : "text-green-400";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Instructions Modal */}
      {showInstructions && (
        <InstructionsModal difficulty={difficulty} onStart={() => { setShowInstructions(false); setTimerActive(true); }} />
      )}

      {/* Tab Warning Banner */}
      {tabWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-3 font-bold text-sm animate-pulse">
          ⚠️ Tab switch / fullscreen exit detected! ({tabSwitchCount} time{tabSwitchCount > 1 ? "s" : ""}) — Stay focused!
        </div>
      )}

      {securityLock && (
        <div className="fixed inset-0 z-[60] bg-gray-950/95 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-gray-900 border border-red-500/40 rounded-2xl p-7 text-center space-y-4">
            <div className="text-3xl">🔒</div>
            <h2 className="text-xl font-bold">Interview Paused</h2>
            <p className="text-sm text-gray-400">A tab switch or fullscreen exit was detected. Re-enter fullscreen to continue.</p>
            <button onClick={resumeSecureInterview} className="w-full py-3 rounded-xl bg-cyan-500 text-gray-950 font-bold text-sm">Resume in Fullscreen</button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-gray-500">{currentQ + 1}/{questions.length}</span>
            <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${DIFFICULTY_COLORS[difficulty]}`}>{difficulty}</span>
            {tabSwitchCount > 0 && <span className="text-xs text-red-400 font-mono">⚠ {tabSwitchCount} switch{tabSwitchCount > 1 ? "es" : ""}</span>}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={cameraOn ? stopCamera : startCamera}
              className={`text-xs px-3 py-1.5 rounded-lg border font-mono transition-all ${cameraOn ? "border-green-500/40 text-green-400 bg-green-500/10" : "border-gray-700 text-gray-500 hover:text-white hover:border-gray-500"}`}>
              {cameraOn ? "📹 Camera On" : "📷 Camera Off"}
            </button>
            {!feedback && (
              <div className={`font-mono text-lg font-bold ${timerColor} ${timerWarning ? "animate-pulse" : ""}`}>
                ⏱ {mins}:{secs}
              </div>
            )}
          </div>
        </div>

        {/* Camera Preview */}
        {cameraOn && (
          <div className="mb-4 flex justify-end">
           <div className="relative w-56 h-40 rounded-xl overflow-hidden border border-red-500/50 bg-gray-900"> 
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-1 left-2 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-white font-mono">LIVE</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="h-1 bg-gray-800 rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${(currentQ / questions.length) * 100}%` }} />
        </div>
        <div className="flex gap-1.5 mb-5">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < currentQ ? "bg-cyan-500" : i === currentQ ? "bg-cyan-400" : "bg-gray-800"}`} />
          ))}
        </div>

        {/* Question */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-7 mb-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-xs font-mono text-cyan-400">QUESTION {currentQ + 1}</div>
            {!answer && !feedback && <button onClick={regenerateCurrentQuestion} disabled={regenerating}
              className="text-xs text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded-lg hover:bg-cyan-500/10 disabled:opacity-50">
              {regenerating ? "Generating..." : "↻ New question"}
            </button>}
          </div>
          <h2 className="text-lg font-semibold leading-relaxed">{questions[currentQ]}</h2>
        </div>

        {/* Answer */}
        {!feedback && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-300">Your Answer</label>
              <button onClick={toggleVoice}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${listening ? "bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"}`}>
                🎙 {listening ? "Listening..." : "Voice Input"}
              </button>
            </div>
            <textarea rows={5} value={answer} onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer or use voice input..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-cyan-500 resize-none" />
            {timerWarning && timeLeft > 0 && (
              <p className="text-red-400 text-xs font-mono animate-pulse">⚠ Only {timeLeft}s remaining!</p>
            )}
            {requestError && <p className="text-red-400 text-xs text-center">{requestError}</p>}
            <button onClick={handleSubmitAnswerSafe} disabled={loading || !answer.trim()}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm disabled:opacity-50">
              {loading ? "Analyzing..." : "Get AI Feedback →"}
            </button>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-7 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-300">AI Feedback</span>
              <div className="flex items-center gap-2">
                <div className={`text-2xl font-bold ${feedback.score >= 8 ? "text-green-400" : feedback.score >= 5 ? "text-amber-400" : "text-red-400"}`}>{feedback.score}</div>
                <span className="text-gray-500 text-sm">/10</span>
              </div>
            </div>
            <div className="text-xs font-mono text-gray-600">⏱ Time taken: {TIMER_LIMITS[difficulty] - timeLeft}s</div>
            <div>
              <div className="text-xs font-mono text-green-400 mb-2">✓ STRENGTHS</div>
              <ul className="space-y-1.5">{feedback.strengths?.map((s, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-green-400">▸</span>{s}</li>)}</ul>
            </div>
            <div>
              <div className="text-xs font-mono text-amber-400 mb-2">⚠ IMPROVEMENTS</div>
              <ul className="space-y-1.5">{feedback.improvements?.map((s, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-amber-400">▸</span>{s}</li>)}</ul>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="text-xs font-mono text-cyan-400 mb-2">💡 BETTER ANSWER</div>
              <p className="text-sm text-gray-300 leading-relaxed">{feedback.betterAnswer}</p>
            </div>
            <button onClick={handleNext} disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-sm disabled:opacity-50">
              {loading ? "Generating Report..." : currentQ + 1 < questions.length ? "Next Question →" : "See Final Report →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
