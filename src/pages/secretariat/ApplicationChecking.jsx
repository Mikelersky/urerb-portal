import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SecretariatLayout from '../../layouts/SecretariatLayout';
import { ROUTES } from '../../constants/routes';
import { checkingApi, processingApi } from '../../services/api';
import DocumentPreviewModal from '../../components/common/DocumentPreviewModal';

const DEFICIENCY_REASON_PRESETS = [
  'Missing Dean / Department Chair endorsement signature',
  'Consent Form (Form 16) requires localized Ilokano dialect version',
  'Methodology and participant risk mitigation incomplete',
  'Cashier official payment receipt is illegible or amount mismatch',
  'Good Clinical Practice (GCP) or Ethics Training certificate missing',
  'Study protocol questionnaires / observation guide missing',
];

export default function ApplicationChecking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const protocolIdParam = searchParams.get('id');
  const [protocol, setProtocol] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track per-document status overrides so individual documents can be toggled
  const [docOverrides, setDocOverrides] = useState({});
  // Specific deficiency notes per document ID: { [docId]: string }
  const [docDeficiencyIssues, setDocDeficiencyIssues] = useState({});

  const fetchProtocol = async () => {
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
      if (targetId) {
        const res = await processingApi.get(targetId);
        if (res && res.success && res.protocol) {
          setProtocol(res.protocol);
        }
      }
    } catch (err) {
      console.error('Failed to load application for checking:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocol();
    const handleSync = () => fetchProtocol();
    window.addEventListener('urerb_secretariat_queue_sync', handleSync);
    return () => {
      window.removeEventListener('urerb_secretariat_queue_sync', handleSync);
    };
  }, [protocolIdParam]);

  const matchedProtocol = protocol;

  const documents = useMemo(() => {
    const sourceDocs = matchedProtocol?.documents || [];
    return sourceDocs.map((doc) => {
      const overriddenStatus = docOverrides[doc.id];
      const effectiveStatus = overriddenStatus || (doc.status === 'Deficient' ? 'Deficient' : 'Verified');
      const specificIssue = docDeficiencyIssues[doc.id] !== undefined
        ? docDeficiencyIssues[doc.id]
        : (doc.issueText || doc.notes || doc.remarks || '');
      return {
        ...doc,
        status: effectiveStatus,
        issueText:
          effectiveStatus === 'Deficient'
            ? (specificIssue || 'Required signature or endorsement attachment missing from uploaded file.')
            : undefined,
      };
    });
  }, [matchedProtocol, docOverrides, docDeficiencyIssues]);

  const verifiedCount = documents.filter((d) => d.status === 'Verified').length;
  const totalCount = documents.length;
  const deficientCount = totalCount - verifiedCount;
  const isAllVerified = totalCount > 0 && deficientCount === 0;

  const activeProtocolId = matchedProtocol?.protocolCode || matchedProtocol?.protocolId || '';
  const activeTitle = matchedProtocol?.title || '';
  const activePi = matchedProtocol?.pi || matchedProtocol?.primaryInvestigator?.name || '';
  const activeUnit = matchedProtocol?.college || matchedProtocol?.primaryInvestigator?.college || matchedProtocol?.academicUnit || '';
  const activeSubmittedAt = matchedProtocol
    ? [matchedProtocol.dateReceived, matchedProtocol.timeReceived]
        .filter(Boolean)
        .join(', ') || matchedProtocol.dateSubmitted || 'Recently'
    : '';

  const [remarks, setRemarks] = useState(matchedProtocol?.remarks || '');
  const [showConfirmNoticeModal, setShowConfirmNoticeModal] = useState(false);
  const [showSuccessNoticeModal, setShowSuccessNoticeModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [noticeSent, setNoticeSent] = useState(
    matchedProtocol?.statusCategory === 'clarification' || matchedProtocol?.status === 'PI Clarification'
  );
  const [toastMsg, setToastMsg] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    setDocOverrides({});
    setRemarks(matchedProtocol?.remarks || '');
    setNoticeSent(
      matchedProtocol?.statusCategory === 'clarification' || matchedProtocol?.status === 'PI Clarification'
    );
    if (matchedProtocol?.documents) {
      const initialIssues = {};
      const initialOverrides = {};
      matchedProtocol.documents.forEach((d) => {
        if (d.status === 'Deficient' || d.issueText || d.notes) {
          initialIssues[d.id] = d.issueText || d.notes || '';
          initialOverrides[d.id] = 'Deficient';
        }
      });
      setDocDeficiencyIssues(initialIssues);
      if (Object.keys(initialOverrides).length > 0) {
        setDocOverrides(initialOverrides);
      }
    }
  }, [matchedProtocol?.protocolCode, matchedProtocol?.protocolId]);

  const handleSelectDetermination = async (mode) => {
    const sourceDocs = matchedProtocol?.documents || [];
    if (mode === 'pass') {
      const allVerifiedMap = {};
      sourceDocs.forEach((d) => {
        allVerifiedMap[d.id] = 'Verified';
      });
      setDocOverrides(allVerifiedMap);
      setDocDeficiencyIssues({});
      setRemarks('All mandatory URERB submission forms verified. Ready for Review Panel Assignment.');
      try {
        const docStatuses = sourceDocs.map((d) => ({
          documentId: d.id,
          id: d.id,
          key: d.key,
          status: 'Verified',
          issueText: '',
          remarks: '',
        }));
        await checkingApi.saveProgress({
          protocolId: matchedProtocol.id,
          remarks: 'All mandatory URERB submission forms verified. Ready for Review Panel Assignment.',
          documents: docStatuses,
        });
      } catch (err) {
        console.warn('Async sync on pass:', err);
      }
    } else {
      const currentlyDeficient = sourceDocs.some((d) => (docOverrides[d.id] || d.status) === 'Deficient');
      if (!currentlyDeficient && sourceDocs[0]) {
        setDocOverrides({
          [sourceDocs[0].id]: 'Deficient',
        });
        if (!docDeficiencyIssues[sourceDocs[0].id]) {
          setDocDeficiencyIssues((prev) => ({
            ...prev,
            [sourceDocs[0].id]: 'Required signature or endorsement attachment missing from uploaded file.',
          }));
        }
      }
      setRemarks('Submission documents require correction or re-upload. Returned to Principal Investigator for correction.');
    }
  };

  const handleSetDocDeficiency = (docId, isDeficient) => {
    setDocOverrides((prev) => ({
      ...prev,
      [docId]: isDeficient ? 'Deficient' : 'Verified',
    }));
    if (isDeficient && !docDeficiencyIssues[docId]) {
      setDocDeficiencyIssues((prev) => ({
        ...prev,
        [docId]: 'Required signature, endorsement, or content correction required.',
      }));
    }
  };

  const handleSelectAllDeficient = () => {
    const sourceDocs = matchedProtocol?.documents || [];
    const allDefMap = {};
    const issuesMap = { ...docDeficiencyIssues };
    sourceDocs.forEach((d) => {
      allDefMap[d.id] = 'Deficient';
      if (!issuesMap[d.id]) {
        issuesMap[d.id] = 'Correction or re-upload required for this document.';
      }
    });
    setDocOverrides(allDefMap);
    setDocDeficiencyIssues(issuesMap);
  };

  const handleClearDeficiencies = async () => {
    const sourceDocs = matchedProtocol?.documents || [];
    const allVerMap = {};
    sourceDocs.forEach((d) => {
      allVerMap[d.id] = 'Verified';
    });
    setDocOverrides(allVerMap);
    setDocDeficiencyIssues({});
    try {
      const docStatuses = sourceDocs.map((d) => ({
        documentId: d.id,
        id: d.id,
        key: d.key,
        status: 'Verified',
        issueText: '',
        remarks: '',
      }));
      await checkingApi.saveProgress({
        protocolId: matchedProtocol.id,
        remarks: remarks || 'All mandatory URERB submission forms verified.',
        documents: docStatuses,
      });
    } catch (err) {
      console.warn('Async sync on clear deficiencies:', err);
    }
    triggerToast('All forms marked as Verified');
  };

  const handleApplyPresetToDoc = (docId, presetText) => {
    setDocDeficiencyIssues((prev) => {
      const current = prev[docId] || '';
      const updated = current && !current.includes(presetText)
        ? `${current}; ${presetText}`
        : presetText;
      return {
        ...prev,
        [docId]: updated,
      };
    });
  };

  const handleSetDocIssue = (docId, text) => {
    setDocDeficiencyIssues((prev) => ({
      ...prev,
      [docId]: text,
    }));
  };

  const handleToggleDocStatus = async (doc) => {
    const nextStatus = doc.status === 'Verified' ? 'Deficient' : 'Verified';
    setDocOverrides((prev) => ({
      ...prev,
      [doc.id]: nextStatus,
    }));
    if (nextStatus === 'Deficient' && !docDeficiencyIssues[doc.id]) {
      setDocDeficiencyIssues((prev) => ({
        ...prev,
        [doc.id]: 'Required signature, endorsement, or content correction required.',
      }));
    }
    try {
      await checkingApi.toggleDoc({
        protocolId: matchedProtocol.id,
        documentId: doc.id,
        documentKey: doc.key,
        status: nextStatus,
        issueText: nextStatus === 'Deficient' ? (docDeficiencyIssues[doc.id] || '') : '',
      });
    } catch (err) {
      console.warn('Async toggle doc error:', err);
    }
    triggerToast(`Marked "${doc.title}" as ${nextStatus}`);
  };

  const handleSaveProgress = async () => {
    if (!matchedProtocol) return;
    try {
      const docStatuses = documents.map((d) => ({
        documentId: d.id,
        id: d.id,
        key: d.key,
        status: d.status,
        issueText: d.issueText || '',
        remarks: d.issueText || '',
      }));
      await checkingApi.saveProgress({
        protocolId: matchedProtocol.id,
        remarks,
        documents: docStatuses,
      });
      triggerToast('Checking progress saved to server');
    } catch (err) {
      alert(err.message || 'Failed to save checking progress.');
    }
  };

  const handleSendDeficiencyNotice = async () => {
    if (!matchedProtocol) return;
    try {
      const defDocs = documents.filter((d) => d.status === 'Deficient');
      if (defDocs.length === 0) {
        alert('Please select at least one form requiring correction before dispatching the notice.');
        return;
      }
      const itemsPayload = defDocs.map((d) => ({
        documentId: d.id,
        id: d.id,
        key: d.key,
        title: d.title,
        issueText: d.issueText || remarks || 'Correction required.',
      }));
      await checkingApi.sendDeficiency({
        protocolId: matchedProtocol.id,
        remarks,
        items: itemsPayload,
        deficientDocs: itemsPayload,
      });
      setShowConfirmNoticeModal(false);
      setShowSuccessNoticeModal(true);
      setNoticeSent(true);
      window.dispatchEvent(new Event('urerb_secretariat_queue_sync'));
    } catch (err) {
      alert(err.message || 'Failed to dispatch deficiency notice.');
    }
  };

  const handlePassIntakeAndRoute = async () => {
    if (!matchedProtocol) return;
    try {
      const docStatuses = documents.map((d) => ({
        documentId: d.id,
        id: d.id,
        key: d.key,
        status: 'Verified',
        issueText: '',
      }));
      await checkingApi.passIntake({
        protocolId: matchedProtocol.id,
        remarks,
        documents: docStatuses,
      });
      setShowRouteModal(false);
      window.dispatchEvent(new Event('urerb_secretariat_queue_sync'));
      navigate(
        `${ROUTES.SECRETARIAT.APPLICATION_PROCESSING}?id=${matchedProtocol.protocolCode || matchedProtocol.protocolId || matchedProtocol.id}`
      );
    } catch (err) {
      alert(err.message || 'Failed to pass intake.');
    }
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const deficientDoc = documents.find((d) => d.status === 'Deficient');

  if (!matchedProtocol) {
    return (
      <SecretariatLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Application Checking (Completeness Verification)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Review submitted forms and payment documents for completeness before the application proceeds to ethics review.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">fact_check</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              No protocol selected for completeness checking
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are currently no applications in the Secretariat intake queue. Once researchers submit protocols, select an application from Applications Management to verify its documents.
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
    <SecretariatLayout>
      <div className="space-y-6">
        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">
              check_circle
            </span>
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Page Title & Right Status Pill */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Application Checking (Completeness Verification)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Review submitted forms and payment documents for completeness before the application proceeds to ethics review.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start shrink-0 flex-wrap">
            {!isAllVerified && noticeSent && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#eef1f8] border border-slate-200 text-xs font-semibold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-[#14432f]"></span>
                <span className="leading-tight">
                  Correction Notice Sent (Pending Resubmission)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Protocol Summary Banner Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-900 bg-[#e8ecfb] px-2.5 py-1 rounded">
                {activeProtocolId}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-[#eef1f8] px-2.5 py-1 rounded">
                {isAllVerified ? 'Intake Cleared' : 'Intake Verification'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#065f46] bg-[#d1fae5] px-2.5 py-1 rounded">
                {isAllVerified && (
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                )}
                {isAllVerified
                  ? 'Ready for Review Coordination'
                  : matchedProtocol?.reviewTrack || 'Intake Review'}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {activeTitle}
            </h2>

            <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
              <span className="font-semibold text-slate-800">{activePi}</span>
              <span>•</span>
              <span>{activeUnit}</span>
              <span>•</span>
              <span>Submission: {activeSubmittedAt}</span>
            </div>
          </div>

          {/* Verification Progress Box */}
          <div className="bg-[#f4f6fb] border border-slate-200/70 rounded-xl px-5 py-3.5 flex items-center gap-4 shrink-0">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                VERIFICATION PROGRESS
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {verifiedCount} of {totalCount} Documents Verified
              </div>
            </div>
            <div className="w-24 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#14432f] rounded-full transition-all duration-300"
                style={{
                  width: `${totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Checklist (7 cols) */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 pb-1 border-b border-slate-200/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[20px] ${!isAllVerified ? 'text-red-700' : 'text-[#14432f]'}`}>
                    {!isAllVerified ? 'rule' : 'fact_check'}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Mandatory Protocol Intake Checklist
                  </h3>
                </div>
                {!isAllVerified ? (
                  <p className="text-[11px] text-red-700 mt-0.5">
                    Select which form(s) need correction below and enter specific deficiency instructions.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    All mandatory forms verified. Click &quot;Flag Deficient&quot; on any form to request PI revision.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isAllVerified ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectAllDeficient}
                      className="px-2.5 py-1 rounded-md bg-white hover:bg-red-50 border border-red-200 text-red-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                      title="Flag all forms for correction"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearDeficiencies}
                      className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
                      title="Clear all deficiencies and mark verified"
                    >
                      Mark All OK
                    </button>
                  </>
                ) : (
                  <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    All {totalCount} Forms Verified
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {documents.map((doc) => {
                const isDeficient = doc.status === 'Deficient';

                if (isDeficient) {
                  return (
                    <div
                      key={doc.id}
                      className="bg-[#fff8f8] rounded-xl border-2 border-red-300 p-4 sm:p-5 shadow-2xs space-y-3.5 transition-all ring-1 ring-red-200/50"
                    >
                      {/* Card Top Row */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleDocStatus(doc)}
                            title="Click to mark as Verified / Remove deficiency"
                            className="w-9 h-9 rounded-lg bg-red-100 hover:bg-emerald-100 text-red-700 hover:text-[#14432f] flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              error
                            </span>
                          </button>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                                {doc.title}
                              </h4>
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                Correction Requested
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              {doc.fileName ? `${doc.fileName} (${doc.size || 'Attached'})` : doc.meta}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              visibility
                            </span>
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleDocStatus(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              check
                            </span>
                            <span>Mark Verified</span>
                          </button>
                        </div>
                      </div>

                      {/* Deficiency Instructions and Reason Presets for this Specific Form */}
                      <div className="bg-white rounded-lg border border-red-200 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-red-950 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[15px] text-red-700">edit_note</span>
                            <span>Correction instructions for this form:</span>
                          </span>
                          <span className="text-[10px] text-slate-400">Dispatched to researcher</span>
                        </div>

                        <textarea
                          rows={2}
                          value={docDeficiencyIssues[doc.id] !== undefined ? docDeficiencyIssues[doc.id] : (doc.issueText || '')}
                          onChange={(e) => handleSetDocIssue(doc.id, e.target.value)}
                          placeholder="Specify what is missing, incomplete, or requires re-upload on this form..."
                          className="w-full p-2.5 bg-[#fdfbfb] border border-red-200 rounded-md text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-red-500 leading-relaxed"
                        />

                        {/* Quick Presets for this form */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Quick reason presets:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {DEFICIENCY_REASON_PRESETS.map((preset, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => handleApplyPresetToDoc(doc.id, preset)}
                                className="text-[10px] px-2 py-1 rounded bg-[#f8fafc] hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-800 transition-colors cursor-pointer"
                              >
                                + {preset.length > 35 ? preset.slice(0, 35) + '...' : preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleDocStatus(doc)}
                        title="Click to flag this form as Deficient / Needs Correction"
                        className="w-9 h-9 rounded-lg bg-[#eef7f2] hover:bg-red-50 text-[#14432f] hover:text-red-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          check_circle
                        </span>
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {doc.title}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#d1fae5] text-[#065f46]">
                            Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {doc.fileName ? `${doc.fileName} (${doc.size || 'Attached'})` : doc.meta}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#eef1f8] hover:bg-[#e2e7f3] text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          visibility
                        </span>
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleDocStatus(doc)}
                        title="Flag this form as requiring correction"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-700 hover:text-red-800 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px] text-red-600">
                          flag
                        </span>
                        <span>Flag Deficient</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Secretariat Determination Card (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Secretariat Determination
              </h3>
              <span className="px-2 py-0.5 rounded bg-[#eef1f8] text-slate-600 font-mono text-[10px] font-bold">
                SOP Track
              </span>
            </div>

            {/* Radio Options */}
            <div className="space-y-3">
              {/* Option 1: Pass Intake */}
              <div
                onClick={() => handleSelectDetermination('pass')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isAllVerified
                    ? 'bg-[#effdf5] border-emerald-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="mt-0.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isAllVerified
                        ? 'border-[#14432f] bg-[#14432f]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isAllVerified && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    )}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-xs font-bold ${
                      isAllVerified ? 'text-[#065f46]' : 'text-slate-800'
                    }`}
                  >
                    Pass Intake &amp; Continue to Review Coordination
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    All administrative requirements verified; proceed to panel and reviewer coordination.
                  </p>
                </div>
              </div>

              {/* Option 2: Return to Researcher for Correction */}
              <div
                onClick={() => handleSelectDetermination('return')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  !isAllVerified
                    ? 'bg-[#fff8f8] border-red-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="mt-0.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      !isAllVerified
                        ? 'border-red-700 bg-red-700'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {!isAllVerified && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    )}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-xs font-bold ${
                      !isAllVerified ? 'text-red-800' : 'text-slate-800'
                    }`}
                  >
                    Return to Researcher for Correction
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Deficiencies require PI resubmission before routing
                  </p>
                </div>
              </div>
            </div>

            {/* Deficiency Summary Status when Return is selected */}
            {!isAllVerified && (
              <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 text-xs text-red-950 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-red-900">
                    <span className="material-symbols-outlined text-[16px] text-red-700">checklist</span>
                    <span>Deficient Forms Selected:</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-red-800 border border-red-200 font-mono">
                    {deficientCount} of {totalCount} Forms
                  </span>
                </div>
                <p className="text-[11px] text-red-700/90 leading-snug">
                  Specify or edit instructions for each flagged form directly on the Mandatory Intake Checklist on the left.
                </p>
              </div>
            )}

            {/* Remarks Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-800">
                  {isAllVerified
                    ? 'Intake & Verification Remarks'
                    : 'Notice / Deficit Remarks'}
                </span>
                <span className="text-slate-400">
                  {isAllVerified
                    ? 'Recorded for review record'
                    : 'Dispatched to Principal Investigator'}
                </span>
              </div>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full p-3 bg-[#f4f6fb] border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed focus:outline-none focus:bg-white focus:border-[#14432f]"
              />
              <p className="text-[11px] text-slate-500 leading-snug">
                Direct notification will be dispatched via registered MMSU institutional email.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {isAllVerified ? (
                <button
                  type="button"
                  onClick={() => setShowRouteModal(true)}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    check_circle
                  </span>
                  <span>Pass Intake &amp; Continue to Review Coordination</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmNoticeModal(true)}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Send Notice to Researcher</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveProgress}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Save Checking Progress</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.SECRETARIAT.APPLICATIONS_MANAGEMENT)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel / Return to Applications
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Send Deficiency Notice? */}
      {showConfirmNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#fee2e2] text-[#991b1b] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    mark_email_unread
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Send Deficiency Notice?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Notice confirmation &amp; researcher alert
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmNoticeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-4 leading-relaxed">
              The researcher will be notified that a correction is required before review coordination can proceed.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-[#f4f6fb] border border-slate-200/70 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Protocol ID</span>
                <span className="font-mono font-bold text-slate-900">
                  {activeProtocolId}
                </span>
              </div>
              <div className="pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 block mb-1.5 font-semibold">
                  Deficient Forms to Re-upload ({documents.filter((d) => d.status === 'Deficient').length}):
                </span>
                {documents.filter((d) => d.status === 'Deficient').length === 0 ? (
                  <p className="text-red-600 font-semibold text-xs py-1">
                    No form selected. Please select at least one form requiring correction.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {documents.filter((d) => d.status === 'Deficient').map((d) => (
                      <div key={d.id} className="p-2 rounded-lg bg-white border border-red-200 text-xs">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-red-600">error</span>
                          <span>{d.title}</span>
                        </div>
                        <p className="text-[11px] text-red-700 mt-1 pl-5 leading-snug">
                          {d.issueText || 'Correction or re-upload required.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-4 pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Notification Channel</span>
                <span className="font-semibold text-[#14432f] text-right">
                  Registered MMSU Institutional Email (Automated)
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmNoticeModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendDeficiencyNotice}
                disabled={documents.filter((d) => d.status === 'Deficient').length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
                <span>Send Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Deficiency Notice Sent Successfully */}
      {showSuccessNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#d1fae5] text-[#065f46] flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[26px]">
                  check_circle
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Deficiency Notice Sent Successfully
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                The researcher has been notified of the required correction.
              </p>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-[#f4f6fb] border border-slate-200/70 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Protocol ID:</span>
                <span className="font-mono font-bold text-slate-900">
                  {activeProtocolId}
                </span>
              </div>
              <div className="pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 block mb-1.5 font-semibold">
                  Forms Flagged for Researcher Resubmission ({documents.filter((d) => d.status === 'Deficient').length}):
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {documents.filter((d) => d.status === 'Deficient').map((d) => (
                    <div key={d.id} className="p-2 rounded-lg bg-white border border-red-200 text-xs">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-red-600">error</span>
                        <span>{d.title}</span>
                      </div>
                      <p className="text-[11px] text-red-700 mt-1 pl-5 leading-snug">
                        {d.issueText || 'Correction required.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500">Notification:</span>
                <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                  <span className="material-symbols-outlined text-[14px] text-[#14432f]">
                    mail
                  </span>
                  Sent to registered MMSU institutional email
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessNoticeModal(false)}
              className="mt-5 w-full py-2.5 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Route Application to Review Coordination? */}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#d1fae5] text-[#065f46] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">alt_route</span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Route Application to Review Coordination?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confirm routing to assign reviewers and set review timelines.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRouteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-4 leading-relaxed">
              This application has completed intake verification and is ready for review panel and reviewer coordination.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-[#f4f6fb] border border-slate-200/70 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Protocol ID</span>
                <span className="font-mono font-bold text-slate-900">
                  {activeProtocolId}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Research Title</span>
                <span className="font-bold text-slate-900 leading-snug block">
                  {activeTitle}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Principal Investigator</span>
                <span className="font-medium text-slate-900">{activePi}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Current Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#d1fae5] text-[#065f46]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#065f46]"></span>
                  Passed Intake
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowRouteModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePassIntakeAndRoute}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
                <span>Route Application</span>
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
