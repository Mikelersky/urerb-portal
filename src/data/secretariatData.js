// Secretariat workspace data layer.
// All collections below are intentionally EMPTY placeholders. Replace the getters/savers
// with database / API calls when the backend is integrated. Expected record shapes are
// documented next to each export.

export const SECRETARIAT_PROFILE = {
  name: 'Secretariat Officer',
  role: 'Secretariat Officer',
  desk: '',
  email: '',
  department: 'University Research Ethics Review Board Secretariat',
  college: 'Office of the Vice President for Research and Extension',
  initials: 'SO',
};

/**
 * Intake queue protocols.
 * Shape: {
 *   id, protocolId, title, pi, college, collegeShort, reviewTrack, dateReceived, timeReceived,
 *   stage, status, statusCategory: 'new'|'checking'|'clarification'|'assigned',
 *   dashboardStatus?, badgeNote, badgeType?: 'danger', academicYear,
 *   actionType: 'route'|'check'|'continue'|'deficit'|'details', isPriority?: boolean,
 *   documents?: [{ id, title, meta, fileSize, version, status: 'Verified'|'Deficient', issueText? }],
 *   reviewPanel?, assignedReviewer?, docket?, trail?: []
 * }
 */
const SEC_QUEUE_STORAGE_KEY = 'urerb_secretariat_queue_v4';
const SEC_ARCHIVE_STORAGE_KEY = 'urerb_secretariat_archives_v4';

function loadInitialQueue() {
  try {
    const raw = localStorage.getItem(SEC_QUEUE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

function loadInitialArchives() {
  try {
    const raw = localStorage.getItem(SEC_ARCHIVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export const SECRETARIAT_QUEUE_PROTOCOLS = loadInitialQueue();

export function getStoredSecretariatQueue() {
  const list = loadInitialQueue();
  SECRETARIAT_QUEUE_PROTOCOLS.splice(0, SECRETARIAT_QUEUE_PROTOCOLS.length, ...list);
  return list;
}

export function saveStoredSecretariatQueue(list) {
  try {
    localStorage.setItem(SEC_QUEUE_STORAGE_KEY, JSON.stringify(list));
    SECRETARIAT_QUEUE_PROTOCOLS.splice(0, SECRETARIAT_QUEUE_PROTOCOLS.length, ...list);
    window.dispatchEvent(new Event('urerb_secretariat_sync'));
    window.dispatchEvent(new Event('urerb_secretariat_queue_sync'));
  } catch (err) {
    console.error('Error saving secretariat queue', err);
  }
}

/**
 * Reviewers available for assignment in the Secretariat modal.
 * Shape: { id, name, unit, unitFormatted, activeReviews, panel }
 */
export const AVAILABLE_EVALUATORS = [
  {
    id: 'eval-1',
    name: 'Dr. Alicia G. Barba, Ph.D.',
    unit: 'CHS · Department of Nursing · Panel A',
    unitFormatted: 'College of Health Sciences (CHS) · Panel A',
    activeReviews: 0,
    panel: 'Panel A — Clinical, Health & Biomedical Sciences',
  },
  {
    id: 'eval-2',
    name: 'Dr. Ramon L. Castillo, Ph.D.',
    unit: 'CAS · Department of Biological Sciences · Panel B',
    unitFormatted: 'College of Arts and Sciences (CAS) · Panel B',
    activeReviews: 0,
    panel: 'Panel B — Expedited Review (Natural & Biological Sciences)',
  },
  {
    id: 'eval-3',
    name: 'Dr. Teresa M. Villanueva, Ed.D.',
    unit: 'CTE · Graduate Studies & Educational Research · Panel C',
    unitFormatted: 'College of Teacher Education (CTE) · Panel C',
    activeReviews: 0,
    panel: 'Panel C — Social, Behavioral & Educational Sciences',
  },
];

/**
 * Archived ethics records.
 */
export const ARCHIVED_RECORDS = loadInitialArchives();

export function getStoredArchivedRecords() {
  const list = loadInitialArchives();
  ARCHIVED_RECORDS.splice(0, ARCHIVED_RECORDS.length, ...list);
  return list;
}

export function saveStoredArchivedRecords(list) {
  try {
    localStorage.setItem(SEC_ARCHIVE_STORAGE_KEY, JSON.stringify(list));
    ARCHIVED_RECORDS.splice(0, ARCHIVED_RECORDS.length, ...list);
    window.dispatchEvent(new Event('urerb_secretariat_sync'));
    window.dispatchEvent(new Event('urerb_secretariat_archives_sync'));
  } catch (err) {
    console.error('Error saving archived records', err);
  }
}

export const SECRETARIAT_NOTIFICATIONS = [];

const SEC_NOTIF_STORAGE_KEY = 'urerb_secretariat_notifications_v4';

export function getStoredSecretariatNotifications() {
  try {
    const raw = localStorage.getItem(SEC_NOTIF_STORAGE_KEY);
    if (!raw) return SECRETARIAT_NOTIFICATIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SECRETARIAT_NOTIFICATIONS;
  } catch {
    return SECRETARIAT_NOTIFICATIONS;
  }
}

export function saveStoredSecretariatNotifications(list) {
  try {
    localStorage.setItem(SEC_NOTIF_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('urerb_secretariat_notif_sync'));
  } catch {
    // ignore storage errors
  }
}

/** Dashboard summary metrics derived from the queue and archive (all zero on a fresh install). */
export function getSecretariatMetrics() {
  const queue = getStoredSecretariatQueue();
  const archives = getStoredArchivedRecords();
  return {
    newSubmissions: queue.filter((p) => p.statusCategory === 'new').length,
    underChecking: queue.filter((p) => p.statusCategory === 'checking').length,
    clearedForReview: queue.filter((p) => p.statusCategory === 'assigned').length,
    decisionsCompleted: archives.length,
    totalProtocols: queue.length,
    pendingClarification: queue.filter((p) => p.statusCategory === 'clarification').length,
  };
}
