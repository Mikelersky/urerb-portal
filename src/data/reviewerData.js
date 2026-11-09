// Reviewer portal data layer.
//
// NOTE: The collections and helpers below are PLACEHOLDERS to be replaced by real
// database / API calls. No mock or demo records are shipped: every collection starts
// empty so the UI renders its proper empty states until live data is wired in.

export const REVIEWER_PROFILE = {
  name: 'Scientific Reviewer',
  title: 'Scientific Reviewer',
  panel: '',
  college: 'Mariano Marcos State University',
  department: '',
  email: '',
  role: 'Scientific Reviewer',
  cycle: '',
};

// Expected shape of an assigned protocol (to be supplied by the backend):
// { id, protocolCode, title, pi, piShort, college, track, dueDate, dueFullDate,
//   daysRemaining, submittedDate, status, panel, urgent, documents: [], findings: [],
//   overallComments, justification, recommendedAction, isSubmitted, submittedTimestamp }
export const INITIAL_ASSIGNED_PROTOCOLS = [];

// Expected shape of an archived review (to be supplied by the backend):
// { id, protocolCode, title, pi, track, dateSubmitted, period, recommendation,
//   finalDecision, finalDecisionSub, decisionType, findings: [], overallComments,
//   justification, additionalNotes }
export const ARCHIVED_REVIEWS = [];

export const REVIEW_GUIDELINES = [
  {
    id: 'g-1',
    title: 'URERB Assessment Form (PDF)',
    filename: 'URERB-Assessment-Form-v2025.pdf',
    size: '420 KB',
    description: 'Standardized rubric and ethics evaluation guide for Scientific Reviewers.',
  },
  {
    id: 'g-2',
    title: 'PHREB 2024 Expedited Criteria',
    filename: 'PHREB-2024-Expedited-Guidelines.pdf',
    size: '1.2 MB',
    description: 'Philippine Health Research Ethics Board National Ethical Guidelines.',
  },
];

// Storage keys are versioned so stale mock data left in a browser's localStorage is ignored.
const STORAGE_KEY = 'urerb_reviewer_protocols_v4';
const ARCHIVE_STORAGE_KEY = 'urerb_reviewer_history_v4';

export function getStoredProtocols() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return JSON.parse(JSON.stringify(INITIAL_ASSIGNED_PROTOCOLS));
}

export function saveStoredProtocols(protocols) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(protocols));
    window.dispatchEvent(new Event('urerb_reviewer_sync'));
  } catch (err) {
    console.error('Error saving reviewer protocols', err);
  }
}

export function getStoredArchivedReviews() {
  try {
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return JSON.parse(JSON.stringify(ARCHIVED_REVIEWS));
}

export function saveStoredArchivedReviews(reviews) {
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(reviews));
    window.dispatchEvent(new Event('urerb_reviewer_history_sync'));
  } catch (err) {
    console.error('Error saving archived reviews', err);
  }
}

export function submitReviewProtocol(protocolCode, reviewData = {}) {
  const timestamp = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

  const protocols = getStoredProtocols();
  const target = protocols.find((p) => p.protocolCode === protocolCode);

  const updatedProtocols = protocols.map((p) => {
    if (p.protocolCode === protocolCode) {
      return {
        ...p,
        findings: reviewData.findings ?? p.findings ?? [],
        overallComments: reviewData.overallComments ?? p.overallComments ?? '',
        justification: reviewData.justification ?? p.justification ?? '',
        recommendedAction: reviewData.recommendedAction || p.recommendedAction || 'Minor Revisions',
        status: 'Submitted',
        isSubmitted: true,
        submittedTimestamp: timestamp,
      };
    }
    return p;
  });
  saveStoredProtocols(updatedProtocols);

  if (target) {
    const existingHistory = getStoredArchivedReviews();
    const recAction = reviewData.recommendedAction || target.recommendedAction || 'Minor Revisions';
    const isApproved = recAction === 'Approved' || recAction === 'Approve';
    const isDisapproved = recAction === 'Disapproved' || recAction === 'Disapprove';
    const decisionType = isApproved
      ? 'approved'
      : isDisapproved
      ? 'disapproved'
      : 'revision';

    const now = new Date();
    const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const currentAcademicYear = `AY ${startYear}-${startYear + 1}`;

    let activeReviewerName = REVIEWER_PROFILE.name;
    try {
      const rawUser = localStorage.getItem('urerb_user');
      if (rawUser) {
        const parsedUser = JSON.parse(rawUser);
        if (parsedUser?.name) activeReviewerName = parsedUser.name;
      }
    } catch {
      // fallback to default label
    }

    const historyEntry = {
      id: `rev-hist-${Date.now()}`,
      protocolCode: target.protocolCode,
      title: target.title,
      pi: target.pi,
      track: target.track || 'Expedited Review',
      dateSubmitted: timestamp,
      period: currentAcademicYear,
      recommendation: recAction,
      finalDecision: isApproved ? 'Approved' : recAction,
      finalDecisionSub: 'Submitted to Secretariat',
      decisionType,
      findings: reviewData.findings || target.findings || [],
      overallComments: reviewData.overallComments || target.overallComments || '',
      justification: reviewData.justification || target.justification || '',
      additionalNotes: `Evaluated by ${activeReviewerName}`,
    };

    const filteredHistory = existingHistory.filter((h) => h.protocolCode !== target.protocolCode);
    saveStoredArchivedReviews([historyEntry, ...filteredHistory]);
  }

  return {
    success: true,
    protocolCode,
    recommendedAction: reviewData.recommendedAction || '',
    timestamp,
  };
}

export const DEMO_REVIEWER_NOTIFICATIONS = [];

const NOTIFICATIONS_STORAGE_KEY = 'urerb_reviewer_notifications_v4';
// Cached unread-count key (bumped so old cached counts from mock data are ignored).
export const REVIEWER_UNREAD_NOTIFS_KEY = 'urerb_reviewer_unread_notifs_v4';

export function getStoredReviewerNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return DEMO_REVIEWER_NOTIFICATIONS;
}

export function saveStoredReviewerNotifications(notifications) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    const unreadCount = notifications.filter((n) => n.unread).length;
    localStorage.setItem(REVIEWER_UNREAD_NOTIFS_KEY, unreadCount.toString());
    window.dispatchEvent(new Event('urerb_reviewer_notif_sync'));
  } catch (err) {
    console.error('Error saving notifications to storage', err);
  }
}
