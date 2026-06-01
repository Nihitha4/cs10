const mongoose = require("mongoose");
const Query = require("../models/Query");
const Answer = require("../models/Answer");
const FAQ = require("../models/FAQ");
const { callGroqJson, aiSpamFilter, frameQuery, generateEmbedding } = require("./groq.service");
const { manualSpamFilter } = require("./manualSpamFilter");
const { normalizeText } = require("../utils/text");
const { paginate, paginationMeta } = require("../utils/pagination");

// Admin answer gets a large bonus score so it always sorts first when pinned
const ADMIN_PIN_SCORE_BONUS = 10000;

function recalculateScore(upvotes = 0, downvotes = 0) {
  return Number(upvotes || 0) - Number(downvotes || 0);
}

// Phase 1 & 2: Ingestion Pipeline
async function createCommunityQuestion({ question, askedBy, categoryHint, userId }) {
  const manualCheck = manualSpamFilter(question);
  if (manualCheck.isSpam) {
    await Query.create({ rawText: question, userId, status: 'spam', spamStage: 'manual', spamReason: manualCheck.reason });
    throw new Error(`Your submission was flagged as spam: ${manualCheck.reason}`);
  }

  const isAiSpam = await aiSpamFilter(question);
  if (isAiSpam) {
    await Query.create({ rawText: question, userId, status: 'spam', spamStage: 'ai', spamReason: 'Flagged by Groq AI' });
    throw new Error("Your submission was flagged as irrelevant or inappropriate by AI.");
  }

  const framed = await frameQuery(question);
  const embedding = await generateEmbedding(framed);

  const item = await Query.create({
    rawText: question,
    userId: userId || null,
    framedQuery: framed,
    embedding: embedding,
    status: 'pending'
  });

  return item;
}

async function listCommunityQuestions({ search, page, limit }) {
  const { skip, page: safePage, limit: safeLimit } = paginate(page, limit, 100);
  const filter = { status: { $in: ["pending", "community"] } };

  if (search) {
    const clean = normalizeText(search);
    filter.$or = [
      { rawText: { $regex: clean, $options: "i" } },
      { framedQuery: { $regex: clean, $options: "i" } }
    ];
  }

  const [items, total] = await Promise.all([
    Query.find(filter)
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Query.countDocuments(filter)
  ]);

  return { items, pagination: paginationMeta(total, safePage, safeLimit) };
}

async function addCommunityAnswer(queryId, { answerText, answeredBy, userId }) {
  const q = await Query.findById(queryId);
  if (!q) throw new Error("Query not found");

  const answer = await Answer.create({
    queryId,
    text: answerText,
    userId: userId || null
  });

  if (userId) {
    if (!q.responseList) q.responseList = [];
    if (!q.responseList.includes(userId)) {
      q.responseList.push(userId);
      await q.save();
    }
  }

  return answer;
}

// Admin posts a direct answer (no AI, full manual control)
async function addAdminAnswer(queryId, { answerText, adminId }) {
  const q = await Query.findById(queryId);
  if (!q) throw new Error("Query not found");

  // Unpin any existing pinned answer first
  await Answer.updateMany({ queryId, isPinned: true }, {
    $set: { isPinned: false, weightedScore: 0 }
  });

  // Recalculate scores for previously pinned answers
  const prevPinned = await Answer.find({ queryId, isPinned: false, weightedScore: ADMIN_PIN_SCORE_BONUS });
  for (const a of prevPinned) {
    a.weightedScore = recalculateScore(a.upvotes.length, a.downvotes.length);
    await a.save();
  }

  const answer = await Answer.create({
    queryId,
    text: answerText,
    adminId: adminId || null,
    isAdminAnswer: true,
    isPinned: true,
    pinnedBy: adminId || null,
    pinnedAt: new Date(),
    weightedScore: ADMIN_PIN_SCORE_BONUS
  });

  return answer;
}

