// Fictional demonstration fixtures cleared for clean state.
export const DEMO_APPLICATIONS = [];

export const DEMO_NOTIFICATIONS = [];

// Storage keys are versioned (v4) so stale mock data left in a browser's localStorage
// by earlier builds is ignored. Replace these localStorage helpers with API calls
// when the real database is integrated.
const APPS_STORAGE_KEY = 'urerb_applications_list_v4';
export const NOTIFICATIONS_STORAGE_KEY = 'urerb_researcher_notifications_v4';
export const UNREAD_NOTIFS_STORAGE_KEY = 'urerb_researcher_unread_notifs_v4';
export const DRAFT_STORAGE_KEY = 'urerb_researcher_draft_v4';

/**
 * Expected shape of a stored application (one row in the researcher's applications table):
 * {
 *   id, protocolId, title, pi, department, reviewType, dateSubmitted,
 *   status: 'Draft' | 'Under Review' | 'Revision Required' | 'Completed',
 *   lastUpdateDate, lastUpdateNote, actionType: 'tracking' | 'feedback' | 'certificate' | 'edit',
 *   // optional tracking details (used by Application Tracking when present)
 *   activeStep (1-5), stepStatus, dueDate, daysRemaining, remarks, reviewer,
 *   documents: [{ id, title, description, version, date, status, statusType: 'approved' | 'revision' | 'review' }]
 * }
 */
export function getStoredApplications() {
  try {
    const raw = localStorage.getItem(APPS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // fallback
  }
  return DEMO_APPLICATIONS;
}

/**
 * Researcher notifications. Expected shape:
 * { id, type, title, message, badge, icon, protocolId, timestamp, actionLabel, unread }
 */
export function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // fallback
  }
  return DEMO_NOTIFICATIONS;
}

export function saveStoredNotifications(notifications) {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    const unreadCount = notifications.filter((n) => n.unread).length;
    localStorage.setItem(UNREAD_NOTIFS_STORAGE_KEY, unreadCount.toString());
    window.dispatchEvent(new Event('urerb_notif_sync'));
  } catch (err) {
    console.error('Error saving researcher notifications', err);
  }
}

export function saveStoredApplications(apps) {
  try {
    localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(apps));
    window.dispatchEvent(new Event('urerb_applications_sync'));
  } catch (err) {
    console.error('Error saving applications', err);
  }
}

export function getStoredDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredDraft(draftData) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
  } catch (err) {
    console.error('Error saving draft', err);
  }
}

export function clearStoredDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const DEMO_PROFILE = {
  name: 'Researcher',
  title: 'Principal Investigator',
  email: '',
  initials: 'RS',
  status: 'Active Researcher',
  fullName: 'Researcher',
  researcherId: '',
  userRole: 'Principal Investigator',
  college: 'Mariano Marcos State University',
  department: '',
  contactNumber: '',
  office: '',
  lastLogin: '—',
  ip: '—',
  accountCreated: '—',
};

export const DEMO_HELP_TOPICS = [
  'Form 16',
  'Informed Consent',
  'Expedited Review',
  'Exemption Guidelines',
  'URERB Checklist',
];

export const DEMO_HELP_CATEGORIES = [
  {
    title: 'Application Process',
    description: 'Learn how to prepare, validate, and submit your research ethics protocol from draft to submission.',
    linkText: 'Learn more →',
    icon: 'edit_document',
  },
  {
    title: 'Requirements & Forms',
    description: 'Check essential forms, informed consent guidelines, language translations, and file formats.',
    linkText: 'View requirements →',
    icon: 'description',
  },
  {
    title: 'Review & Revisions',
    description: 'Understand review levels, panel deliberation remarks, compliance deadlines, and revision uploads.',
    linkText: 'Review guidelines →',
    icon: 'assignment_turned_in',
  },
  {
    title: 'Submission & Status',
    description: 'Track your active protocol milestones, clearance certifications, and official board resolutions.',
    linkText: 'Track applications →',
    icon: 'insights',
  },
];

export const DEMO_FAQS = [
  {
    id: 'faq-1',
    question: 'How do I submit a new research ethics application?',
    answer: [
      'Navigate to the New Application page from the left sidebar navigation.',
      'Fill out the basic study details including Study Title, Principal Investigator credentials, Department, and Funding Source.',
      'Upload the complete proposal documentation, including Form 16 (Protocol Evaluation Checklist) and participant consent forms.',
      'Submit the application for initial Secretariat verification. You will receive an automated protocol tracking number.',
    ],
  },
  {
    id: 'faq-2',
    question: 'What documents are required for an ethics application?',
    lead: 'All submissions must include the standard PHREB 2024 compliance pack:',
    items: [
      'Comprehensive Research Protocol / Technical Study Proposal',
      'Informed Consent Forms (both English and localized dialect/Ilocano translation where human participants are involved)',
      'Curriculum Vitae of the Principal Investigator and Co-Investigators',
      'Data Collection Instruments (Surveys, Interview Guides, Questionnaires)',
      "College/Institutional Endorsement or Dean's Sign-off",
    ],
  },
  {
    id: 'faq-3',
    question: 'How can I check the real-time status of my application?',
    text: 'Click on either the Tracking or My Applications tabs in the left sidebar. The interactive timeline will show the exact step in progress: 1. Submission → 2. Secretariat Verification → 3. Panel Deliberation → 4. Revisions → 5. Ethics Clearance Issuance.',
  },
  {
    id: 'faq-4',
    question: 'What should I do if my application requires revisions?',
    text: 'When a revision is required, navigate to Tracking to inspect the committee review remarks and checklist items. Upload the amended documents with highlights of changes made and resubmit directly through the portal before the 30-day compliance window expires.',
  },
];
