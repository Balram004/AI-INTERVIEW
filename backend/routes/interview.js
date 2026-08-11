import express from "express";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseAIJson(raw, type = "object") {
  const clean = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const direct = JSON.parse(clean);
  if ((type === "array" && Array.isArray(direct)) || (type === "object" && !Array.isArray(direct) && direct)) return direct;
  throw new Error("AI returned an unexpected JSON shape");
}

async function askAI(options, type = "object") {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const completion = await groq.chat.completions.create({ model: MODEL, ...options });
      return parseAIJson(completion.choices?.[0]?.message?.content, type);
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.response?.status;
      if (attempt === 2 || (status && status < 429)) break;
      await wait(800 * (attempt + 1));
    }
  }
  throw lastError;
}

function localFeedback(question, answer) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const hasExample = /\b(example|for example|because|result|impact|built|implemented)\b/i.test(answer);
  const score = Math.max(3, Math.min(9, Math.round(4 + Math.min(words.length, 120) / 30 + (hasExample ? 1 : 0))));
  return {
    score,
    strengths: [words.length >= 30 ? "Gave a reasonably detailed answer" : "Addressed the question directly", hasExample ? "Included supporting context or an example" : "Used relevant technical terminology"],
    improvements: [words.length < 60 ? "Add a concrete example with your role and outcome" : "Make the answer more structured: context, action, and result", "Mention measurable impact or a clear takeaway where possible"],
    betterAnswer: `For “${question}”, structure your response with the situation, the action you personally took, and the outcome. State the relevant tools or concepts, then finish with a measurable result or lesson learned.`,
  };
}

function localReport(answers = []) {
  const scores = answers.map((item) => Number(item.feedback?.score) || 0).filter(Boolean);
  const overallScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 5;
  return {
    overallScore,
    summary: `You completed ${answers.length} interview question${answers.length === 1 ? "" : "s"}. Your answers show a solid foundation; focus on making each response concise, specific, and outcome-oriented.`,
    topStrengths: ["Attempted every question", "Communicated relevant ideas", "Demonstrated willingness to explain reasoning"],
    areasToImprove: ["Use a clear STAR structure for experience questions", "Add concrete project outcomes and metrics", "Connect technical decisions to business impact"],
    recommendation: overallScore >= 8 ? "Hire" : overallScore >= 6 ? "Consider" : "Not Recommended",
  };
}

function fallbackQuestions(jobDescription = "", company = "") {
  const role = jobDescription.match(/(?:role|position|developer|engineer)[^\n.]*/i)?.[0] || "this role";
  const companyContext = company ? " at " + company : "";
  return [
    "Walk me through a recent project that best demonstrates your fit for " + role + companyContext + ".",
    "How would you design a reliable API or service for a real user-facing feature" + companyContext + "?",
    "Describe a difficult bug or production issue you solved. How did you investigate and prevent it from returning?",
    "Tell me about a time you disagreed with a technical decision. How did you communicate your approach and what was the outcome?",
    "If you joined this team tomorrow, what would your first 30 days of learning and contribution look like?",
  ];
}

function uniqueStrings(items, excluded = [], limit = 5) {
  const seen = new Set(excluded.map((item) => String(item).trim().toLowerCase()));
  return items.reduce((result, item) => {
    const value = String(typeof item === "string" ? item : item?.question || item?.text || "").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return result;
    seen.add(key);
    result.push(value);
    return result;
  }, []).slice(0, limit);
}