async function listCommunityAnswers(queryId, { page, limit }) {
  const { skip, page: safePage, limit: safeLimit } = paginate(page, limit, 100);

  const [items, total] = await Promise.all([
    Answer.find({ queryId })
      .populate('userId', 'name')
      .populate('adminId', 'name')
      .sort({ isPinned: -1, weightedScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    Answer.countDocuments({ queryId })
  ]);

  return { items, pagination: paginationMeta(total, safePage, safeLimit) };
}

// Pin an existing answer (admin action)
async function pinCommunityAnswer(answerId, adminId) {
  const answer = await Answer.findById(answerId);
  if (!answer) throw new Error("Answer not found");

  const queryId = answer.queryId;

  // Unpin all others in same question
  await Answer.updateMany({ queryId, isPinned: true }, {
    $set: { isPinned: false }
  });

  // Fix scores of previously pinned answers
  const allAnswers = await Answer.find({ queryId });
  for (const a of allAnswers) {
    if (String(a._id) !== String(answerId)) {
      a.weightedScore = recalculateScore(a.upvotes.length, a.downvotes.length);
      await a.save();
    }
  }

  answer.isPinned = true;
  answer.pinnedBy = adminId;
  answer.pinnedAt = new Date();
  answer.weightedScore = ADMIN_PIN_SCORE_BONUS + recalculateScore(answer.upvotes.length, answer.downvotes.length);
  await answer.save();

  return answer;
}

// Unpin an answer (admin action)
async function unpinCommunityAnswer(answerId) {
  const answer = await Answer.findById(answerId);
  if (!answer) throw new Error("Answer not found");

  answer.isPinned = false;
  answer.pinnedBy = null;
  answer.pinnedAt = null;
  answer.weightedScore = recalculateScore(answer.upvotes.length, answer.downvotes.length);
  await answer.save();

  return answer;
}

async function voteCommunityQuestion(questionId, type) {
  return null;
}

async function voteCommunityAnswer(answerId, type, userId) {
  const a = await Answer.findById(answerId);
  if (!a) throw new Error("Answer not found");

  if (!userId) throw new Error("You must be logged in to vote");

  const upIndex = a.upvotes.indexOf(userId);
  const downIndex = a.downvotes.indexOf(userId);

  if (type === "up") {
    if (upIndex > -1) {
      a.upvotes.splice(upIndex, 1);
    } else {
      a.upvotes.push(userId);
      if (downIndex > -1) a.downvotes.splice(downIndex, 1);
    }
  } else if (type === "down") {
    if (downIndex > -1) {
      a.downvotes.splice(downIndex, 1);
    } else {
      a.downvotes.push(userId);
      if (upIndex > -1) a.upvotes.splice(upIndex, 1);
    }
  }

  // Preserve pin bonus if answer is pinned
  const baseScore = recalculateScore(a.upvotes.length, a.downvotes.length);
  a.weightedScore = a.isPinned ? ADMIN_PIN_SCORE_BONUS + baseScore : baseScore;
  await a.save();
  return a;
}

// ─── Manual Clustering (no AI) ───────────────────────────────────────────────
// Groups questions by simple keyword overlap – admin reviews and merges manually
async function getManualClusterCandidates() {
  const questions = await Query.find({ status: { $in: ["pending", "community"] } })
    .limit(200)
    .lean();

  if (!questions.length) return [];

  // Tokenize each question
  function tokenize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w));
  }

  const STOP_WORDS = new Set([
    'what', 'when', 'where', 'which', 'that', 'this', 'with', 'have', 'from',
    'they', 'will', 'been', 'were', 'your', 'about', 'there', 'their', 'would',
    'could', 'should', 'does', 'much', 'many', 'more', 'some', 'also', 'into',
    'than', 'then', 'just', 'like', 'time', 'very', 'only', 'over', 'such',
    'even', 'most', 'other', 'back', 'after', 'well', 'know', 'here', 'need',
  ]);

  const tokenized = questions.map(q => ({
    ...q,
    tokens: new Set(tokenize(q.framedQuery || q.rawText))
  }));

  // Jaccard similarity
  function jaccard(setA, setB) {
    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  const THRESHOLD = 0.25;
  const visited = new Set();
  const clusters = [];

  for (let i = 0; i < tokenized.length; i++) {
    if (visited.has(i)) continue;
    const cluster = [tokenized[i]];
    visited.add(i);

    for (let j = i + 1; j < tokenized.length; j++) {
      if (visited.has(j)) continue;
      const sim = jaccard(tokenized[i].tokens, tokenized[j].tokens);
      if (sim >= THRESHOLD) {
        cluster.push(tokenized[j]);
        visited.add(j);
      }
    }

    if (cluster.length >= 2) {
      clusters.push({
        representativeQuestion: cluster[0].framedQuery || cluster[0].rawText,
        questions: cluster.map(q => ({
          id: String(q._id),
          question: q.framedQuery || q.rawText,
          rawText: q.rawText,
          createdAt: q.createdAt
        })),
        count: cluster.length
      });
    }
  }

  return clusters.sort((a, b) => b.count - a.count);
}

