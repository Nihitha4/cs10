import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  question_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  answered_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 20,
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ['live', 'flagged', 'hidden'],
    default: 'live',
  },
  ai_check_passed: {
    type: Boolean,
    default: true,
  },
  flag_reason: {
    type: String,
    default: null,
  },
  upvotes: {
    type: Number,
    default: 0,
  },
  downvotes: {
    type: Number,
    default: 0,
  },
  net_score: {
    type: Number,
    default: 0,
  },
  promoted_to_corpus: {
    type: Boolean,
    default: false,
  },
  promoted_faq_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FAQ',
    default: null,
  },
  edit_history: [
    {
      edited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      previous_content: String,
      reason: String,
      edited_at: { type: Date, default: Date.now },
    }
  ],

  // ── Admin Pin Feature ─────────────────────────────────────────
  isPinned:  { type: Boolean, default: false, index: true },
  pinnedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  pinnedAt:  { type: Date, default: null },
  isAdminAnswer: { type: Boolean, default: false },
  weightedScore: { type: Number, default: 0, index: true },
  // ─────────────────────────────────────────────────────────────

  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Existing Indexes
answerSchema.index({ question_id: 1, status: 1 });
answerSchema.index({ answered_by: 1 });
answerSchema.index({ status: 1, created_at: 1 });
answerSchema.index({ net_score: -1 });

// Pin Feature Index
answerSchema.index({ question_id: 1, isPinned: -1, weightedScore: -1 });

const Answer = mongoose.model('Answer', answerSchema);
export default Answer;
