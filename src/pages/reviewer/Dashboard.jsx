import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReviewerLayout from '../../layouts/ReviewerLayout';
import { ROUTES } from '../../constants/routes';
import { REVIEW_GUIDELINES } from '../../data/reviewerData';
import { reviewsApi } from '../../services/api';
import DocumentsModal from '../../components/reviewer/DocumentsModal';
import COIDeclarationModal from '../../components/reviewer/COIDeclarationModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [protocols, setProtocols] = useState([]);
  const [archivedReviews, setArchivedReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'urgent' | 'drafts'
  const [selectedProtocolForDocs, setSelectedProtocolForDocs] = useState(null);
  const [protocolForCOI, setProtocolForCOI] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const [assignedRes, historyRes] = await Promise.all([
        reviewsApi.getAssigned().catch(() => ({ assigned: [] })),
        reviewsApi.getHistory().catch(() => ({ history: [] })),
      ]);

      if (assignedRes && assignedRes.success) {
        const list = assignedRes.assigned || assignedRes.protocols || [];
        setProtocols(Array.isArray(list) ? list : []);
      }
      if (historyRes && historyRes.success) {
        const list = historyRes.history || historyRes.reviews || [];
        setArchivedReviews(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Failed to load reviewer dashboard protocols:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    const handleSync = () => fetchReviews();
    window.addEventListener('urerb_reviewer_sync', handleSync);
    window.addEventListener('urerb_reviewer_history_sync', handleSync);
    return () => {
      window.removeEventListener('urerb_reviewer_sync', handleSync);
      window.removeEventListener('urerb_reviewer_history_sync', handleSync);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Primary active featured protocol: pick urgent non-submitted, or first non-submitted, or first protocol
  const featuredProtocol =
    protocols.find((p) => !p.isSubmitted && p.urgent) ||
    protocols.find((p) => !p.isSubmitted) ||
    protocols[0];

  // Dynamic counts
  const pendingCount = protocols.filter((p) => !p.isSubmitted && (p.status === 'Pending' || p.status === 'Pending Review')).length;
  const draftCount = protocols.filter((p) => !p.isSubmitted && p.status === 'Draft Saved').length;
  const urgentCount = protocols.filter((p) => !p.isSubmitted && p.urgent).length;
  const completedCount = archivedReviews.length;

  // Average turnaround (days) computed from archived reviews that carry a turnaroundDays value
  const turnaroundValues = archivedReviews
    .map((r) => Number(r.turnaroundDays))
    .filter((n) => Number.isFinite(n) && n > 0);
  const avgTurnaroundDays =
    turnaroundValues.length > 0
      ? (turnaroundValues.reduce((sum, n) => sum + n, 0) / turnaroundValues.length).toFixed(1)
      : 0;

  // Filtering
  const filteredProtocols = protocols.filter((p) => {
    if (activeTab === 'urgent') return p.urgent && !p.isSubmitted;
    if (activeTab === 'drafts') return p.status === 'Draft Saved';
    return true;
  });

  const handleDownloadGuideline = (guideline) => {
    const blob = new Blob([`URERB Guidelines: ${guideline.title}\n\n${guideline.description}`], {
      type: 'application/pdf',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = guideline.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartReviewClick = (protocol) => {
    // If pending, prompt COI declaration first
    if ((protocol.status === 'Pending' || protocol.status === 'Pending Review') && !protocol.coiCertified) {
      setProtocolForCOI(protocol);
    } else {
      navigate(`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${protocol.protocolCode || protocol.id}`);
    }
  };

  const handleCertifyCOI = async (protocol) => {
    try {
      await reviewsApi.coiCertify({ protocolId: protocol.id || protocol.protocolId });
      setProtocolForCOI(null);
      showToast(`COI certified for ${protocol.protocolCode}`);
      navigate(`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${protocol.protocolCode || protocol.id}`);
    } catch (err) {
      alert(err.message || 'Failed to submit COI certification.');
    }
  };

  const handleRecuseCOI = async (protocol) => {
    try {
      await reviewsApi.coiRecuse({
        protocolId: protocol.id || protocol.protocolId,
        reason: 'Conflict of interest declared by reviewer',
      });
      setProtocolForCOI(null);
      showToast(`Conflict of interest flagged for ${protocol.protocolCode}. Protocol recused.`);
      fetchReviews();
    } catch (err) {
      alert(err.message || 'Failed to recuse protocol.');
    }
  };

  return (
    <ReviewerLayout assignedCount={protocols.filter((p) => !p.isSubmitted).length}>
      <div className="space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px] text-emerald-400">
              check_circle
            </span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Reviewer Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor assigned protocol reviews and pending evaluation deadlines
          </p>
        </div>

        {/* 4 Stat Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pending Reviews */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                PENDING REVIEWS
              </span>
              <span className="material-symbols-outlined text-[20px] text-slate-400">
                assignment
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {String(pendingCount).padStart(2, '0')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Awaiting initial scoring
            </p>
          </div>

          {/* Card 2: In Progress */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                IN PROGRESS
              </span>
              <span className="material-symbols-outlined text-[20px] text-slate-400">
                edit_note
              </span>
            </div>
            <div className="text-3xl font-extrabold text-emerald-800 tracking-tight">
              {String(draftCount).padStart(2, '0')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Draft assessment saved
            </p>
          </div>

          {/* Card 3: Avg Turnaround */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                AVG TURNAROUND
              </span>
              <span className="material-symbols-outlined text-[20px] text-slate-400">
                schedule
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {avgTurnaroundDays} <span className="text-lg font-medium text-slate-600">Days</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              URERB target ≤ 14 days
            </p>
          </div>

          {/* Card 4: Completed Reviews */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                COMPLETED REVIEWS
              </span>
              <span className="material-symbols-outlined text-[20px] text-slate-400">
                check_circle
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {completedCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Submitted evaluations
            </p>
          </div>
        </div>

        {/* Featured Review Protocol Banner */}
        {!featuredProtocol && (
          <div className="bg-white rounded-xl border border-slate-200/90 p-8 shadow-2xs text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300">assignment</span>
            <h3 className="text-sm font-bold text-slate-800 mt-2">No protocols assigned yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Protocols assigned to you for review will appear here once the URERB Secretariat assigns them.
            </p>
          </div>
        )}
        {featuredProtocol && (
          <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                {/* Badges row */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {featuredProtocol.protocolCode}
                  </span>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {featuredProtocol.track}
                  </span>

                  {featuredProtocol.isSubmitted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      Review Submitted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      Due {featuredProtocol.dueFullDate || featuredProtocol.dueDate || '—'} ({featuredProtocol.daysRemaining ?? 0} days remaining)
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {featuredProtocol.title}
                </h2>

                {/* PI info & submission */}
                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                  <span>
                    Principal Investigator: <strong className="text-slate-700">{featuredProtocol.pi}</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>Submitted: {featuredProtocol.submittedDate || '—'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedProtocolForDocs(featuredProtocol)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-500">
                    folder_open
                  </span>
                  <span>Documents</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate(`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${featuredProtocol.protocolCode}`)
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {featuredProtocol.isSubmitted ? 'visibility' : 'rate_review'}
                  </span>
                  <span>{featuredProtocol.isSubmitted ? 'View Review' : 'Open Review'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lower Two-Column Section: Assigned Protocols + Review Guidelines */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Assigned Protocols Table */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Table Header with Filter Tabs */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Assigned Protocols
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Active protocols assigned for your evaluation
                </p>
              </div>

              {/* Tab Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({protocols.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('urgent')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'urgent'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Urgent ({urgentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('drafts')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'drafts'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Drafts ({draftCount})
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4 sm:px-5">PROTOCOL</th>
                    <th className="py-3 px-4">RESEARCH TITLE &amp; INVESTIGATOR</th>
                    <th className="py-3 px-4">DUE DATE</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProtocols.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 px-4 text-center">
                        <span className="material-symbols-outlined text-[40px] text-slate-300">
                          inbox
                        </span>
                        <div className="text-sm font-bold text-slate-800 mt-1">
                          {protocols.length === 0 ? 'No assigned protocols yet' : 'No protocols in this view'}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {protocols.length === 0
                            ? 'Assigned protocols will be listed here.'
                            : 'Try a different filter tab.'}
                        </p>
                      </td>
                    </tr>
                  )}
                  {filteredProtocols.map((protocol) => {
                    const isDraft = protocol.status === 'Draft Saved';
                    const isSubmitted = protocol.isSubmitted;

                    return (
                      <tr
                        key={protocol.protocolCode}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Protocol Code */}
                        <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                          <Link
                            to={`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${protocol.protocolCode}`}
                            className="font-mono font-bold text-[#1e513b] hover:underline"
                          >
                            {protocol.protocolCode}
                          </Link>
                        </td>

                        {/* Title & PI */}
                        <td className="py-3.5 px-4 min-w-[200px] max-w-[280px]">
                          <div className="font-semibold text-slate-800 line-clamp-1">
                            {protocol.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {protocol.piShort}
                          </div>
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div
                            className={`font-semibold ${
                              protocol.urgent && !isSubmitted ? 'text-rose-600' : 'text-slate-700'
                            }`}
                          >
                            {protocol.dueDate}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {isSubmitted ? 'Completed' : `${protocol.daysRemaining} days left`}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isSubmitted ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Review Submitted
                            </span>
                          ) : isDraft ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Draft Saved
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Action Button */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isSubmitted ? (
                            <Link
                              to={`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${protocol.protocolCode}`}
                              className="inline-flex items-center px-3 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            >
                              View
                            </Link>
                          ) : isDraft ? (
                            <Link
                              to={`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${protocol.protocolCode}`}
                              className="inline-flex items-center px-3 py-1 text-xs font-semibold text-white bg-[#1e513b] hover:bg-[#163f2e] rounded-md shadow-2xs transition-colors"
                            >
                              Continue
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartReviewClick(protocol)}
                              className="inline-flex items-center px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md shadow-2xs transition-colors cursor-pointer"
                            >
                              Start
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 sm:px-5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{protocols.length} active protocol reviews assigned</span>
              <Link
                to={ROUTES.REVIEWER.ASSIGNED_APPLICATIONS}
                className="inline-flex items-center gap-1 font-semibold text-[#1e513b] hover:underline"
              >
                <span>View All Assigned</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Review Guidelines Card */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                REVIEW GUIDELINES
              </span>
              <span className="material-symbols-outlined text-slate-400 text-[18px]">
                menu_book
              </span>
            </div>

            <div className="space-y-3">
              {REVIEW_GUIDELINES.map((guideline) => (
                <div
                  key={guideline.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60 transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {guideline.title}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      PDF Document · {guideline.size}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadGuideline(guideline)}
                    className="p-1.5 text-slate-400 group-hover:text-[#1e513b] hover:bg-white rounded-md transition-colors cursor-pointer"
                    title={`Download ${guideline.title}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      download
                    </span>
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 text-[11px] text-emerald-900 leading-snug">
              <span className="font-semibold block mb-0.5">Reviewer Tip:</span>
              Ensure both scientific rigor and informed consent protections adhere to PHREB 2024 standards.
            </div>
          </div>
        </div>
      </div>

      {/* Submitted Protocol Documents Modal */}
      <DocumentsModal
        isOpen={Boolean(selectedProtocolForDocs)}
        onClose={() => setSelectedProtocolForDocs(null)}
        protocol={selectedProtocolForDocs}
        onViewDocument={(doc) => {
          setSelectedProtocolForDocs(null);
          navigate(`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${selectedProtocolForDocs.protocolCode}`);
        }}
      />

      {/* Conflict of Interest (COI) Declaration Modal */}
      <COIDeclarationModal
        isOpen={Boolean(protocolForCOI)}
        onClose={() => setProtocolForCOI(null)}
        protocol={protocolForCOI}
        onCertify={handleCertifyCOI}
        onRecuse={handleRecuseCOI}
      />
    </ReviewerLayout>
  );
}
