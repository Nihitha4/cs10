import { useState, useEffect } from 'react';
import {
  adminGetModeration, adminApproveSubmission, adminRejectSubmission, adminPromoteSubmission, adminAutoModerate,
  adminGetPendingQuestions, adminApproveQuestion, adminRejectQuestion,
  adminGetFaqProposals, adminApproveFaqProposal, adminRejectFaqProposal,
  adminCreateMasterFaq, adminGetCommunityQuestions, adminDeleteCommunityQuestion,
  adminRunGlobalAiCluster, adminPostCommunityAnswer, adminPinAnswer, adminUnpinAnswer,
  adminGetManualClusters
} from '../services/api';
import {
  LuShieldCheck, LuCircleCheck, LuCircleX, LuRefreshCw,
  LuTriangleAlert, LuFlag, LuUser, LuCalendar, LuMessageSquare,
  LuFileQuestion, LuClock, LuNetwork, LuSparkles, LuTrash2,
  LuPin, LuPinOff, LuPenLine, LuLayers, LuSendHorizontal, LuChevronRight,
  LuBrain, LuCheckCheck, LuChevronDown, LuChevronUp
} from 'react-icons/lu';

function TabBtn({ active, onClick, children, count }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
        fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s',
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? '#fff' : 'var(--text-2)',
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
      {children}
      {count > 0 && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.25)' : 'var(--danger-light)',
          color: active ? '#fff' : 'var(--danger)',
          borderRadius: 99, padding: '1px 7px', fontSize: '0.6875rem', fontWeight: 700
        }}>{count}</span>
      )}
    </button>
  );
}

