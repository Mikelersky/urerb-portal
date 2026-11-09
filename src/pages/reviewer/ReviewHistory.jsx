import React, { useState, useEffect } from 'react';
import ReviewerLayout from '../../layouts/ReviewerLayout';
import { reviewsApi } from '../../services/api';
import ReviewDetailsModal from '../../components/reviewer/ReviewDetailsModal';

export default function ReviewHistory() {
  const now = new Date();
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const currentAcademicYear = `AY ${startYear}-${startYear + 1}`;
  const prevAcademicYear = `AY ${startYear - 1}-${startYear}`;

  const [reviews, setReviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState('All Recommendations');
  const [periodFilter, setPeriodFilter] = useState('All Periods');
  const [selectedReview, setSelectedReview] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 5;

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const res = await reviewsApi.getHistory();
      if (res && res.success) {
        const list = res.history || res.reviews || [];
        setReviews(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Failed to load review history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const handleSync = () => fetchHistory();
    window.addEventListener('urerb_reviewer_history_sync', handleSync);
    return () => window.removeEventListener('urerb_reviewer_history_sync', handleSync);
  }, []);

  const handleResetFilters = () => {
    setSearchQuery('');
    setRecommendationFilter('All Recommendations');
    setPeriodFilter('All Periods');
    setCurrentPage(1);
  };

  const filteredReviews = reviews.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = item.protocolCode.toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchPi = item.pi.toLowerCase().includes(q);
      if (!matchCode && !matchTitle && !matchPi) return false;
    }

    if (recommendationFilter !== 'All Recommendations') {
      const itemRec = (item.recommendation || '').toLowerCase();
      const filterRec = recommendationFilter.toLowerCase();
      if (filterRec === 'approved' && !itemRec.startsWith('approv')) return false;
      if (filterRec === 'minor revisions' && !itemRec.includes('minor')) return false;
      if (filterRec === 'major revisions' && !itemRec.includes('major')) return false;
      if (filterRec === 'disapproved' && !itemRec.startsWith('disapprov')) return false;
    }

    if (periodFilter !== 'All Periods') {
      const normItem = (item.period || '').replace(/–/g, '-');
      const normFilter = periodFilter.replace(/–/g, '-');
      if (normItem !== normFilter) return false;
    }

    return true;
  });

  // Dynamic pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Dynamic stat metrics
  const totalCompleted = reviews.length;
  const approvalsCount = reviews.filter((r) => r.decisionType === 'approved').length;
  const revisionsCount = reviews.filter((r) => r.decisionType === 'revision').length;
  const disapprovalsCount = reviews.filter((r) => r.decisionType === 'disapproved').length;

  const approvalRatio =
    totalCompleted > 0 ? ((approvalsCount / totalCompleted) * 100).toFixed(1) : '0.0';
  const disapprovalRatio =
    totalCompleted > 0 ? ((disapprovalsCount / totalCompleted) * 100).toFixed(1) : '0.0';

  const getProtocolCodeColor = (decisionType) => {
    switch (decisionType) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'revision':
        return 'bg-emerald-50/70 text-emerald-900 border-emerald-200';
      case 'disapproved':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  const getRecommendationBadge = (recommendation) => {
    switch (recommendation) {
      case 'Approval':
      case 'Approved':
        return 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]';
      case 'Minor Revision':
      case 'Minor Revisions':
        return 'bg-[#fef9c3] text-[#854d0e] border border-[#fef08a]';
      case 'Major Revision':
      case 'Major Revisions':
        return 'bg-[#ffedd5] text-[#9a3412] border border-[#fed7aa]';
      case 'Disapproval':
      case 'Disapproved':
        return 'bg-[#ffe4e6] text-[#9f1239] border border-[#fecdd3]';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };


  return (
    <ReviewerLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Review History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Access your previously submitted ethics evaluations, recommendations, and archived review memos.
          </p>
        </div>

        {/* 4 Stat Cards matching Screenshot 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Completed Reviews */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              COMPLETED REVIEWS
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalCompleted}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total evaluated protocols
            </p>
          </div>

          {/* Card 2: Approvals */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              APPROVALS
            </span>
            <div className="text-3xl font-extrabold text-emerald-800 tracking-tight">
              {approvalsCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {approvalRatio}% approval ratio
            </p>
          </div>

          {/* Card 3: Revisions Recommended */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              REVISIONS RECOMMENDED
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {revisionsCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {revisionsCount === 0 ? 'No revisions recorded yet' : `${revisionsCount} revision recommendations`}
            </p>
          </div>

          {/* Card 4: Disapprovals */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              DISAPPROVALS
            </span>
            <div className="text-3xl font-extrabold text-rose-700 tracking-tight">
              {disapprovalsCount}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {disapprovalRatio}% ratio · High-risk gap
            </p>
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by protocol ID, research title, or inv..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1e513b]"
              />
            </div>

            {/* Dropdown Filters & Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Recommendation dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
                  RECOMMENDATION:
                </span>
                <select
                  value={recommendationFilter}
                  onChange={(e) => {
                    setRecommendationFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e513b] cursor-pointer"
                >
                  <option value="All Recommendations">All Recommendations</option>
                  <option value="Approved">Approved</option>
                  <option value="Minor Revisions">Minor Revisions</option>
                  <option value="Major Revisions">Major Revisions</option>
                  <option value="Disapproved">Disapproved</option>
                </select>
              </div>

              {/* Period dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
                  PERIOD:
                </span>
                <select
                  value={periodFilter}
                  onChange={(e) => {
                    setPeriodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1e513b] cursor-pointer"
                >
                  <option value="All Periods">All Periods</option>
                  <option value={currentAcademicYear}>{currentAcademicYear}</option>
                  <option value={prevAcademicYear}>{prevAcademicYear}</option>
                </select>
              </div>

              {/* Reset button */}
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Archived Evaluation Ledger Table Card matching Screenshot 3 */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Card Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-500 text-[19px]">
                inventory_2
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Archived Evaluation Ledger
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              SORTED BY: SUBMISSION DATE (NEWEST FIRST)
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 sm:px-5">PROTOCOL ID</th>
                  <th className="py-3 px-4">RESEARCH TITLE &amp; PRINCIPAL INVESTIGATOR</th>
                  <th className="py-3 px-4">REVIEW TRACK</th>
                  <th className="py-3 px-4">DATE SUBMITTED</th>
                  <th className="py-3 px-4">YOUR RECOMMENDATION</th>
                  <th className="py-3 px-4">FINAL URERB DECISION</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedReviews.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center">
                      <span className="material-symbols-outlined text-[40px] text-slate-300">
                        history
                      </span>
                      <div className="text-sm font-bold text-slate-800 mt-1">
                        No archived reviews found
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Completed protocol evaluations will be archived here once submitted.
                      </p>
                    </td>
                  </tr>
                )}
                {paginatedReviews.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Protocol ID with badge container */}
                    <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                      <span
                        className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded border ${getProtocolCodeColor(
                          item.decisionType
                        )}`}
                      >
                        {item.protocolCode}
                      </span>
                    </td>

                    {/* Title & PI */}
                    <td className="py-3.5 px-4 min-w-[200px] max-w-[260px]">
                      <div className="font-bold text-slate-900 leading-snug">
                        {item.titleShort || item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.piShort || item.pi}
                      </div>
                    </td>

                    {/* Review Track */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {item.track}
                    </td>

                    {/* Date Submitted */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                      {item.dateSubmitted}
                    </td>

                    {/* Your Recommendation */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold ${getRecommendationBadge(
                          item.recommendation
                        )}`}
                      >
                        {item.recommendation}
                      </span>
                    </td>

                    {/* Final URERB Decision */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div
                        className={`font-bold ${item.decisionType === 'disapproved'
                            ? 'text-rose-600'
                            : 'text-slate-900'
                          }`}
                      >
                        {item.finalDecision}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.finalDecisionSub}
                      </div>
                    </td>

                    {/* Action: Review Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedReview(item)}
                        className="px-3.5 py-1.5 bg-[#eef2f9] hover:bg-[#e2e8f4] text-[#2b4c7e] font-semibold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with True Pagination */}
          <div className="p-4 sm:px-5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-3">
            <span>
              {filteredReviews.length === 0
                ? 'Showing 0 of 0 records'
                : `Showing ${Math.min(filteredReviews.length, (currentPage - 1) * pageSize + 1)}–${Math.min(filteredReviews.length, currentPage * pageSize)} of ${filteredReviews.length} records`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                disabled={currentPage <= 1}
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-all cursor-pointer ${currentPage === pageNumber
                      ? 'bg-[#1e513b] text-white shadow-2xs'
                      : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                disabled={currentPage >= totalPages}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review Details Read-Only Modal (Screenshot 2) */}
      <ReviewDetailsModal
        isOpen={Boolean(selectedReview)}
        onClose={() => setSelectedReview(null)}
        review={selectedReview}
      />
    </ReviewerLayout>
  );
}
