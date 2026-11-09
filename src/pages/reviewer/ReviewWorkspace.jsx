import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReviewerLayout from '../../layouts/ReviewerLayout';
import { ROUTES } from '../../constants/routes';
import { reviewsApi } from '../../services/api';
import DocumentViewer from '../../components/reviewer/DocumentViewer';
import SubmitReviewModal from '../../components/reviewer/SubmitReviewModal';
import SuccessReviewModal from '../../components/reviewer/SuccessReviewModal';

export default function ReviewWorkspace() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const protocolId = searchParams.get('id') || '';

  const [protocols, setProtocols] = useState([]);
  const [currentProtocol, setCurrentProtocol] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active document selection in left pane
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [docPage, setDocPage] = useState(1);

  // Evaluation Form State
  const [findings, setFindings] = useState([]);
  const [inputPage, setInputPage] = useState('');
  const [inputSection, setInputSection] = useState('');
  const [inputFinding, setInputFinding] = useState('');
  const [editingFindingId, setEditingFindingId] = useState(null);

  const [overallComments, setOverallComments] = useState('');
  const [justification, setJustification] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');

  // Submission Modals & Status
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [autoSaveState, setAutoSaveState] = useState('saved'); // 'saved' | 'saving'

  // Load assigned protocols from backend API
  useEffect(() => {
    let isMounted = true;
    async function loadAssigned() {
      try {
        setIsLoading(true);
        const res = await reviewsApi.getAssigned();
        if (!isMounted) return;
        if (res && res.success) {
          const list = res.assigned || res.protocols || [];
          setProtocols(Array.isArray(list) ? list : []);
          const p =
            (protocolId &&
              list.find(
                (item) =>
                  item.protocolCode?.toLowerCase() === protocolId.toLowerCase() ||
                  String(item.id) === protocolId
              )) ||
            list[0] ||
            null;
          setCurrentProtocol(p);
          if (p) {
            setFindings(p.findings || p.evaluation?.findings || []);
            setOverallComments(p.overallComments || p.evaluation?.overallComments || '');
            setJustification(p.justification || p.evaluation?.justification || '');
            setRecommendedAction(p.recommendedAction || p.evaluation?.recommendedAction || '');
          }
        }
      } catch (err) {
        console.error('Failed to load review workspace protocol:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadAssigned();
    return () => {
      isMounted = false;
    };
  }, [protocolId]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Auto-persist draft helper via API
  const triggerAutoSave = async (updatedFields = {}) => {
    if (!currentProtocol || Boolean(currentProtocol.isSubmitted)) return;
    setAutoSaveState('saving');
    try {
      const nextFindings = updatedFields.findings ?? findings;
      const nextComments = updatedFields.overallComments ?? overallComments;
      const nextJustification = updatedFields.justification ?? justification;
      const nextAction = updatedFields.recommendedAction ?? recommendedAction;
      await reviewsApi.saveDraft({
        protocolId: currentProtocol.id || currentProtocol.protocolId,
        findings: nextFindings,
        overallComments: nextComments,
        justification: nextJustification,
        recommendedAction: nextAction,
      });
      setAutoSaveState('saved');
    } catch (err) {
      console.warn('Auto-save error:', err);
      setAutoSaveState('saved');
    }
  };

  // Add or Update Finding
  const handleSaveFinding = (e) => {
    e.preventDefault();
    if (!inputFinding.trim() || !inputSection.trim()) return;

    let updatedFindings;
    if (editingFindingId) {
      updatedFindings = findings.map((f) =>
        f.id === editingFindingId
          ? {
              ...f,
              page: parseInt(inputPage, 10) || 1,
              section: inputSection,
              content: inputFinding,
            }
          : f
      );
      setFindings(updatedFindings);
      setEditingFindingId(null);
      showToast('Finding updated');
    } else {
      const newFinding = {
        id: `f-${Date.now()}`,
        page: parseInt(inputPage, 10) || 1,
        section: inputSection,
        sectionCode: inputSection.split('—')[0].trim(),
        content: inputFinding,
        dateAdded: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }),
      };
      updatedFindings = [...findings, newFinding];
      setFindings(updatedFindings);
      showToast('Finding added');
    }

    triggerAutoSave({ findings: updatedFindings });
    setInputFinding('');
  };

  const handleEditFinding = (finding) => {
    setInputPage(String(finding.page));
    setInputSection(finding.section);
    setInputFinding(finding.content);
    setEditingFindingId(finding.id);
    setDocPage(finding.page);
  };

  const handleDeleteFinding = (id) => {
    const updatedFindings = findings.filter((f) => f.id !== id);
    setFindings(updatedFindings);
    if (editingFindingId === id) {
      setEditingFindingId(null);
      setInputFinding('');
    }
    showToast('Finding removed');
    triggerAutoSave({ findings: updatedFindings });
  };

  // Manual Save Draft
  const handleSaveDraft = () => {
    triggerAutoSave();
    showToast('Draft assessment saved');
  };

  // Submit Review Flow via API
  const handleConfirmSubmit = async () => {
    if (!currentProtocol) return;
    if (!recommendedAction) {
      alert('Please select a recommended ethical action before submitting.');
      return;
    }
    try {
      await reviewsApi.submit({
        protocolId: currentProtocol.id || currentProtocol.protocolId,
        findings,
        overallComments,
        justification,
        recommendedAction,
      });
      setCurrentProtocol((prev) => ({ ...prev, isSubmitted: true }));
      setShowSubmitModal(false);
      setShowSuccessModal(true);
      showToast('Review evaluation submitted and synced with Secretariat');
      window.dispatchEvent(new Event('urerb_reviewer_sync'));
      window.dispatchEvent(new Event('urerb_secretariat_queue_sync'));
    } catch (err) {
      alert(err.message || 'Failed to submit review.');
    }
  };

  const isLocked = Boolean(currentProtocol?.isSubmitted);
  const activeDoc = currentProtocol?.documents?.[activeDocIndex] || currentProtocol?.documents?.[0];

  if (!currentProtocol) {
    return (
      <ReviewerLayout assignedCount={0}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Review Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Evaluate assigned protocol documents, record findings, and submit your ethics disposition.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/90 p-12 text-center shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">rate_review</span>
            </div>
            <h2 className="text-base font-bold text-slate-900">
              No protocol selected for review
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are currently no protocols assigned to your evaluation queue. Once the URERB Secretariat assigns a protocol, you can open it here.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate(ROUTES.REVIEWER.ASSIGNED_APPLICATIONS)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Go to Assigned Applications</span>
              </button>
            </div>
          </div>
        </div>
      </ReviewerLayout>
    );
  }

  return (
    <ReviewerLayout assignedCount={protocols.filter((p) => !p.isSubmitted).length}>
      <div className="space-y-6">
        {/* Toast notification */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">
              check_circle
            </span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Protocol Header Bar with Protocol Quick-Switcher */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-4xl">
              {/* Badges & Protocol Switcher */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Protocol Quick-Switcher Dropdown */}
                <div className="relative">
                  <select
                    value={currentProtocol?.protocolCode}
                    onChange={(e) => navigate(`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${e.target.value}`)}
                    className="appearance-none font-mono text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 pl-2.5 pr-7 py-1 rounded border border-slate-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1e513b]"
                    title="Switch assigned protocol"
                  >
                    {protocols.map((p) => (
                      <option key={p.protocolCode} value={p.protocolCode}>
                        {p.protocolCode} ({p.isSubmitted ? 'Submitted' : p.status})
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 text-[15px] pointer-events-none">
                    unfold_more
                  </span>
                </div>

                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {currentProtocol?.track}
                </span>

                {isLocked ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    Review Submitted
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {currentProtocol?.status || 'Draft Saved'}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug tracking-tight">
                {currentProtocol?.title}
              </h1>

              {/* Subtitle / Metadata */}
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span className="font-medium text-slate-700">
                  {currentProtocol?.pi}
                </span>
                <span className="text-slate-300">•</span>
                <span>Submitted: {currentProtocol?.submittedDate || '—'}</span>
                <span className="text-slate-300">•</span>
                <span>{currentProtocol?.panel || 'Panel Review'}</span>
              </div>
            </div>

            {/* Right Side: Due Date Banner */}
            <div className="text-left lg:text-right shrink-0 bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                REVIEW DUE DATE
              </span>
              <div className="flex items-center lg:justify-end gap-1.5 text-base sm:text-lg font-bold text-rose-600 leading-tight">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>{currentProtocol?.dueFullDate || currentProtocol?.dueDate || '—'}</span>
              </div>
              <div className="text-xs font-medium text-rose-600/90 mt-0.5">
                ({currentProtocol?.daysRemaining ?? 0} days remaining)
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (col-span-7): Submitted Documents & Document Viewer */}
          <div className="lg:col-span-7 space-y-4">
            {/* Submitted Documents Selector List */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1e513b] text-[20px]">
                  folder_open
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Submitted Documents
                </h3>
              </div>

              {/* Stacked Vertical Document Cards matching Screenshot 1 */}
              <div className="space-y-2">
                {currentProtocol?.documents?.map((doc, idx) => {
                  const isSelected = idx === activeDocIndex;
                  return (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? 'border-[#1e513b] bg-[#eef9f3] shadow-xs'
                          : 'border-slate-200/90 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`material-symbols-outlined text-[20px] shrink-0 ${
                            isSelected ? 'text-[#1e513b]' : 'text-slate-400'
                          }`}
                        >
                          description
                        </span>
                        <div className="min-w-0">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-[#1e513b]' : 'text-slate-800'
                            }`}
                          >
                            {doc.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {doc.subtext || `${doc.type} • ${doc.size}`}
                          </p>
                        </div>
                      </div>

                      {/* Right View Button */}
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDocIndex(idx);
                            setDocPage(1);
                          }}
                          className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md shadow-2xs transition-colors shrink-0 cursor-pointer"
                        >
                          View
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Document Viewer Pane */}
            <DocumentViewer
              protocol={currentProtocol}
              activeDoc={activeDoc}
              currentPage={docPage}
              totalPages={3}
              onPageChange={setDocPage}
              isLocked={isLocked}
            />
          </div>

          {/* Right Column (col-span-5): Reviewer Evaluation Form & Findings */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#1e513b]">
                      rate_review
                    </span>
                    <h2 className="text-base font-bold text-slate-900">
                      Reviewer Evaluation
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isLocked
                      ? 'Evaluation finalized and submitted to URERB Secretariat.'
                      : 'Record your findings and ethics disposition for this protocol.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isLocked && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {autoSaveState === 'saving' ? 'Saving...' : '✓ Auto-saved'}
                    </span>
                  )}
                  {isLocked && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      Locked
                    </span>
                  )}
                </div>
              </div>

              {/* Add / Edit Finding Form */}
              {!isLocked ? (
                <form onSubmit={handleSaveFinding} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Location in Document *
                    </span>
                    {editingFindingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFindingId(null);
                          setInputFinding('');
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  {/* Location Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 block mb-1">
                        Page
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={inputPage}
                        onChange={(e) => setInputPage(e.target.value)}
                        className="w-full px-3 py-2 bg-[#f0f4fd]/50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#1e513b]"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-medium text-slate-400 block mb-1">
                        Section / Item
                      </label>
                      <input
                        type="text"
                        value={inputSection}
                        onChange={(e) => setInputSection(e.target.value)}
                        placeholder="e.g. B.12 — Confidentiality"
                        className="w-full px-3 py-2 bg-[#f0f4fd]/50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#1e513b]"
                        required
                      />
                    </div>
                  </div>

                  {/* Finding Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Review Finding *
                    </label>
                    <textarea
                      rows={3}
                      value={inputFinding}
                      onChange={(e) => setInputFinding(e.target.value)}
                      placeholder="Enter the issue, observation, or clarification needed for this page, section, or item..."
                      className="w-full p-3 bg-[#f0f4fd]/40 border border-slate-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#1e513b]"
                      required
                    ></textarea>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      {editingFindingId && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                      <span>{editingFindingId ? 'Update Finding' : 'Add Finding'}</span>
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Recorded Findings List */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800">
                    Review Findings ({findings.length})
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {findings.length} {isLocked ? 'finalized items' : 'saved items'}
                  </span>
                </div>

                {findings.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
                    No findings recorded yet. Use the form above to add an observation.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {findings.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-white border border-slate-200/90 rounded-xl hover:border-slate-300 transition-all text-xs space-y-1.5 group shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setDocPage(item.page)}
                            className="text-left font-bold text-[#1e513b] hover:underline flex items-center gap-1 cursor-pointer"
                            title="Click to view this page in document"
                          >
                            <span>• Page {item.page} · {item.section}</span>
                          </button>

                          {!isLocked && (
                            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleEditFinding(item)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                                title="Edit finding"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  edit
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFinding(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
                                title="Delete finding"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="text-slate-600 leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Overall Review Comments */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Overall Review Comments
                </label>
                <textarea
                  rows={3}
                  value={overallComments}
                  disabled={isLocked}
                  onChange={(e) => {
                    setOverallComments(e.target.value);
                    triggerAutoSave({ overallComments: e.target.value });
                  }}
                  placeholder="Summarize ethical considerations, scientific methodology remarks, and required safeguards..."
                  className={`w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed ${
                    isLocked ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : 'focus:ring-1 focus:ring-[#1e513b]'
                  }`}
                ></textarea>
              </div>

              {/* Recommended Action Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Recommended Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Approved', desc: 'No modifications required' },
                    { label: 'Minor Revisions', desc: 'Clarifications & minor text amendments' },
                    { label: 'Major Revisions', desc: 'Significant protocol or risk rework' },
                    { label: 'Disapproved', desc: 'Fails PHREB ethical criteria' },
                  ].map((action) => {
                    const isSelected = recommendedAction === action.label;
                    return (
                      <button
                        key={action.label}
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          setRecommendedAction(action.label);
                          triggerAutoSave({ recommendedAction: action.label });
                        }}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1e513b] text-white border-[#1e513b] shadow-xs'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        } ${isLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{action.label}</span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-[16px]">
                              check_circle
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 line-clamp-1 ${
                            isSelected ? 'text-emerald-100' : 'text-slate-500'
                          }`}
                        >
                          {action.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Justification for the Recommendation (Matches Screenshot 2) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Justification for the Recommendation *
                  </label>
                  {recommendedAction !== 'Approved' && (
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Required for {recommendedAction}
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={justification}
                  disabled={isLocked}
                  onChange={(e) => {
                    setJustification(e.target.value);
                    triggerAutoSave({ justification: e.target.value });
                  }}
                  placeholder="Provide the formal regulatory rationale or compliance directives required before approval..."
                  className={`w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs leading-relaxed ${
                    isLocked ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : 'focus:ring-1 focus:ring-[#1e513b]'
                  }`}
                  required={recommendedAction !== 'Approved'}
                ></textarea>
              </div>

              {/* Bottom Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                {!isLocked ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSubmitModal(true)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#1e513b] hover:bg-[#163f2e] rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        send
                      </span>
                      <span>Submit Review</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-emerald-600">
                        verified
                      </span>
                      Review finalized{currentProtocol?.submittedTimestamp ? ` on ${currentProtocol.submittedTimestamp}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.REVIEWER.DASHBOARD)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <SubmitReviewModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleConfirmSubmit}
        protocol={currentProtocol}
        findingsCount={findings.length}
        recommendedAction={recommendedAction}
        justification={justification}
        panel={currentProtocol?.panel || 'Panel Review'}
      />

      {/* Success Modal */}
      <SuccessReviewModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate(ROUTES.REVIEWER.ASSIGNED_APPLICATIONS);
        }}
        protocol={currentProtocol}
        recommendedAction={recommendedAction}
        submittedDate={new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}
      />
    </ReviewerLayout>
  );
}
