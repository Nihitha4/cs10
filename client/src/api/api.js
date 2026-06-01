import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Admin Authentication
export async function adminLogin(email, password) {
  const { data } = await api.post('/admin/login', { email, password });
  return data;
}

export async function adminDashboard() {
  const { data } = await api.get('/admin/dashboard');
  return data;
}

// Admin Category APIs
export async function getCategories() {
  const { data } = await api.get('/categories');
  return data;
}

export async function adminCreateCategory(body) {
  const { data } = await api.post('/admin/categories', body);
  return data;
}

export async function adminUpdateCategory(id, body) {
  const { data } = await api.put(`/admin/categories/${id}`, body);
  return data;
}

export async function adminDeleteCategory(id) {
  const { data } = await api.delete(`/admin/categories/${id}`);
  return data;
}

// Admin FAQ APIs
export async function getFAQs(params) {
  const { data } = await api.get('/faqs', { params });
  return data;
}

export async function adminCreateFAQ(body) {
  const { data } = await api.post('/admin/faqs', body);
  return data;
}

export async function adminUpdateFAQ(id, body) {
  const { data } = await api.put(`/admin/faqs/${id}`, body);
  return data;
}

export async function adminDeleteFAQ(id) {
  const { data } = await api.delete(`/admin/faqs/${id}`);
  return data;
}

// Admin Moderation - Answer Submissions
export async function adminGetModeration(params) {
  const { data } = await api.get('/admin/moderation', { params });
  return data;
}

export async function adminApproveSubmission(id, note) {
  const { data } = await api.post(`/admin/moderation/${id}/approve`, { adminNote: note });
  return data;
}

export async function adminRejectSubmission(id, note) {
  const { data } = await api.post(`/admin/moderation/${id}/reject`, { adminNote: note });
  return data;
}

// Admin Moderation - FAQ Proposals (from students)
export async function adminGetFaqProposals(params) {
  const { data } = await api.get('/admin/faq-proposals', { params });
  return data;
}

export async function adminApproveFaqProposal(id) {
  const { data } = await api.post(`/admin/faq-proposals/${id}/approve`);
  return data;
}

export async function adminRejectFaqProposal(id) {
  const { data } = await api.post(`/admin/faq-proposals/${id}/reject`);
  return data;
}

// Admin Analytics & Auditing
export async function adminGetAnalytics(params) {
  const { data } = await api.get('/admin/analytics', { params });
  return data;
}

export async function adminGetQueryLogs(params) {
  const { data } = await api.get('/admin/query-logs', { params });
  return data;
}

export async function adminCreateAdmin(body) {
  const { data } = await api.post('/admin/admins', body);
  return data;
}

// Community integrations for Master FAQs creation
export async function adminGetCommunityMasterCandidates() {
  const { data } = await api.get('/admin/community/master-candidates');
  return data;
}

export async function adminGenerateMasterContent(body) {
  const { data } = await api.post('/admin/community/generate-master', body);
  return data;
}

export async function adminCreateMasterFaq(body) {
  const { data } = await api.post('/admin/community/create-master-faq', body);
  return data;
}

export async function adminRunGlobalAiCluster(apiKey) {
  const { data } = await api.post('/admin/community/global-ai-cluster', { apiKey });
  return data;
}

export async function adminGetCommunityQuestions(params) {
  // Using the public endpoint for fetching since it doesn't strictly need admin auth,
  // but we can query it easily. If we had an admin-specific list, we'd use it here.
  const { data } = await api.get('/community/questions', { params });
  return data;
}

export async function adminDeleteCommunityQuestion(id) {
  const { data } = await api.delete(`/admin/community/questions/${id}`);
  return data;
}

export default api;

// ── New: Admin Answer & Pin Controls ─────────────────────────────────────────
export async function adminPostCommunityAnswer(questionId, answerText) {
  const { data } = await api.post(`/admin/community/questions/${questionId}/answer`, { answerText });
  return data;
}

export async function adminPinAnswer(answerId) {
  const { data } = await api.post(`/admin/community/answers/${answerId}/pin`);
  return data;
}

export async function adminUnpinAnswer(answerId) {
  const { data } = await api.post(`/admin/community/answers/${answerId}/unpin`);
  return data;
}

// ── New: Manual Cluster (no AI) ───────────────────────────────────────────────
export async function adminGetManualClusters() {
  const { data } = await api.get('/admin/community/manual-clusters');
  return data;
}
