import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SecretariatLayout from '../../layouts/SecretariatLayout';
import { ROUTES } from '../../constants/routes';
import { processingApi, checkingApi } from '../../services/api';
import { getCurrentUser } from '../../utils/auth';
import DocumentPreviewModal from '../../components/common/DocumentPreviewModal';

const REPOSITORY_DOCS = [];

export default function ApplicationProcessing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const protocolIdParam = searchParams.get('id');
  const [protocol, setProtocol] = useState(null);
  const [evaluatorsList, setEvaluatorsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProtocolAndReviewers = async () => {
    try {
      setIsLoading(true);
      let targetId = protocolIdParam;
      if (!targetId) {
        const qRes = await checkingApi.queue();
        const qList = (qRes && (qRes.queue || qRes.protocols)) || [];
        if (qList && qList[0]) {
          targetId = qList[0].protocolId || qList[0].id;
        }
      }

      const revRes = await processingApi.getReviewers().catch(() => ({ reviewers: [] }));
      if (revRes && revRes.success && Array.isArray(revRes.reviewers)) {
        setEvaluatorsList(revRes.reviewers);
      }

      if (targetId) {
        const pRes = await processingApi.get(targetId);
        if (pRes && pRes.success && pRes.protocol) {
          const p = pRes.protocol;
          setProtocol(p);
          setSelectedStatus(p.status || 'Assigned to Reviewers (14-Day Window)');
          setAssignedReviewer(p.assignedReviewer || null);
          setClearanceIssued(Boolean(p.clearanceCertNo || p.status === 'Completed' || p.status === 'Clearance Issued'));
          if (p.clearanceCertNo) setClearanceCertNo(p.clearanceCertNo);
          if (p.clearanceValidity) setClearanceValidity(p.clearanceValidity);
          if (p.docketMeeting) setDocketMeeting(p.docketMeeting);
          if (p.logs) setTrailEntries(p.logs);
        }
      }
    } catch (err) {
      console.error('Failed to load application processing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocolAndReviewers();
    const handleSync = () => fetchProtocolAndReviewers();
    window.addEventListener('urerb_secretariat_queue_sync', handleSync);
    return () => {
      window.removeEventListener('urerb_secretariat_queue_sync', handleSync);
    };
  }, [protocolIdParam]);

  const matchedProtocol = protocol;

  const activeProtocolId = matchedProtocol?.protocolCode || matchedProtocol?.protocolId || '';
  const activeTitle = matchedProtocol?.title || '';
  const activePi = matchedProtocol?.pi || matchedProtocol?.primaryInvestigator?.name || '';
  const activeUnit = matchedProtocol?.college || matchedProtocol?.primaryInvestigator?.college || matchedProtocol?.academicUnit || '';
  const activeSubmittedDate = matchedProtocol?.dateReceived || matchedProtocol?.dateSubmitted || '';
  const repositoryDocs = matchedProtocol?.documents || REPOSITORY_DOCS;

  const [selectedPanel, setSelectedPanel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(
    'Assigned to Reviewers (14-Day Window)'
  );
  const [assignedReviewer, setAssignedReviewer] = useState(null);
  const [clearanceIssued, setClearanceIssued] = useState(false);

  // Modals state: 'assign' | 'confirm' | null
  const [modalStep, setModalStep] = useState(null);
  const [evaluatorSearch, setEvaluatorSearch] = useState('');
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');

  // Additional Modals: Add Note, Edit Docket, Issue Clearance
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteBadgeType, setNoteBadgeType] = useState('Panel Note');
  const [noteText, setNoteText] = useState('');
  const [trailEntries, setTrailEntries] = useState([]);

  const [showDocketModal, setShowDocketModal] = useState(false);
  const [docketMeeting, setDocketMeeting] = useState('To be scheduled');
  const [docketTrackTime, setDocketTrackTime] = useState('Panel Review');

  const nowDate = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const defaultValidity = `${monthNames[nowDate.getMonth()]} ${nowDate.getFullYear()} – ${monthNames[nowDate.getMonth()]} ${nowDate.getFullYear() + 1} (1 Year)`;

  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [clearanceCertNo, setClearanceCertNo] = useState(`${nowDate.getFullYear()}-C001`);
  const [clearanceValidity, setClearanceValidity] = useState(defaultValidity);

  const [previewDoc, setPreviewDoc] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  const currentUser = getCurrentUser();
  const activeOfficerName =
    currentUser?.role === 'secretariat'
      ? currentUser.name || currentUser.fullName
      : 'Secretariat Officer';
  const activeOfficerDesk =
    currentUser?.role === 'secretariat' ? currentUser.desk : '';

  const selectedEvaluator =
    evaluatorsList.find((e) => String(e.id) === String(selectedEvaluatorId)) ||
    evaluatorsList[0] || {
      id: '',
      name: 'Unassigned',
      unit: '',
      unitFormatted: '',
      activeReviews: 0,
    };

  const filteredEvaluators = evaluatorsList.filter((ev) => {
    if (!evaluatorSearch.trim()) return true;
    const q = evaluatorSearch.toLowerCase();
    return (
      ev.name?.toLowerCase().includes(q) ||
      ev.college?.toLowerCase().includes(q) ||
      ev.unit?.toLowerCase().includes(q)
    );
  });

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleDownloadDoc = (doc) => {
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, '_blank');
      return;
    }
    const blob = new Blob(
      [
        `MARIANO MARCOS STATE UNIVERSITY\nURERB Secretariat Repository\n\nProtocol: ${activeProtocolId}\nTitle: ${activeTitle}\nDocument: ${doc.title}\nVersion: ${doc.version}\nStatus: ${doc.status}`,
      ],
      { type: 'application/pdf' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProtocolId}_${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZipAll = () => {
    if (matchedProtocol?.id) {
      window.open(`/urerb-api/file.php?action=bundle&id=${matchedProtocol.id}`, '_blank');
      triggerToast(`Downloading protocol dossier bundle for ${activeProtocolId}`);
      return;
    }
    const summary = repositoryDocs.map(
      (d) => `- ${d.title} (${d.version}) [${d.status}]`
    ).join('\n');
    const blob = new Blob(
      [
        `MARIANO MARCOS STATE UNIVERSITY\nURERB PROTOCOL DOSSIER ARCHIVE\n\nProtocol ID: ${activeProtocolId}\nTitle: ${activeTitle}\nPrincipal Investigator: ${activePi}\n\nIncluded Files:\n${summary}`,
      ],
      { type: 'application/zip' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProtocolId}_Complete_Dossier.zip`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast(`Downloaded all ${repositoryDocs.length} repository documents for ${activeProtocolId}`);
  };

  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !matchedProtocol) return;
    try {
      await processingApi.addNote({
        protocolId: matchedProtocol.id,
        badge: noteBadgeType,
        text: noteText.trim(),
      });
      setNoteText('');
      setShowAddNoteModal(false);
      triggerToast('Coordination note added to Investigator Trail');
      const refreshed = await processingApi.get(matchedProtocol.id);
      if (refreshed && refreshed.success && refreshed.protocol) {
        setProtocol(refreshed.protocol);
        setTrailEntries(refreshed.protocol.logs || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to save note.');
    }
  };

  const handleIssueClearance = async () => {
    if (!matchedProtocol) return;
    try {
      await processingApi.issueClearance({
        protocolId: matchedProtocol.id,
        certNo: clearanceCertNo,
        validity: clearanceValidity,
        remarks: `Official Ethics Clearance Certificate (#${clearanceCertNo}) issued. Validity: ${clearanceValidity}.`,
      });
      setClearanceIssued(true);
      setSelectedStatus('Approved — Ethics Clearance Issued');
      setShowClearanceModal(false);
      triggerToast(`Ethics Clearance Certificate #${clearanceCertNo} issued!`);
      window.dispatchEvent(new Event('urerb_secretariat_queue_sync'));
      window.dispatchEvent(new Event('urerb_secretariat_archives_sync'));
      const refreshed = await processingApi.get(matchedProtocol.id);
      if (refreshed && refreshed.success && refreshed.protocol) {
        setProtocol(refreshed.protocol);
        setTrailEntries(refreshed.protocol.logs || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to issue clearance certificate.');
    }
  };

  const handleConfirmAssignment = async () => {
    if (!matchedProtocol || !selectedEvaluator) return;
    try {
      const chosenPanel = selectedPanel || matchedProtocol.reviewTrack || 'Ethics Review Panel';
      await processingApi.assignReviewer({
        protocolId: matchedProtocol.id,
        reviewerId: selectedEvaluator.id,
        assignmentType: 'Primary Reviewer',
        panelName: chosenPanel,
        daysDue: 14,
      });
      setAssignedReviewer(selectedEvaluator);
      setSelectedStatus('Assigned to Reviewers (14-Day Window)');
      setModalStep(null);
      triggerToast(`${selectedEvaluator.name} assigned to ${activeProtocolId}`);
      window.dispatchEvent(new Event('urerb_secretariat_queue_sync'));
      const refreshed = await processingApi.get(matchedProtocol.id);
      if (refreshed && refreshed.success && refreshed.protocol) {
        setProtocol(refreshed.protocol);
        setTrailEntries(refreshed.protocol.logs || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to assign reviewer.');
    }
  };

  const handleUpdateDocketSubmit = async () => {
    if (!matchedProtocol) return;
    try {
      await processingApi.updateDocket({
        protocolId: matchedProtocol.id,
        docketMeeting,
        reviewTrack: docketTrackTime,
      });
      setShowDocketModal(false);
      triggerToast(`Docket slot updated: ${docketMeeting}`);
    } catch (err) {
      alert(err.message || 'Failed to update docket.');
    }
  };

  if (!matchedProtocol) {
    return (
      <SecretariatLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Application Details &amp; Review Coordination
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Assign review panels, coordinate evaluators, and issue ethics clearance certificates.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">account_tree</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              No protocol selected for review coordination
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Route an intake-verified protocol from Applications Management to assign reviewers, track deliberation, and issue clearance.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate(ROUTES.SECRETARIAT.APPLICATIONS_MANAGEMENT)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                <span>Go to Applications Management</span>
              </button>
            </div>
          </div>
        </div>
      </SecretariatLayout>
    );
  }

  return (
    <SecretariatLayout showApplicationsBadge>
      <div className="space-y-5">
        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">
              check_circle
            </span>
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Page Title & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Application Details &amp; Review Coordination
          </h1>

          <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#eef1f8] hover:bg-[#e2e7f3] text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Print Summary</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearanceModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                workspace_premium
              </span>
              <span>
                {clearanceIssued ? 'View Clearance Cert' : 'Update Status / Clearance'}
              </span>
            </button>
          </div>
        </div>

        {/* Protocol Header Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="space-y-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block px-3 py-1 rounded bg-[#e2ece9] text-[#14432f] font-mono text-xs font-bold">
                Application ID: {activeProtocolId}
              </span>
              {clearanceIssued && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d1fae5] text-[#065f46] text-xs font-bold">
                  <span className="material-symbols-outlined text-[14px]">
                    verified
                  </span>
                  Ethics Clearance Issued (#{clearanceCertNo})
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {activeTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                PRINCIPAL INVESTIGATOR
              </span>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {activePi}
              </div>
              <div className="text-slate-500 mt-0.5">{activeUnit}</div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                DATE SUBMITTED
              </span>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {activeSubmittedDate}
              </div>
              <div className="text-slate-500 mt-0.5">Intake Cleared</div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                ASSIGNED SECRETARIAT
              </span>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {activeOfficerName}
              </div>
              <div className="text-slate-500 mt-0.5">
                {activeOfficerDesk ? `Desk: ${activeOfficerDesk}` : 'Secretariat Desk'}
              </div>
            </div>
          </div>
        </div>

        {/* Protocol Governance Pipeline Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              PROTOCOL GOVERNANCE PIPELINE
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#14432f]">
              {clearanceIssued
                ? 'Stage 5: Ethics Clearance Issued'
                : assignedReviewer
                ? 'Deliberation & Findings Active'
                : 'Stage 3: Panel & Reviewer Assignment'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            {/* Step 1 */}
            <div className="px-3.5 py-2.5 rounded-lg bg-[#f4f6fb] text-slate-800 font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#14432f]">
                check_circle
              </span>
              <span className="text-[11px]">1. RECEIVED</span>
            </div>

            {/* Step 2 */}
            <div className="px-3.5 py-2.5 rounded-lg bg-[#f4f6fb] text-slate-800 font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#14432f]">
                check_circle
              </span>
              <span className="text-[11px]">2. INTAKE PASSED</span>
            </div>

            {/* Step 3 */}
            <div
              className={`px-3.5 py-2.5 rounded-lg font-bold flex items-center gap-2 ${
                assignedReviewer || clearanceIssued
                  ? 'bg-[#f4f6fb] text-slate-800'
                  : 'bg-[#e2e8f8] border-l-4 border-[#14432f] text-[#14432f]'
              }`}
            >
              {assignedReviewer || clearanceIssued ? (
                <span className="material-symbols-outlined text-[16px] text-[#14432f]">
                  check_circle
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#14432f] shrink-0"></span>
              )}
              <span className="text-[11px]">3. PANEL ASSIGNMENT</span>
            </div>

            {/* Step 4 */}
            <div
              className={`px-3.5 py-2.5 rounded-lg font-bold flex items-center gap-2 ${
                clearanceIssued
                  ? 'bg-[#f4f6fb] text-slate-800'
                  : assignedReviewer
                  ? 'bg-[#e2e8f8] border-l-4 border-[#14432f] text-[#14432f]'
                  : 'bg-white border border-slate-100 text-slate-500 font-semibold'
              }`}
            >
              {clearanceIssued ? (
                <span className="material-symbols-outlined text-[16px] text-[#14432f]">
                  check_circle
                </span>
              ) : (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    assignedReviewer ? 'bg-[#14432f]' : 'bg-slate-400'
                  }`}
                ></span>
              )}
              <span className="text-[11px]">4. DELIBERATION</span>
            </div>

            {/* Step 5: Clickable to open Clearance Modal */}
            <button
              type="button"
              onClick={() => setShowClearanceModal(true)}
              className={`px-3.5 py-2.5 rounded-lg font-bold flex items-center gap-2 text-left transition-colors cursor-pointer ${
                clearanceIssued
                  ? 'bg-[#d1fae5] border border-emerald-300 text-[#065f46]'
                  : 'bg-white hover:bg-slate-50 border border-slate-100 text-slate-500 font-semibold'
              }`}
            >
              {clearanceIssued ? (
                <span className="material-symbols-outlined text-[16px] text-[#065f46]">
                  verified
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
              )}
              <span className="text-[11px]">5. CLEARANCE</span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Review Panel & Reviewer Assignment Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#14432f]">
                  badge
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Review Panel &amp; Reviewer Assignment
                </h3>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  REVIEW PANEL
                </label>
                <select
                  value={selectedPanel}
                  onChange={(e) => setSelectedPanel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#14432f] cursor-pointer"
                >
                  <option value="">[ Select Appropriate Review Panel ▼ ]</option>
                  <option value="Panel B — Expedited Review (Natural & Biological Sciences)">
                    Panel B — Expedited Review (Natural &amp; Biological Sciences)
                  </option>
                  <option value="Panel A — Clinical, Health & Biomedical Sciences">
                    Panel A — Clinical, Health &amp; Biomedical Sciences
                  </option>
                  <option value="Panel C — Social, Behavioral & Educational Sciences">
                    Panel C — Social, Behavioral &amp; Educational Sciences
                  </option>
                </select>
              </div>

              {/* Assigned Reviewer Box */}
              <div className="p-4 rounded-xl bg-[#f4f6fb] border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    ASSIGNED REVIEWER
                  </span>
                  {assignedReviewer ? (
                    <span className="px-2.5 py-0.5 rounded bg-[#d1fae5] text-[#065f46] font-mono text-[10px] font-bold">
                      Assigned · 14-Day Window
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded bg-[#e8ecfb] text-slate-600 font-mono text-[10px] font-semibold">
                      Not Assigned
                    </span>
                  )}
                </div>

                {assignedReviewer ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {assignedReviewer.name}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {assignedReviewer.unitFormatted}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalStep('assign')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-center"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        person_add
                      </span>
                      <span>Change / Reassign Reviewer</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-600">
                      No reviewer assigned yet. Manual assignment required by Secretariat.
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => setModalStep('assign')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          add
                        </span>
                        <span>Assign Reviewer</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Submitted Protocol Repository Table Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Submitted Protocol Repository
                </h3>
                <button
                  type="button"
                  onClick={handleDownloadZipAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f4f6fb] hover:bg-[#e8ecfb] border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px] text-[#14432f]">
                    folder_zip
                  </span>
                  <span>ZIP All ({repositoryDocs.length})</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f4f6fb] border-b border-slate-200/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">DOCUMENT</th>
                      <th className="py-3 px-3">VERSION</th>
                      <th className="py-3 px-3">UPLOADED</th>
                      <th className="py-3 px-3">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {repositoryDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-[18px] text-slate-500">
                              {doc.icon}
                            </span>
                            <div>
                              <span className="font-semibold text-slate-800 block">
                                {doc.title}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {doc.subtitle}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 align-middle">
                          <span className="px-2 py-0.5 rounded bg-[#e8ecfb] text-slate-700 font-mono text-[11px] font-semibold">
                            {doc.version}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 align-middle font-mono text-slate-600">
                          {doc.uploaded}
                        </td>
                        <td className="py-3.5 px-3 align-middle">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#14432f]">
                            <span className="material-symbols-outlined text-[14px]">
                              check_circle
                            </span>
                            {doc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 align-middle text-right">
                          <div className="inline-flex items-center gap-2 text-slate-500">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1 hover:text-slate-900 transition-colors cursor-pointer"
                              title="Preview Document"
                            >
                              <span className="material-symbols-outlined text-[17px]">
                                visibility
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadDoc(doc)}
                              className="p-1 hover:text-slate-900 transition-colors cursor-pointer"
                              title="Download Document"
                            >
                              <span className="material-symbols-outlined text-[17px]">
                                download
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Coordination Control Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Coordination Control
                </h3>
                <span className="font-mono text-[11px] text-slate-400">
                  Sec Desk
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  UPDATE STATUS
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f4f6fb] border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-[#14432f] cursor-pointer"
                >
                  <option value="Revision Required (Active)">
                    Revision Required (Active)
                  </option>
                  <option value="Assigned to Reviewers (14-Day Window)">
                    Assigned to Reviewers (14-Day Window)
                  </option>
                  <option value="Under Panel Deliberation">
                    Under Panel Deliberation
                  </option>
                  <option value="Approved — Ready for Clearance">
                    Approved — Ready for Clearance
                  </option>
                </select>
              </div>

              {/* Docket Slot Box (Clickable to edit docket slot) */}
              <div
                onClick={() => setShowDocketModal(true)}
                title="Click to reschedule or update docket meeting slot"
                className="p-3.5 rounded-xl bg-[#f4f6fb] hover:bg-[#ebeffa] border border-slate-200/70 space-y-1 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    DOCKET SLOT
                  </span>
                  <span className="material-symbols-outlined text-[15px] text-slate-400 group-hover:text-[#14432f]">
                    edit_calendar
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900">
                  {docketMeeting}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  {docketTrackTime}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (selectedStatus === 'Approved — Ready for Clearance') {
                    setShowClearanceModal(true);
                  } else {
                    triggerToast(
                      `Status updated to: ${selectedStatus || 'Assigned to Reviewers'}`
                    );
                  }
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  save_as
                </span>
                <span>Apply Status Change</span>
              </button>
            </div>

            {/* Investigator Trail Card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#14432f]">
                    history
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Investigator Trail
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(true)}
                  className="text-xs font-semibold text-[#14432f] hover:underline cursor-pointer"
                >
                  + Note
                </button>
              </div>

              <div className="space-y-3 text-xs max-h-80 overflow-y-auto pr-0.5">
                {trailEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg bg-[#f4f6fb] border border-slate-200/60 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-500">
                        {entry.date}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${entry.badgeColor}`}
                      >
                        {entry.badge}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium leading-snug">
                      {entry.text}
                    </p>
                    <div className="text-[10px] font-mono text-slate-400">
                      By: {entry.author}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Assign Reviewer */}
      {modalStep === 'assign' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#d1fae5] text-[#065f46] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    person_add
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Reviewer
                  </h3>
                  <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                    {activeProtocolId} · {activeTitle.slice(0, 32)}...
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalStep(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-[#f4f6fb] border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-[#14432f]">
                  verified_user
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      CURRENTLY SELECTED
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#14432f] text-white text-[10px] font-bold">
                      Active
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                    {selectedEvaluator.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedEvaluator.unit}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-white border border-slate-200 font-mono text-[11px] text-slate-600 shrink-0">
                {selectedEvaluator.activeReviews} active reviews
              </span>
            </div>

            <div className="mt-3.5 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={evaluatorSearch}
                onChange={(e) => setEvaluatorSearch(e.target.value)}
                placeholder="Search reviewer by name, college, or field..."
                className="w-full pl-9 pr-3.5 py-2 bg-[#f4f6fb] border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#14432f]"
              />
            </div>

            <div className="mt-4 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                SELECT ASSIGNED REVIEWER
              </span>
              <span className="px-2 py-0.5 rounded bg-[#e8ecfb] text-slate-700 font-mono text-[10px] font-bold">
                {filteredEvaluators.length} Available {filteredEvaluators.length === 1 ? 'Evaluator' : 'Evaluators'}
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
              {filteredEvaluators.map((ev) => {
                const isSelected = ev.id === selectedEvaluatorId;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvaluatorId(ev.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#f4f7f5] border-2 border-[#14432f]'
                        : 'bg-[#f8f9fc] border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-[#14432f] bg-[#14432f]'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {ev.name}
                          </span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded bg-[#14432f] text-white text-[10px] font-bold">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {ev.unit}
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-[11px] text-slate-500 shrink-0">
                      {ev.activeReviews} active {ev.activeReviews === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-[#f4f6fb] border border-slate-200/70 flex items-start gap-2.5 text-[11px] text-slate-600">
              <span className="material-symbols-outlined text-[16px] text-slate-500 mt-0.5 shrink-0">
                info
              </span>
              <span>
                <strong className="text-slate-800">Institutional Review Protocol:</strong> Assigned evaluator receives Form 16 Evaluation Sheet with a 10 working-day review window.
              </span>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalStep(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setModalStep('confirm')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  check_circle
                </span>
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Confirm Reviewer Assignment? */}
      {modalStep === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e0e7ff] text-[#1e3a8a] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    how_to_reg
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm Reviewer Assignment?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Are you sure you want to assign the selected reviewer to this protocol?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalStep(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-[#f4f6fb] border border-slate-200/80 space-y-3 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#14432f] text-white font-mono font-bold text-xs">
                  {activeProtocolId}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  {selectedPanel || matchedProtocol?.reviewTrack || 'Panel Review'}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {activeTitle}
                </h4>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-slate-400">
                    person
                  </span>
                  <span>
                    Principal Investigator: <strong className="text-slate-900">{activePi}</strong>
                  </span>
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  ASSIGNED REVIEWER
                </span>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedEvaluator.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {selectedEvaluator.unitFormatted}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 flex-wrap gap-2">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#14432f]">
                    description
                  </span>
                  <span>
                    Form: <strong className="text-slate-900">URERB Form 16 (PHREB v2.5 Standard)</strong>
                  </span>
                </span>
                <span className="font-mono text-slate-500">
                  Review Window: 14 Calendar Days
                </span>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-lg bg-[#eef2ff] border border-indigo-100 flex items-start gap-2.5 text-[11px] text-slate-700 leading-relaxed">
              <span className="material-symbols-outlined text-[16px] text-slate-700 mt-0.5 shrink-0">
                info
              </span>
              <span>
                <strong className="text-slate-900">Action Notice:</strong> Once confirmed, formal review invitation memos and evaluation sheets will be automatically dispatched to the reviewer&apos;s portal account. Evaluation period will be set to 14 calendar days.
              </span>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalStep('assign')}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  check_circle
                </span>
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Coordination Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#14432f]">
                  post_add
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  Add Investigator Trail Note
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddNoteModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNoteSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Action / Trail Category
                </label>
                <select
                  value={noteBadgeType}
                  onChange={(e) => setNoteBadgeType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#14432f]"
                >
                  <option value="Panel Note">Panel Note</option>
                  <option value="Endorsed">Endorsed</option>
                  <option value="Revision Sent">Revision Sent</option>
                  <option value="Clearance">Clearance</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Coordination Remarks
                </label>
                <textarea
                  rows={3}
                  required
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter official Secretariat log entry for this protocol..."
                  className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-[#14432f]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white font-semibold cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Docket / Meeting Slot Modal */}
      {showDocketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#14432f]">
                  edit_calendar
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  Schedule Docket Meeting Slot
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDocketModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Committee Meeting Session
                </label>
                <input
                  type="text"
                  value={docketMeeting}
                  onChange={(e) => setDocketMeeting(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-[#14432f]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Panel Track &amp; Time Slot
                </label>
                <input
                  type="text"
                  value={docketTrackTime}
                  onChange={(e) => setDocketTrackTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-[#14432f]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDocketModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateDocketSubmit}
                  className="px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white font-semibold cursor-pointer"
                >
                  Update Docket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Issue Ethics Clearance Certificate Modal */}
      {showClearanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d1fae5] text-[#065f46] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">
                    workspace_premium
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Issue Ethics Clearance Certificate
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Stage 5 Final Governance Approval &amp; Digital Archiving
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearanceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#f4f6fb] border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Protocol ID</span>
                  <span className="font-mono font-bold text-[#14432f]">
                    {activeProtocolId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Research Title</span>
                  <span className="font-bold text-slate-900 block">
                    {activeTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500">Principal Investigator</span>
                  <span className="font-semibold text-slate-900">{activePi}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Certificate Control No.
                  </label>
                  <input
                    type="text"
                    value={clearanceCertNo}
                    onChange={(e) => setClearanceCertNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs focus:outline-none focus:border-[#14432f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Clearance Validity Period
                  </label>
                  <input
                    type="text"
                    value={clearanceValidity}
                    onChange={(e) => setClearanceValidity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#14432f]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
                Issuing this certificate marks Stage 5 (Clearance) as complete, dispatches the signed digital certificate to the Principal Investigator, and registers the protocol in the URERB Digital Ledger.
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearanceModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIssueClearance}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  verified
                </span>
                <span>Issue Ethics Clearance</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </SecretariatLayout>
  );
}