const codingProblemBank = {
  Medium: [
    {
      title: "Longest Substring Without Repeating Characters",
      description: "Given a string s, find the length of the longest substring without repeating characters.",
      examples: [{ input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc", with length 3.' }],
      testCases: [{ input: 's = "abcabcbb"', expected: "3" }, { input: 's = "bbbbb"', expected: "1" }, { input: 's = "pwwkew"', expected: "3" }],
      starterCode: "function lengthOfLongestSubstring(s) {\n  // Use a sliding window\n}",
    },
    {
      title: "Number of Islands",
      description: "Given a grid of 1s and 0s, return the number of islands. An island is formed by connected horizontal or vertical land cells.",
      examples: [{ input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]', output: "2", explanation: "There are two connected groups of land." }],
      testCases: [{ input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]', expected: "2" }, { input: 'grid = [["0","0"],["0","0"]]', expected: "0" }],
      starterCode: "function numIslands(grid) {\n  // Use DFS or BFS\n}",
    },
    {
      title: "Top K Frequent Elements",
      description: "Given an integer array nums and an integer k, return the k most frequent elements.",
      examples: [{ input: "nums = [1,1,1,2,2,3], k = 2", output: "[1,2]", explanation: "1 appears three times and 2 appears twice." }],
      testCases: [{ input: "nums = [1,1,1,2,2,3], k = 2", expected: "[1,2]" }, { input: "nums = [1], k = 1", expected: "[1]" }],
      starterCode: "function topKFrequent(nums, k) {\n  // Use a frequency map and bucket sort or heap\n}",
    },
  ],
  Hard: [
    {
      title: "Trapping Rain Water",
      description: "Given n non-negative integers representing an elevation map, compute how much water it can trap after raining.",
      examples: [{ input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6", explanation: "Six units of water are trapped." }],
      testCases: [{ input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", expected: "6" }, { input: "height = [4,2,0,3,2,5]", expected: "9" }],
      starterCode: "function trap(height) {\n  // Aim for an O(n) two-pointer solution\n}",
    },
    {
      title: "Median of Two Sorted Arrays",
      description: "Given two sorted arrays nums1 and nums2, return the median of the two sorted arrays in O(log(m+n)) time.",
      examples: [{ input: "nums1 = [1,3], nums2 = [2]", output: "2.0", explanation: "The combined sorted array is [1,2,3]." }],
      testCases: [{ input: "nums1 = [1,3], nums2 = [2]", expected: "2.0" }, { input: "nums1 = [1,2], nums2 = [3,4]", expected: "2.5" }],
      starterCode: "function findMedianSortedArrays(nums1, nums2) {\n  // Use binary search on the smaller array\n}",
    },
    {
      title: "Largest Rectangle in Histogram",
      description: "Given an array of bar heights, find the area of the largest rectangle in the histogram.",
      examples: [{ input: "heights = [2,1,5,6,2,3]", output: "10", explanation: "The largest rectangle uses heights 5 and 6." }],
      testCases: [{ input: "heights = [2,1,5,6,2,3]", expected: "10" }, { input: "heights = [2,4]", expected: "4" }],
      starterCode: "function largestRectangleArea(heights) {\n  // Use a monotonic stack\n}",
    },
  ],
};

// Generate interview questions
router.post("/questions", async (req, res) => {
  const { resume, jobDescription, company = "", excludedQuestions = [], count = 5 } = req.body;
  const questionCount = Math.min(Math.max(Number(count) || 5, 1), 5);
  try {
    const questions = await askAI({
      messages: [{
        role: "system",
        content: "You are an expert technical interviewer. Generate exactly " + questionCount + " distinct interview questions based on the candidate's resume and job description. Use different categories where possible: technical fundamentals, project experience, system design or debugging, behavioral collaboration, and role-specific scenario. Do not repeat or paraphrase excluded questions. Company context: " + (company || "general technology company") + ". Return only a JSON array.",
      }, {
        role: "user",
        content: "Resume: " + resume + "\n\nJob Description: " + jobDescription + "\n\nExcluded questions: " + JSON.stringify(excludedQuestions),
      }],
      max_tokens: 1000,
      temperature: 0.1,
    }, "array");
    const uniqueQuestions = uniqueStrings(questions, excludedQuestions, questionCount);
    if (uniqueQuestions.length < questionCount) throw new Error("Not enough unique questions");
    res.json({ success: true, questions: uniqueQuestions });
  } catch (err) {
    console.error(err);
    const questions = uniqueStrings(fallbackQuestions(jobDescription, company), excludedQuestions, questionCount);
    res.json({ success: true, questions, fallback: true });
  }
});

// Evaluate answer
router.post("/feedback", async (req, res) => {
  const { question, answer, resume, jobDescription } = req.body;
  try {
    const feedback = await askAI({
      messages: [{
        role: "system",
        content: `You are an expert interview coach. Evaluate the candidate's answer and return ONLY a JSON object:
{
  "score": 7,
  "strengths": ["point 1", "point 2"],
  "improvements": ["point 1", "point 2"],
  "betterAnswer": "A sample better answer here..."
}
Score should be out of 10. No extra text, just JSON.`,
      }, {
        role: "user",
        content: `Job Description: ${jobDescription}\n\nQuestion: ${question}\n\nCandidate Answer: ${answer}`,
      }],
      max_tokens: 1000,
      temperature: 0.1,
    });
    if (!Number.isFinite(Number(feedback.score))) throw new Error("Invalid feedback");
    res.json({ success: true, feedback });
  } catch (err) {
    console.error(err);
    // Keep the interview moving even when the AI provider is temporarily rate-limited.
    res.json({ success: true, feedback: localFeedback(question, answer), fallback: true });
  }
});

// Generate final report
router.post("/report", async (req, res) => {
  const { answers, jobDescription } = req.body;
  try {
    const report = await askAI({
      messages: [{
        role: "system",
        content: `You are an expert interview coach. Based on all answers, generate a final report. Return ONLY JSON:
{
  "overallScore": 7,
  "summary": "Overall performance summary here...",
  "topStrengths": ["strength 1", "strength 2", "strength 3"],
  "areasToImprove": ["area 1", "area 2", "area 3"],
  "recommendation": "Hire"
}
recommendation must be exactly one of: "Hire", "Consider", "Not Recommended"
No extra text, just JSON.`,
      }, {
        role: "user",
        content: `Job Description: ${jobDescription}\n\nAll Q&A: ${JSON.stringify(answers)}`,
      }],
      max_tokens: 1000,
      temperature: 0.1,
    });
    if (!Number.isFinite(Number(report.overallScore))) throw new Error("Invalid report");
    res.json({ success: true, report });
  } catch (err) {
    console.error(err);
    res.json({ success: true, report: localReport(answers), fallback: true });
  }
});

// Resume Tips Route
router.post("/resume-tips", async (req, res) => {
  const { resume, jobDescription } = req.body;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "system",
        content: `You are an expert resume coach. Analyze the resume against the job description and return ONLY JSON:
{
  "matchScore": 7,
  "missingKeywords": ["keyword1", "keyword2"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"],
  "improvedSummary": "An improved professional summary here..."
}
No extra text, just JSON.`
      }, {
        role: "user",
        content: `Resume: ${resume}\n\nJob Description: ${jobDescription}`
      }],
      max_tokens: 1000,
      temperature: 0.1,
    });
    const raw = completion.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON");
    const tips = JSON.parse(jsonMatch[0]);
    res.json({ success: true, tips });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to analyze resume" });
  }
});

// HR Round Route
router.post("/hr-questions", async (req, res) => {
  const { resume, jobDescription } = req.body;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "system",
        content: `You are an expert HR interviewer. Generate 5 HR interview questions based on the resume and job description. Return ONLY a valid JSON array:
["HR Question 1?", "HR Question 2?", "HR Question 3?", "HR Question 4?", "HR Question 5?"]
No extra text, just the JSON array.`
      }, {
        role: "user",
        content: `Resume: ${resume}\n\nJob Description: ${jobDescription}`
      }],
      max_tokens: 800,
      temperature: 0.1,
    });
    const raw = completion.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Invalid JSON");
    const questions = JSON.parse(jsonMatch[0]);
    res.json({ success: true, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to generate HR questions" });
  }
});

