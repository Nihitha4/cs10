const HttpError = require("../utils/httpError");
const {
  createCommunityQuestion,
  listCommunityQuestions,
  addCommunityAnswer,
  addAdminAnswer,
  listCommunityAnswers,
  pinCommunityAnswer,
  unpinCommunityAnswer,
  voteCommunityQuestion,
  voteCommunityAnswer,
  getMasterCandidates,
  createMasterFaqFromCluster,
  generateMasterContent,
  deleteCommunityQuestion,
  runGlobalAiClustering,
  getManualClusterCandidates
} = require("../services/community.service");

async function createQuestion(req, res, next) {
  try {
    const payload = { ...req.body };
    if (req.user) {
      payload.userId = req.user.id;
      payload.askedBy = req.body.askedBy || req.user.name;
    }
    const item = await createCommunityQuestion(payload);
    res.status(201).json({ status: "ok", item });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
}

async function listQuestions(req, res, next) {
  try {
    const data = await listCommunityQuestions(req.query);
    res.status(200).json({ status: "ok", ...data });
  } catch (error) {
    next(error);
  }
}

async function createAnswer(req, res, next) {
  try {
    const payload = { ...req.body };
    if (req.user) {
      payload.userId = req.user.id;
      payload.answeredBy = req.body.answeredBy || req.user.name;
    }
    const item = await addCommunityAnswer(req.params.id, payload);
    res.status(201).json({ status: "ok", item });
  } catch (error) {
    next(new HttpError(404, error.message || "Question not found"));
  }
}

async function getAnswers(req, res, next) {
  try {
    const data = await listCommunityAnswers(req.params.id, req.query);
    res.status(200).json({ status: "ok", ...data });
  } catch (error) {
    next(error);
  }
}

async function voteQuestion(req, res, next) {
  try {
    const item = await voteCommunityQuestion(req.params.id, req.body.type);
    res.status(200).json({ status: "ok", item });
  } catch (error) {
    next(new HttpError(404, error.message || "Question not found"));
  }
}

async function voteAnswer(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const item = await voteCommunityAnswer(req.params.id, req.body.type, userId);
    res.status(200).json({
      status: "ok",
      item: {
        id: String(item._id),
        upvotes: item.upvotes || [],
        downvotes: item.downvotes || [],
        score: item.weightedScore,
        isPinned: item.isPinned
      }
    });
  } catch (error) {
    next(new HttpError(404, error.message || "Answer not found"));
  }
}

// Admin: Post a direct answer (no AI)
async function adminPostAnswer(req, res, next) {
  try {
    const item = await addAdminAnswer(req.params.id, {
      answerText: req.body.answerText,
      adminId: req.admin?.id
    });
    res.status(201).json({ status: "ok", item });
  } catch (error) {
    next(new HttpError(400, error.message));
  }
}

// Admin: Pin an answer
async function pinAnswer(req, res, next) {
  try {
    const item = await pinCommunityAnswer(req.params.id, req.admin?.id);
    res.status(200).json({ status: "ok", item });
  } catch (error) {
    next(new HttpError(404, error.message));
  }
}

// Admin: Unpin an answer
async function unpinAnswer(req, res, next) {
  try {
    const item = await unpinCommunityAnswer(req.params.id);
    res.status(200).json({ status: "ok", item });
  } catch (error) {
    next(new HttpError(404, error.message));
  }
}

// Admin: Manual cluster candidates (no AI)
async function manualClusterCandidates(req, res, next) {
  try {
    const clusters = await getManualClusterCandidates();
    res.status(200).json({ status: "ok", clusters });
  } catch (error) {
    next(error);
  }
}

async function masterCandidates(req, res, next) {
  try {
    const clusters = await getMasterCandidates();
    res.status(200).json({ status: "ok", clusters });
  } catch (error) {
    next(error);
  }
}

async function createMasterFaq(req, res, next) {
  try {
    const item = await createMasterFaqFromCluster({ ...req.body, adminId: req.admin?.id });
    res.status(201).json({ status: "ok", message: "Master FAQ created and merged community questions.", item });
  } catch (error) {
    next(error);
  }
}

async function generateMaster(req, res, next) {
  try {
    const { questions, answers } = req.body;
    if (!questions || !answers || !questions.length) {
      return res.status(400).json({ status: "error", message: "Questions and answers arrays are required." });
    }
    const result = await generateMasterContent({ questions, answers });
    res.status(200).json({ status: "ok", data: result });
  } catch (error) {
    next(error);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    await deleteCommunityQuestion(req.params.id);
    res.status(200).json({ status: "ok", deletedId: req.params.id });
  } catch (error) {
    next(new HttpError(404, error.message || "Question not found"));
  }
}

async function globalAiCluster(req, res, next) {
  try {
    const { apiKey } = req.body || {};
    const proposals = await runGlobalAiClustering(apiKey);
    res.status(200).json({ status: "ok", proposals });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createQuestion, listQuestions, createAnswer, getAnswers,
  voteQuestion, voteAnswer,
  adminPostAnswer, pinAnswer, unpinAnswer,
  manualClusterCandidates,
  masterCandidates, createMasterFaq, generateMaster,
  deleteQuestion, globalAiCluster
};
