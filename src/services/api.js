// ============================================================================
// MMSU URERB Portal — Frontend API Client
// Connects React UI to PHP PDO Backend with credentials (session cookies)
// ============================================================================

const API_BASE = '/urerb-api';

async function apiFetch(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
    credentials: 'include', // Always send and store PHP session cookie
    ...options,
  };

  if (!isFormData && config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const errorMsg = data.message || `API request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ----------------------------------------------------------------------------
// Authentication API
// ----------------------------------------------------------------------------
export const authApi = {
  login: (credentials) =>
    apiFetch('/auth.php?action=login', {
      method: 'POST',
      body: credentials,
    }),

  register: (userData) =>
    apiFetch('/auth.php?action=register', {
      method: 'POST',
      body: userData,
    }),

  me: () => apiFetch('/auth.php?action=me'),

  logout: () =>
    apiFetch('/auth.php?action=logout', {
      method: 'POST',
    }),
};

// ----------------------------------------------------------------------------
// Profile API
// ----------------------------------------------------------------------------
export const profileApi = {
  updateContact: (data) =>
    apiFetch('/profile.php?action=update-contact', {
      method: 'POST',
      body: data,
    }),

  changePassword: (data) =>
    apiFetch('/profile.php?action=change-password', {
      method: 'POST',
      body: data,
    }),
};

// ----------------------------------------------------------------------------
// Researcher Protocols API
// ----------------------------------------------------------------------------
export const protocolsApi = {
  list: () => apiFetch('/protocols.php?action=list'),

  get: (id) => apiFetch(`/protocols.php?action=get&id=${encodeURIComponent(id)}`),

  getDraft: (id) =>
    apiFetch(id ? `/protocols.php?action=draft&id=${encodeURIComponent(id)}` : '/protocols.php?action=draft'),

  saveDraft: (data) =>
    apiFetch('/protocols.php?action=save-draft', {
      method: 'POST',
      body: data,
    }),

  uploadDoc: (protocolId, documentKey, file) => {
    const formData = new FormData();
    formData.append('protocolId', String(protocolId));
    formData.append('documentKey', documentKey);
    formData.append('file', file);

    return apiFetch('/protocols.php?action=upload-doc', {
      method: 'POST',
      body: formData,
    });
  },

  submit: (protocolId) =>
    apiFetch('/protocols.php?action=submit', {
      method: 'POST',
      body: { protocolId },
    }),

  submitRevision: (protocolId, docKey, file) => {
    const formData = new FormData();
    formData.append('protocolId', String(protocolId));
    formData.append('docKey', docKey || 'form15');
    formData.append('file', file);

    return apiFetch('/protocols.php?action=submit-revision', {
      method: 'POST',
      body: formData,
    });
  },

  deleteDraft: (id) =>
    apiFetch('/protocols.php?action=delete-draft', {
      method: 'POST',
      body: { id },
    }),

  deleteDrafts: (ids) =>
    apiFetch('/protocols.php?action=delete-draft', {
      method: 'POST',
      body: { ids },
    }),

  deleteAllDrafts: () =>
    apiFetch('/protocols.php?action=delete-draft', {
      method: 'POST',
      body: { all: true },
    }),
};

// ----------------------------------------------------------------------------
// Secretariat Intake Checking API
// ----------------------------------------------------------------------------
export const checkingApi = {
  queue: () => apiFetch('/checking.php?action=queue'),

  toggleDoc: (data) =>
    apiFetch('/checking.php?action=toggle-doc', {
      method: 'POST',
      body: data,
    }),

  saveProgress: (data) =>
    apiFetch('/checking.php?action=save-progress', {
      method: 'POST',
      body: data,
    }),

  sendDeficiency: (data) =>
    apiFetch('/checking.php?action=send-deficiency', {
      method: 'POST',
      body: data,
    }),

  passIntake: (data) =>
    apiFetch('/checking.php?action=pass-intake', {
      method: 'POST',
      body: data,
    }),
};

// ----------------------------------------------------------------------------
// Secretariat Application Processing API
// ----------------------------------------------------------------------------
export const processingApi = {
  getReviewers: () => apiFetch('/processing.php?action=reviewers'),

  get: (id) => apiFetch(`/processing.php?action=get&id=${encodeURIComponent(id)}`),

  assignReviewer: (data) =>
    apiFetch('/processing.php?action=assign-reviewer', {
      method: 'POST',
      body: data,
    }),

  updateStatus: (data) =>
    apiFetch('/processing.php?action=update-status', {
      method: 'POST',
      body: data,
    }),

  updateDocket: (data) =>
    apiFetch('/processing.php?action=update-docket', {
      method: 'POST',
      body: data,
    }),

  addNote: (data) =>
    apiFetch('/processing.php?action=add-note', {
      method: 'POST',
      body: data,
    }),

  issueClearance: (data) =>
    apiFetch('/processing.php?action=issue-clearance', {
      method: 'POST',
      body: data,
    }),
};

// ----------------------------------------------------------------------------
// Reviewer Evaluations API
// ----------------------------------------------------------------------------
export const reviewsApi = {
  getAssigned: () => apiFetch('/reviews.php?action=assigned'),

  getHistory: () => apiFetch('/reviews.php?action=history'),

  coiCertify: (data) =>
    apiFetch('/reviews.php?action=coi-certify', {
      method: 'POST',
      body: data,
    }),

  coiRecuse: (data) =>
    apiFetch('/reviews.php?action=coi-recuse', {
      method: 'POST',
      body: data,
    }),

  saveDraft: (data) =>
    apiFetch('/reviews.php?action=save-draft', {
      method: 'POST',
      body: data,
    }),

  submit: (data) =>
    apiFetch('/reviews.php?action=submit', {
      method: 'POST',
      body: data,
    }),
};

// ----------------------------------------------------------------------------
// Secretariat Records & Archives API
// ----------------------------------------------------------------------------
export const archivesApi = {
  list: () => apiFetch('/archives.php?action=list'),

  toggleReport: (protocolId) =>
    apiFetch('/archives.php?action=toggle-report', {
      method: 'POST',
      body: { protocolId },
    }),
};

// ----------------------------------------------------------------------------
// Notifications API
// ----------------------------------------------------------------------------
export const notificationsApi = {
  list: () => apiFetch('/notifications.php?action=list'),

  markRead: (id) =>
    apiFetch('/notifications.php?action=mark-read', {
      method: 'POST',
      body: { id },
    }),

  markAllRead: () =>
    apiFetch('/notifications.php?action=mark-all-read', {
      method: 'POST',
    }),
};