// AI Clustering (kept for optional use)
async function runGlobalAiClustering(apiKey) {
  const questions = await Query.find({ status: { $in: ["pending", "community"] } }).limit(80).lean();
  if (!questions.length) return [];

  const qList = questions.map(q => `ID: ${q._id} | Q: ${q.framedQuery || q.rawText}`).join("\n");
  const clusterPrompt = `You are an expert AI clustering algorithm. 
Group the following community queries into logical clusters based on semantic similarity. Only group queries that are asking the same underlying thing.
For each cluster, formulate a clear, professional "masterQuestion" that represents the group.

Queries:
${qList}

Return ONLY a JSON object with this exact schema (no markdown, no comments):
{
  "clusters": [
    {
      "masterQuestion": "string",
      "questionIds": ["string"]
    }
  ]
}`;

  const clusterRes = await callGroqJson([
    { role: "system", content: "You are an intelligent JSON-only grouping assistant." },
    { role: "user", content: clusterPrompt }
  ], { maxTokens: 4000, timeoutMs: 30000, model: "llama-3.3-70b-versatile", apiKey });

  if (!clusterRes || !clusterRes.clusters) throw new Error("Failed to cluster questions via AI");

  const finalProposals = [];
  const qDict = {};
  for (const q of questions) qDict[String(q._id)] = q;

  for (const cluster of clusterRes.clusters) {
    if (!cluster.questionIds || cluster.questionIds.length === 0) continue;
    const validIds = cluster.questionIds.filter(id => qDict[id]);
    if (validIds.length === 0) continue;

    const answers = await Answer.find({ queryId: { $in: validIds } }).sort({ weightedScore: -1 }).limit(15).lean();
    const aTexts = answers.length > 0
      ? answers.map((a, i) => `A${i + 1}: ${a.text}`).join("\n")
      : "No community answers provided.";

    const ansPrompt = `Based on the answers to "${cluster.masterQuestion}", synthesize a single masterAnswer. Also provide a category and tags.

Answers:
${aTexts}

Return ONLY a JSON object:
{
  "masterAnswer": "string",
  "category": "string",
  "tags": ["string"]
}`;

    try {
      const ansRes = await callGroqJson([
        { role: "system", content: "You are an intelligent JSON-only summarization assistant." },
        { role: "user", content: ansPrompt }
      ], { maxTokens: 1500, timeoutMs: 15000, apiKey });

      if (ansRes && ansRes.masterAnswer) {
        finalProposals.push({
          masterQuestion: cluster.masterQuestion,
          questionIds: validIds,
          originalQuestions: validIds.map(id => ({
            id,
            question: qDict[id].framedQuery || qDict[id].rawText,
            askedBy: qDict[id].userId
          })),
          masterAnswer: ansRes.masterAnswer,
          category: ansRes.category || "General",
          tags: ansRes.tags || []
        });
      }
    } catch (e) {
      console.error("Failed to generate answer for cluster:", e);
    }
  }

  return finalProposals;
}

async function createMasterFaqFromCluster({ questionIds, masterQuestion, masterAnswer, category, tags, keywords, priority, adminId }) {
  const faq = await FAQ.create({
    question: masterQuestion,
    answer: masterAnswer,
    category: category || "General",
    tags: tags || [],
    keywords: keywords || [],
    priority: priority || 5,
    status: "approved",
    active: true,
    createdBy: adminId,
    updatedBy: adminId,
    submittedBy: "community_master"
  });

  await Query.updateMany(
    { _id: { $in: questionIds.map(id => new mongoose.Types.ObjectId(id)) } },
    { $set: { status: "resolved", resolvedByUser: true } }
  );

  return faq;
}

async function deleteCommunityQuestion(questionId) {
  const q = await Query.findByIdAndDelete(questionId);
  if (!q) throw new Error("Query not found");
  await Answer.deleteMany({ queryId: questionId });
  return true;
}

async function findSimilarApprovedFaq() { return null; }
async function getMasterCandidates() { return []; }
async function generateMasterContent() { return {}; }

module.exports = {
  createCommunityQuestion,
  listCommunityQuestions,
  addCommunityAnswer,
  addAdminAnswer,
  listCommunityAnswers,
  pinCommunityAnswer,
  unpinCommunityAnswer,
  voteCommunityQuestion,
  voteCommunityAnswer,
  findSimilarApprovedFaq,
  getMasterCandidates,
  createMasterFaqFromCluster,
  generateMasterContent,
  deleteCommunityQuestion,
  runGlobalAiClustering,
  getManualClusterCandidates
};
