import { useEffect, useMemo, useState, useLocation } from 'react';
import {
  communityListQuestions,
  communityCreateQuestion,
  communityVoteQuestion,
  communityListAnswers,
  communityCreateAnswer,
  communityVoteAnswer,
  searchQuery
} from '../services/api';
import { useLocation as useRouterLocation } from 'react-router-dom';
import { LuTrophy, LuMessageSquare, LuPen, LuLightbulb, LuUpload, LuTriangleAlert, LuCircleCheck, LuSearch, LuChevronUp, LuChevronDown, LuChevronRight, LuSparkles, LuPin, LuShieldCheck } from 'react-icons/lu';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function AnswerThread({ questionId, questionOpen }) {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const user = localStorage.getItem('userProfile') ? JSON.parse(localStorage.getItem('userProfile')) : null;

  useEffect(() => {
    if (!questionOpen) return;
    setLoading(true);
    communityListAnswers(questionId, { limit: 50 })
      .then(r => setAnswers(r.items || []))
      .catch(() => setAnswers([]))
      .finally(() => setLoading(false));
  }, [questionId, questionOpen]);

  const handleVote = async (id, type) => {
    try {
      const r = await communityVoteAnswer(id, type);
      setAnswers(prev => prev.map(a => a._id === id ? { ...a, ...r.item } : a));
    } catch { /* noop */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (draft.trim().length < 5) return;
    setSubmitting(true);
    try {
      await communityCreateAnswer(questionId, {
        answerText: draft.trim(),
        answeredBy: user?.name || 'anonymous'
      });
      const r = await communityListAnswers(questionId, { limit: 50 });
      setAnswers(r.items || []);
      setDraft('');
    } catch { /* noop */ }
    finally { setSubmitting(false); }
  };

  if (!questionOpen) return null;

  return (
    <div className="mt-4 pt-4 fade-in" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {loading ? (
        <div className="space-y-2">
          <div className="shimmer h-16 rounded-xl" />
          <div className="shimmer h-12 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {answers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: '#475569' }}>No answers yet. Be the first!</p>
            </div>
          ) : (
            answers.map((a, i) => (
              <div key={a._id}
                className="p-4 rounded-xl"
                style={{
                  background: a.isPinned ? 'rgba(99,102,241,0.08)' : (i === 0 && (a.weightedScore || 0) > 0 ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)'),
                  border: a.isPinned ? '1px solid rgba(99,102,241,0.3)' : (i === 0 && (a.weightedScore || 0) > 0 ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(255,255,255,0.06)'),
                }}>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {a.isPinned && a.isAdminAnswer && (
                    <span className="badge flex items-center gap-1" style={{ fontSize: '0.625rem', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                      <LuShieldCheck className="w-3 h-3" /> Official Admin Answer
                    </span>
                  )}
                  {a.isPinned && !a.isAdminAnswer && (
                    <span className="badge flex items-center gap-1" style={{ fontSize: '0.625rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                      <LuPin className="w-3 h-3" /> Pinned
                    </span>
                  )}
                  {!a.isPinned && i === 0 && (a.weightedScore || 0) > 0 && (
                    <span className="badge badge-success flex items-center gap-1" style={{ fontSize: '0.625rem' }}><LuTrophy className="w-3 h-3" /> Top Answer</span>
                  )}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{a.text}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs" style={{ color: '#475569' }}>
                    by <span style={{ color: a.isAdminAnswer ? '#818cf8' : '#94a3b8' }}>{a.adminId?.name || a.userId?.name || 'anonymous'}</span> · {timeAgo(a.createdAt)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleVote(a._id, 'up')} className="vote-btn vote-up flex items-center gap-1">
                      <LuChevronUp className="w-3 h-3" /> {a.upvotes?.length || 0}
                    </button>
                    <button onClick={() => handleVote(a._id, 'down')} className="vote-btn vote-down flex items-center gap-1">
                      <LuChevronDown className="w-3 h-3" /> {a.downvotes?.length || 0}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Answer form */}
      <form onSubmit={handleSubmit} className="glass p-4" style={{ borderRadius: 14 }}>
        <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: '#818cf8' }}><LuPen className="w-4 h-4" /> WRITE AN ANSWER</p>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Share your knowledge..."
          className="textarea mb-2"
        />
        <div className="flex gap-2">
          {!user ? (
            <div className="flex-1 flex items-center">
              <span className="text-xs" style={{ color: '#fca5a5' }}>Please <a href="/login" style={{ textDecoration: 'underline' }}>Sign In</a> to answer</span>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <button
            type="submit"
            disabled={submitting || draft.trim().length < 5 || !user}
            className="btn-primary shrink-0"
            style={{ padding: '8px 18px' }}>
            {submitting ? '...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

function QuestionCard({ q, onVote, prefillExpand }) {
  const [open, setOpen] = useState(prefillExpand || false);

  return (
    <div className="glass glass-hover" style={{ borderRadius: 16 }}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug mb-2" style={{ color: '#f0f0ff' }}>
              {q.framedQuery || q.rawText}
            </p>
            <div className="flex items-center flex-wrap gap-2">
              <span className="badge badge-primary">General</span>
              <span className="text-xs" style={{ color: '#475569' }}>
                by <span style={{ color: '#64748b' }}>{q.userId?.name || 'anonymous'}</span>
              </span>
              <span className="text-xs" style={{ color: '#475569' }}>{timeAgo(q.createdAt)}</span>
              {(q.responseList?.length || 0) > 0 && (
                <span className="text-xs flex items-center gap-1" style={{ color: '#475569' }}>
                  <LuMessageSquare className="w-3 h-3" /> {q.responseList.length} answer{q.responseList.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium transition-all"
          style={{ color: open ? '#818cf8' : '#475569' }}>
          {open ? <LuChevronDown className="w-3 h-3" /> : <LuChevronRight className="w-3 h-3" />}
          {open ? 'Hide Thread' : 'View Answers & Reply'}
        </button>
      </div>

      <AnswerThread questionId={q._id} questionOpen={open} />
    </div>
  );
}

export default function Community() {
  const routerLocation = useRouterLocation();
  const prefill = routerLocation.state?.prefill || '';

  const [questionText, setQuestionText] = useState(prefill);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = localStorage.getItem('userProfile') ? JSON.parse(localStorage.getItem('userProfile')) : null;
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [success, setSuccess] = useState('');
  
  // Deflection states
  const [relatedFaqs, setRelatedFaqs] = useState([]);
  const [searchingFaqs, setSearchingFaqs] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  async function loadQuestions(s = '') {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (s) params.search = s;
      const data = await communityListQuestions(params);
      setQuestions(data.items || []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadQuestions(); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      loadQuestions(search);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Deflection Effect
  useEffect(() => {
    const q = questionText.trim();
    if (q.length < 10) {
      setRelatedFaqs([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearchingFaqs(true);
      try {
        const res = await searchQuery(q);
        if (res && res.matchedFaqs) {
          setRelatedFaqs(res.matchedFaqs);
        } else {
          setRelatedFaqs([]);
        }
      } catch (err) {
        setRelatedFaqs([]);
      } finally {
        setSearchingFaqs(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [questionText]);

  const handleAsk = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const q = questionText.trim();
    if (q.length < 5) {
      setError('Please enter a meaningful question (at least 5 characters).');
      return;
    }
    setPosting(true);
    try {
      await communityCreateQuestion({
        question: q,
        askedBy: user?.name || 'anonymous',
        categoryHint: 'General'
      });
      setQuestionText('');
      setSuccess('Your question has been posted!');
      await loadQuestions(debouncedSearch);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post question. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleVote = async (id, type) => {
    try {
      const r = await communityVoteQuestion(id, type);
      setQuestions(prev => prev.map(q => q._id === id ? { ...q, ...r.item } : q));
    } catch { /* noop */ }
  };

  return (
    <div style={{ background: '#0b0b1a', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#818cf8' }}><LuMessageSquare className="w-4 h-4" /> Community Forum</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2">
            <span className="gradient-text">Community</span>{' '}
            <span style={{ color: '#f0f0ff' }}>Q&A</span>
          </h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Post questions directly — no approval needed. The community votes the best answers to the top.
          </p>
        </div>

        {/* Ask form */}
        <div className="glass mb-6" style={{ borderRadius: 20 }}>
          <div className="p-5">
            <p className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: '#f0f0ff' }}><LuLightbulb className="w-4 h-4" /> Ask the Community</p>
            <form onSubmit={handleAsk} className="space-y-3">
              <textarea
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="What's your question? Be specific and clear..."
                className="textarea"
                id="community-question-input"
              />
              
              {/* Deflection UI */}
              {relatedFaqs.length > 0 && (
                <div className="mt-4 mb-4 p-4 rounded-xl fade-in" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <p className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: '#818cf8' }}>
                    <LuSparkles className="w-4 h-4" /> Before you post, check these similar FAQs!
                  </p>
                  <div className="space-y-2">
                    {relatedFaqs.slice(0, 3).map(faq => (
                      <div key={faq.id} className="p-3 rounded-lg cursor-pointer transition-colors"
                        style={{ background: 'rgba(0,0,0,0.2)' }}
                        onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}>
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium" style={{ color: '#f0f0ff' }}>{faq.question}</p>
                          {expandedFaq === faq.id ? <LuChevronDown className="w-4 h-4 text-gray-400" /> : <LuChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>
                        {expandedFaq === faq.id && (
                          <div className="mt-2 pt-2 border-t border-gray-700/50 text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>
                    Didn't find your answer? Go ahead and post it to the community!
                  </p>
                </div>
              )}
              
              <div className="flex gap-2 items-center">
                {!user ? (
                  <div className="flex-1 flex items-center">
                    <span className="text-xs" style={{ color: '#fca5a5' }}>Please <a href="/login" style={{ textDecoration: 'underline' }}>Sign In</a> to ask a question</span>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
                <button
                  type="submit"
                  id="post-question-btn"
                  disabled={posting || questionText.trim().length < 5 || !user}
                  className="btn-primary shrink-0 flex items-center gap-2">
                  {posting ? '...' : <><LuUpload className="w-4 h-4" /> Post</>}
                </button>
              </div>
              {error && (
                <div className="p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                  <LuTriangleAlert className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-xl text-sm fade-in flex items-center gap-2"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
                  <LuCircleCheck className="w-4 h-4 shrink-0" /> {success}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Search + header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#475569' }}><LuSearch className="w-4 h-4" /></span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search community questions..."
              className="input pl-9"
              style={{ padding: '8px 14px 8px 36px' }}
            />
          </div>
          <div className="text-xs shrink-0" style={{ color: '#475569' }}>
            {!loading && `${questions.length} question${questions.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Questions */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="glass p-5" style={{ borderRadius: 16 }}>
                <div className="shimmer h-5 w-3/4 mb-3" />
                <div className="shimmer h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="glass text-center py-16" style={{ borderRadius: 16 }}>
            <div className="mb-4 flex justify-center"><LuMessageSquare className="w-10 h-10 text-gray-400" /></div>
            <p className="font-semibold mb-2" style={{ color: '#f0f0ff' }}>No questions yet</p>
            <p className="text-sm" style={{ color: '#64748b' }}>Be the first to ask the community!</p>
          </div>
        ) : (
          <div className="space-y-4 fade-in">
            {questions.map((q, i) => (
              <QuestionCard
                key={q._id}
                q={q}
                onVote={handleVote}
                prefillExpand={i === 0 && !!prefill}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
