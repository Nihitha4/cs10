const express = require("express");
const adminController = require("../controllers/admin.controller");
const analyticsController = require("../controllers/analytics.controller");
const moderationController = require("../controllers/moderation.controller");
const faqController = require("../controllers/faq.controller");
const categoryController = require("../controllers/category.controller");
const communityController = require("../controllers/community.controller");
const validate = require("../middlewares/validate");
const { authenticate } = require("../middlewares/auth");
const auditLog = require("../middlewares/audit");
const { loginSchema, createAdminSchema, moderationActionSchema } = require("../validators/admin.validator");
const { faqBodySchema, faqUpdateSchema } = require("../validators/faq.validator");
const { categoryBodySchema, categoryUpdateSchema } = require("../validators/category.validator");
const { masterFaqSchema } = require("../validators/community.validator");

const router = express.Router();

router.post("/login", validate(loginSchema), adminController.login);
router.use(authenticate());

router.get("/dashboard", adminController.dashboard);
router.post("/admins", authenticate("admin"), validate(createAdminSchema), auditLog("create_admin", "AdminUser"), adminController.createAdmin);

// FAQ management
router.post("/faqs", validate(faqBodySchema), auditLog("create_faq", "FAQ"), adminController.createFaq);
router.put("/faqs/:id", validate(faqUpdateSchema), auditLog("update_faq", "FAQ"), adminController.updateFaq);
router.delete("/faqs/:id", auditLog("delete_faq", "FAQ"), adminController.deleteFaq);

// Category management
router.post("/categories", validate(categoryBodySchema), auditLog("create_category", "Category"), adminController.createCategory);
router.put("/categories/:id", validate(categoryUpdateSchema), auditLog("update_category", "Category"), adminController.updateCategory);
router.delete("/categories/:id", auditLog("delete_category", "Category"), adminController.deleteCategory);

// Moderation
router.get("/moderation", moderationController.getQueue);
router.post("/moderation/:id/approve", validate(moderationActionSchema), auditLog("approve_submission", "AnswerSubmission"), moderationController.approve);
router.post("/moderation/:id/reject", validate(moderationActionSchema), auditLog("reject_submission", "AnswerSubmission"), moderationController.reject);

// FAQ proposals
router.get("/faq-proposals", faqController.listPending);
router.post("/faq-proposals/:id/approve", auditLog("approve_faq_proposal", "FAQ"), faqController.approve);
router.post("/faq-proposals/:id/reject", auditLog("reject_faq_proposal", "FAQ"), faqController.reject);

// Community — Manual clustering (no AI required)
router.get("/community/manual-clusters", auditLog("manual_cluster_view", "Query"), communityController.manualClusterCandidates);

// Community — Admin direct answer & pin controls
router.post("/community/questions/:id/answer", auditLog("admin_post_answer", "Answer"), communityController.adminPostAnswer);
router.post("/community/answers/:id/pin", auditLog("pin_answer", "Answer"), communityController.pinAnswer);
router.post("/community/answers/:id/unpin", auditLog("unpin_answer", "Answer"), communityController.unpinAnswer);

// Community — AI clustering (optional, requires API key)
router.get("/community/master-candidates", communityController.masterCandidates);
router.post("/community/generate-master", communityController.generateMaster);
router.post("/community/create-master-faq", validate(masterFaqSchema), auditLog("create_master_faq_from_community", "FAQ"), communityController.createMasterFaq);
router.post("/community/global-ai-cluster", auditLog("global_ai_cluster", "FAQ"), communityController.globalAiCluster);
router.delete("/community/questions/:id", auditLog("delete_community_question", "CommunityQuestion"), communityController.deleteQuestion);

// Analytics
router.get("/analytics", analyticsController.getAnalytics);
router.get("/query-logs", analyticsController.getQueryLogs);

module.exports = router;
