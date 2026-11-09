import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReviewerLayout from '../../layouts/ReviewerLayout';
import { ROUTES } from '../../constants/routes';
import { reviewsApi } from '../../services/api';
import { getCurrentUser } from '../../utils/auth';
import DocumentsModal from '../../components/reviewer/DocumentsModal';
import COIDeclarationModal from '../../components/reviewer/COIDeclarationModal';

export default function AssignedApplications() {
  const navigate = useNavigate();
  const [protocols, setProtocols] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackFilter, setTrackFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedProtocolForDocs, setSelectedProtocolForDocs] = useState(null);
  const [protocolForCOI, setProtocolForCOI] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProtocols = async () => {
    try {
      setIsLoading(true);
      const res = await reviewsApi.getAssigned();
      if (res && res.success) {
        const list = res.assigned || res.protocols || [];
        setProtocols(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Failed to load assigned protocols:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocols();
    const handleSync = () => fetchProtocols();
    window.addEventListener('urerb_reviewer_sync', handleSync);
    return () => window.removeEventListener('urerb_reviewer_sync', handleSync);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  const handleStartReview = (protocol) => {
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
      alert(err.message || 'Failed to certify COI.');
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
      fetchProtocols();
    } catch (err) {
      alert(err.message || 'Failed to recuse protocol.');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setTrackFilter('All');
    setStatusFilter('All');
  };

  // Filter logic
  const filteredProtocols = protocols.filter((p) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = (p.protocolCode || p.protocolId || '').toLowerCase().includes(q);
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchPi = (p.pi || '').toLowerCase().includes(q);
      if (!matchCode && !matchTitle && !matchPi) return false;
    }

    // Track
    if (trackFilter !== 'All') {
      const pTrack = (p.track || p.reviewTrack || '').toLowerCase();
      const fTrack = trackFilter.toLowerCase();
      if (!pTrack.includes(fTrack.replace(' review', '').trim())) {
        return false;
      }
    }

    // Status
    if (statusFilter !== 'All') {
      if (statusFilter === 'Review Submitted' && !p.isSubmitted) return false;
      if (statusFilter === 'Draft Saved' && (p.status !== 'Draft Saved' || p.isSubmitted)) return false;
      if (statusFilter === 'Pending' && (p.status !== 'Pending' || p.isSubmitted)) return false;
    }

    return true;
  });

  const currentUser = getCurrentUser();

  return (
    <ReviewerLayout assignedCount={protocols.length}>
      <div className="space-y-6">
        {/* Top Breadcrumb & Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
              <span>REVIEWER WORKSPACE</span>
              <span>/</span>
              <span className="text-[#1e513b] font-bold">ASSIGNED PROTOCOLS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Assigned Applications
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review research protocols assigned to you by the URERB Secretariat and Panel Chair.
            </p>
          </div>

          {/* Panel Cycle Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-lg text-slate-700 text-xs font-mono shrink-0 self-start sm:self-center shadow-2xs">
            <span className="material-symbols-outlined text-[16px] text-slate-500">
              calendar_month
            </span>
            <span>Panel Cycle: {currentUser?.cycle || 'AY 2026-2027'}</span>
          </div>
        </div>

        {/* Search & Filter Bar matching Screenshot 3 */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by protocol code, title, or investigator..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1e513b] focus:border-[#1e513b] transition-all"
              />
            </div>

            {/* Filter Dropdowns & Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Track filter */}
              <div className="relative">
                <select
                  value={trackFilter}
                  onChange={(e) => setTrackFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e513b] cursor-pointer"
                >
                  <option value="All">Track: All</option>
                  <option value="Expedited Review">Expedited Review</option>
                  <option value="Full Board Review">Full Board Review</option>
                  <option value="Exempted Review">Exempted Review</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e513b] cursor-pointer"
                >
                  <option value="All">Status: All</option>
                  <option value="Draft Saved">Draft Saved</option>
                  <option value="Pending">Pending</option>
                  <option value="Review Submitted">Review Submitted</option>
                </select>
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Reset button */}
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                title="Reset filters"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Reset</span>
              </button>

              {/* Assigned Count Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold">
                <span className="material-symbols-outlined text-[16px] text-slate-500">
                  article
                </span>
                <span>{filteredProtocols.length} assigned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Applications List */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs space-y-3">
            <div className="w-8 h-8 border-2 border-[#1e513b] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Loading assigned review protocols...</p>
          </div>
        ) : filteredProtocols.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
            <span className="material-symbols-outlined text-[48px] text-slate-300 mx-auto">
              search_off
            </span>
            <h3 className="text-sm font-bold text-slate-800 mt-2">
              No assigned protocols found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No applications match your search query or filter selection.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-[#1e513b] text-white text-xs font-semibold rounded-lg hover:bg-[#163f2e] transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProtocols.map((protocol) => {
              const isDraft = protocol.status === 'Draft Saved';
              const isSubmitted = protocol.isSubmitted;

              return (
                <div
                  key={protocol.protocolCode}
                  className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left: Metadata & Information */}
                    <div className="space-y-2.5 max-w-3xl">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {protocol.protocolCode}
                        </span>
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {protocol.track}
                        </span>

                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Review Submitted
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold ${
                              protocol.urgent ? 'text-rose-600' : 'text-slate-600'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              schedule
                            </span>
                            Due {protocol.dueFullDate || protocol.dueDate} ({protocol.daysRemaining} days left)
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {protocol.title}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-slate-400">
                            person
                          </span>
                          <span>
                            PI: <strong className="text-slate-700">{protocol.pi}</strong>
                          </span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-slate-400">
                            corporate_fare
                          </span>
                          <span>{protocol.college} Faculty</span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-slate-400">
                            attach_file
                          </span>
                          <span>{protocol.documents?.length || 0} Submitted Documents</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
                      <button
                        type="button"
                        onClick={() => setSelectedProtocolForDocs(protocol)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px] text-slate-500">
                          folder_open
                        </span>
                        <span>Documents</span>
                      </button>

                      {isSubmitted ? (
                        <Link
                          to={`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${protocol.protocolCode}`}
                          className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            visibility
                          </span>
                          <span>View Review</span>
                        </Link>
                      ) : isDraft ? (
                        <Link
                          to={`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${protocol.protocolCode}`}
                          className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            rate_review
                          </span>
                          <span>Continue Review</span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartReview(protocol)}
                          className="inline-flex items-center gap-1.5 px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            play_arrow
                          </span>
                          <span>Start Review</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