// Detect language from resume
router.post("/detect-language", async (req, res) => {
  const { resume } = req.body;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "system",
        content: `Analyze the resume and detect the primary programming language. Return ONLY JSON:
{"language": "javascript", "hasCode": true}
language must be one of: "javascript", "python", "java", "cpp", "other"
hasCode must be true if they know any programming language.
No extra text, just JSON.`
      }, {
        role: "user",
        content: `Resume: ${resume}`
      }],
      max_tokens: 100,
      temperature: 0.1,
    });
    const raw = completion.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON");
    const result = JSON.parse(jsonMatch[0]);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate coding problem
router.post("/coding-problem", async (req, res) => {
  const { language, difficulty, excludedTitles = [] } = req.body;
  const bank = codingProblemBank[difficulty] || codingProblemBank.Medium;
  const availableProblems = bank.filter((problem) => !excludedTitles.includes(problem.title));
  const selectedProblem = (availableProblems.length ? availableProblems : bank)[Math.floor(Math.random() * (availableProblems.length ? availableProblems.length : bank.length))];
  // A curated bank gives every candidate realistic, deterministic LeetCode-style tasks.
  if (selectedProblem) return res.json({ success: true, problem: selectedProblem, source: "curated" });
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "system",
        content: `Generate a coding problem for ${language} at ${difficulty} level. Return ONLY JSON:
{
  "title": "Two Sum",
  "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  "examples": [
    {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] = 9"},
    {"input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": "nums[1] + nums[2] = 6"}
  ],
  "testCases": [
    {"input": "nums = [2,7,11,15], target = 9", "expected": "[0,1]"},
    {"input": "nums = [3,2,4], target = 6", "expected": "[1,2]"},
    {"input": "nums = [1,5,3,2], target = 4", "expected": "[2,3]"},
    {"input": "nums = [0,4,3,0], target = 0", "expected": "[0,3]"}
  ],
  "starterCode": "function twoSum(nums, target) {\n  // Write your code here\n}"
}
No extra text, just JSON.`
      }, {
        role: "user",
        content: `Generate a ${difficulty} level problem for ${language}`
      }],
      max_tokens: 1000,
      temperature: 0.3,
    });
    const raw = completion.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON");
    const problem = JSON.parse(jsonMatch[0]);
    res.json({ success: true, problem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Evaluate code with test cases
router.post("/evaluate-code", async (req, res) => {
  const { code, language, problem } = req.body;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{
        role: "system",
        content: `You are a code evaluator. Evaluate the ${language} code against the test cases and return ONLY JSON:
{
  "testResults": [
    {"input": "test input", "expected": "expected output", "actual": "actual output", "passed": true},
    {"input": "test input 2", "expected": "expected output 2", "actual": "wrong output", "passed": false}
  ],
  "passedCount": 3,
  "totalCount": 4,
  "score": 7,
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "feedback": "Brief feedback on the solution",
  "optimizedSolution": "A better solution if possible"
}
Carefully trace through the code logic for each test case. No extra text, just JSON.`
      }, {
        role: "user",
        content: `Problem: ${problem.title}
Description: ${problem.description}
Test Cases: ${JSON.stringify(problem.testCases)}
Code submitted:
${code}
Language: ${language}`
      }],
      max_tokens: 1500,
      temperature: 0.1,
    });
    const raw = completion.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON");
    const result = JSON.parse(jsonMatch[0]);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