// ─── Pin & Answer: Community Question Card ──────────────────────────────────
function QuestionManageCard({ item, onDelete, showToast, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [loadingAns, setLoadingAns] = useState(false);
  const [adminDraft, setAdminDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [pinBusy, setPinBusy] = useState(null);
  const [delBusy, setDelBusy] = useState(false);

  const loadAnswers = async () => {
    setLoadingAns(true);
    try {
      const res = await fetch(`/api/community/questions/${item._id}/answers?limit=50`);
      const data = await res.json();
      setAnswers(data.items || []);
    } catch { setAnswers([]); }
    finally { setLoadingAns(false); }
  };

  const handleOpen = () => { setOpen(o => !o); if (!open) loadAnswers(); };

  const handleAdminPost = async () => {
    if (!adminDraft.trim()) return;
    setPosting(true);
    try {
      await adminPostCommunityAnswer(item._id, adminDraft.trim());
      showToast('Admin answer posted & pinned!');
      setAdminDraft('');
      loadAnswers();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to post answer.', 'error');
    } finally { setPosting(false); }
  };

  const handlePin = async (answerId, isPinned) => {
    setPinBusy(answerId);
    try {
      if (isPinned) { await adminUnpinAnswer(answerId); showToast('Answer unpinned.'); }
      else { await adminPinAnswer(answerId); showToast('Answer pinned!'); }
      loadAnswers();
    } catch { showToast('Pin action failed.', 'error'); }
    finally { setPinBusy(null); }
  };

  return (
    <div className="card fade-in" style={{ marginBottom: 10 }}>
      <div style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LuMessageSquare size={15} style={{ color: 'var(--danger)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', lineHeight: 1.4 }}>
              {item.framedQuery || item.rawText}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <LuUser size={12} /> {item.userId?.name || 'Anonymous'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <LuCalendar size={12} />
                {new Date(item.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={handleOpen} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {open ? <LuChevronUp size={13} /> : <LuChevronRight size={13} />} {open ? 'Close' : 'Manage'}
            </button>
            <button disabled={delBusy} onClick={async () => { setDelBusy(true); try { await onDelete(item._id); } finally { setDelBusy(false); } }}
              className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <LuTrash2 size={13} />
            </button>
          </div>
        </div>

        {open && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '14px', marginBottom: 14 }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <LuPenLine size={13} /> POST OFFICIAL ADMIN ANSWER (auto-pins)
              </p>
              <textarea value={adminDraft} onChange={e => setAdminDraft(e.target.value)} rows={3}
                placeholder="Write the official answer — it will be pinned to the top automatically..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', fontSize: '0.875rem', resize: 'vertical', marginBottom: 8 }} />
              <button disabled={posting || !adminDraft.trim()} onClick={handleAdminPost} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LuSendHorizontal size={13} /> {posting ? 'Posting...' : 'Post & Pin'}
              </button>
            </div>

            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>COMMUNITY ANSWERS</p>
            {loadingAns ? (
              <div className="skeleton" style={{ height: 60 }} />
            ) : answers.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', fontStyle: 'italic' }}>No answers yet.</p>
            ) : (
              answers.map(a => (
                <div key={a._id} style={{
                  background: a.isPinned ? 'rgba(99,102,241,0.06)' : 'var(--surface-2)',
                  border: a.isPinned ? '1px solid rgba(99,102,241,0.25)' : '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 12px', marginBottom: 8,
                  display: 'flex', alignItems: 'flex-start', gap: 10
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {a.isPinned && <span className="badge badge-violet" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.625rem' }}><LuPin size={10} /> Pinned</span>}
                      {a.isAdminAnswer && <span className="badge badge-success" style={{ fontSize: '0.625rem' }}>Admin</span>}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>by {a.adminId?.name || a.userId?.name || 'anonymous'}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-1)', lineHeight: 1.5 }}>{a.text}</p>
                  </div>
                  <button disabled={pinBusy === a._id} onClick={() => handlePin(a._id, a.isPinned)}
                    className={`btn btn-sm ${a.isPinned ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                    title={a.isPinned ? 'Unpin this answer' : 'Pin this answer to the top'}>
                    {a.isPinned ? <LuPinOff size={13} /> : <LuPin size={13} />}
                    {a.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminModeration() {
  // ── Existing state ──────────────────────────────────────────────────────
  const [flagged, setFlagged] = useState([]);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [xpSettings, setXpSettings] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [isAutoModerating, setIsAutoModerating] = useState(false);
  const [activeTab, setActiveTab] = useState('answers'); // 'answers' | 'questions' | 'pin'

  // ── New: Pin & Answer state ─────────────────────────────────────────────
  const [allQuestions, setAllQuestions] = useState([]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [f, q, cq] = await Promise.all([
        adminGetModeration(),
        adminGetPendingQuestions(),
        adminGetCommunityQuestions({ limit: 100 }),
      ]);
      setFlagged(f.data || []);
      setPendingQuestions(q.data || []);
      setAllQuestions(cq.items || []);
    } catch (err) {
      showToast('Failed to load moderation queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      const xp = xpSettings[id] || { answererXp: 25, askerXp: 15 };
      await adminApproveSubmission(id, xp);
      showToast('Answer approved and set to live!');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to approve', 'error');
    } finally { setActionLoading(null); }
  };

  const handleAutoModerate = async () => {
    if (!window.confirm('Are you sure you want to let the AI evaluate and apply rewards to ALL pending answers?')) return;
    setIsAutoModerating(true);
    showToast('Auto-Moderation started... please wait.', 'success');
    try {
      const res = await adminAutoModerate();
      showToast(res.message);
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to auto-moderate', 'error');
    } finally { setIsAutoModerating(false); }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await adminRejectSubmission(id);
      showToast('Answer rejected and hidden.');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reject', 'error');
    } finally { setActionLoading(null); }
  };

  const handlePromote = async (id) => {
    setActionLoading(id);
    try {
      const xp = xpSettings[id] || { answererXp: 25, askerXp: 15 };
      await adminPromoteSubmission(id, xp);
      showToast('Answer promoted to FAQ corpus!');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to promote', 'error');
    } finally { setActionLoading(null); }
  };

  const handleApproveQuestion = async (id) => {
    setActionLoading(id);
    try {
      const xp = xpSettings[id] || { askerXp: 15 };
      await adminApproveQuestion(id, { askerXp: xp.askerXp });
      showToast('Question approved and published!');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to approve question', 'error');
    } finally { setActionLoading(null); }
  };

  const handleRejectQuestion = async (id) => {
    setActionLoading(id);
    try {
      await adminRejectQuestion(id);
      showToast('Question rejected and hidden.');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reject question', 'error');
    } finally { setActionLoading(null); }
  };

  const handleDeleteQuestion = async (id) => {
    await adminDeleteCommunityQuestion(id);
    showToast('Question deleted.');
    load();
  };

  return (
    <div>
      {toast && (
        <div className={`alert ${toast.type === 'error' ? 'alert-error' : 'alert-success'} fade-in`}
          style={{ position: 'fixed', top: 76, right: 24, zIndex: 200, width: 320, boxShadow: 'var(--shadow-lg)' }}>
          {toast.type === 'error' ? <LuTriangleAlert size={16} /> : <LuCircleCheck size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Moderation</h1>
          <p>Review flagged answers, pending questions, and pin official responses</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary btn-sm" onClick={handleAutoModerate}
            disabled={isAutoModerating || flagged.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isAutoModerating ? <LuRefreshCw className="spin" size={14} /> : <LuShieldCheck size={14} />}
            {isAutoModerating ? 'Processing...' : 'Auto-Moderate All'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LuRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 6, width: 'fit-content', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap' }}>
        <TabBtn active={activeTab === 'answers'} onClick={() => setActiveTab('answers')} count={flagged.length}>
          <LuFlag size={15} /> Flagged Answers
        </TabBtn>
        <TabBtn active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} count={pendingQuestions.length}>
          <LuTriangleAlert size={15} /> Pending Questions
        </TabBtn>
        {/* ── NEW TAB: Pin & Answer ── */}
        <TabBtn active={activeTab === 'pin'} onClick={() => setActiveTab('pin')} count={allQuestions.length}>
          <LuPin size={15} /> Pin & Answer
        </TabBtn>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
        </div>

      ) : activeTab === 'answers' ? (
        // ── EXISTING: Flagged Answers Tab ──────────────────────────────────
        flagged.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><LuShieldCheck size={24} style={{ color: 'var(--success)' }} /></div>
              <h3>All clear!</h3>
              <p>No pending flagged answers to review.</p>
            </div>
          </div>
        ) : (
          flagged.map(a => {
            const xp = xpSettings[a._id] || { answererXp: 25, askerXp: 15 };
            const setXp = (key, val) => setXpSettings(p => ({ ...p, [a._id]: { ...xp, [key]: Number(val) } }));
            const busy = actionLoading === a._id;
            return (
              <div key={a._id} className="card fade-in" style={{ padding: '24px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-primary">{a.question_id?.category || 'general'}</span>
                    {a.flag_reason && <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><LuTriangleAlert size={11} /> {a.flag_reason}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <LuUser size={12} /> {a.answered_by?.name || 'Anonymous'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <LuCalendar size={12} /> {new Date(a.created_at).toLocaleDateString()}
                    </span>
                    <span className="badge badge-gray" style={{ marginLeft: 8 }}>
                      Score: {a.net_score || 0} ({a.upvotes || 0}▲ {a.downvotes || 0}▼)
                    </span>
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>QUESTION</p>
                  <p style={{ fontSize: '1rem', fontWeight: 600 }}>{a.question_id?.rephrased_query || 'N/A'}</p>
                  {a.question_id?.posted_by?.name && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 4 }}>Asked by {a.question_id.posted_by.name}</p>
                  )}
                </div>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>ANSWER</p>
                  <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
                    {a.content}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20, background: 'var(--surface-2)', padding: 16, borderRadius: 8 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>Answerer Reward</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{xp.answererXp} SP</span>
                    </div>
                    <input type="range" min="0" max="100" step="5" value={xp.answererXp} onChange={e => setXp('answererXp', e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>Asker Reward</span>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{xp.askerXp} SP</span>
                    </div>
                    <input type="range" min="0" max="100" step="5" value={xp.askerXp} onChange={e => setXp('askerXp', e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-danger" disabled={busy} onClick={() => handleReject(a._id)}>
                    <LuCircleX size={15} style={{ marginRight: 4 }} /> Reject & Hide
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" disabled={busy} onClick={() => handleApprove(a._id)}>
                      <LuCircleCheck size={15} style={{ marginRight: 4 }} /> Approve & Live
                    </button>
                    <button className="btn btn-primary" disabled={busy} onClick={() => handlePromote(a._id)}>
                      <LuShieldCheck size={15} style={{ marginRight: 4 }} /> Promote to FAQ
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )

      ) : activeTab === 'questions' ? (
        // ── EXISTING: Pending Questions Tab ───────────────────────────────
        pendingQuestions.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><LuShieldCheck size={24} style={{ color: 'var(--success)' }} /></div>
              <h3>All clear!</h3>
              <p>No pending questions to review.</p>
            </div>
          </div>
        ) : (
          pendingQuestions.map(q => {
            const xp = xpSettings[q._id] || { askerXp: 15 };
            const setXp = (key, val) => setXpSettings(p => ({ ...p, [q._id]: { ...xp, [key]: Number(val) } }));
            const busy = actionLoading === q._id;
            return (
              <div key={q._id} className="card fade-in" style={{ padding: '24px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-primary">{q.category || 'general'}</span>
                    <span className="badge badge-warning">Needs Review</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <LuUser size={12} /> {q.posted_by?.name || 'Anonymous'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <LuCalendar size={12} /> {new Date(q.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>ORIGINAL QUERY</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>{q.original_query}</p>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>REPHRASED BY AI</p>
                  <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{q.rephrased_query}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 20, background: 'var(--surface-2)', padding: 16, borderRadius: 8 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600 }}>Asker Reward (if approved)</span>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>{xp.askerXp} SP</span>
                    </div>
                    <input type="range" min="0" max="100" step="5" value={xp.askerXp} onChange={e => setXp('askerXp', e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-danger" disabled={busy} onClick={() => handleRejectQuestion(q._id)}>
                    <LuCircleX size={15} style={{ marginRight: 4 }} /> Reject & Hide
                  </button>
                  <button className="btn btn-secondary" disabled={busy} onClick={() => handleApproveQuestion(q._id)}>
                    <LuCircleCheck size={15} style={{ marginRight: 4 }} /> Approve & Publish
                  </button>
                </div>
              </div>
            );
          })
        )

      ) : (
        // ── NEW: Pin & Answer Tab ──────────────────────────────────────────
        <div className="fade-in">
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 18 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <LuPin size={15} style={{ color: 'var(--primary)' }} />
              <strong>Pin & Answer:</strong> Expand any question to post an official admin answer (auto-pinned) or pin/unpin an existing community answer.
            </p>
          </div>
          {allQuestions.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon"><LuShieldCheck size={24} style={{ color: 'var(--success)' }} /></div>
                <h3>No open questions</h3>
                <p>Community questions will appear here.</p>
              </div>
            </div>
          ) : (
            allQuestions.map(item => (
              <QuestionManageCard key={item._id} item={item} onDelete={handleDeleteQuestion} showToast={showToast} onRefresh={load} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
