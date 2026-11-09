import React, { useState, useMemo, useEffect } from 'react';
import SecretariatLayout from '../../layouts/SecretariatLayout';
import { archivesApi } from '../../services/api';
import { getCurrentUser } from '../../utils/auth';
import DocumentPreviewModal from '../../components/common/DocumentPreviewModal';

const RecordsAndArchives = () => {
  const [archivedRecords, setArchivedRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [reviewTypeFilter, setReviewTypeFilter] = useState('All');
  const [activePage, setActivePage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArchives = async () => {
    try {
      setIsLoading(true);
      const res = await archivesApi.list();
      const list = res?.records || res?.archives || [];
      if (Array.isArray(list)) {
        setArchivedRecords(list);
      }
    } catch (err) {
      console.error('Failed to load archives from server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives();
    const handleSync = () => fetchArchives();
    window.addEventListener('urerb_secretariat_archives_sync', handleSync);
    return () => {
      window.removeEventListener('urerb_secretariat_archives_sync', handleSync);
    };
  }, []);

  // Selected record for Record Details Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  // Track report received state per record ID
  const [reportReceivedMap, setReportReceivedMap] = useState({});

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredRecords = useMemo(() => {
    return archivedRecords.filter((rec) => {
      if (statusFilter !== 'All' && rec.status !== statusFilter) return false;
      if (collegeFilter !== 'All' && rec.collegeCode !== collegeFilter) return false;
      if (reviewTypeFilter !== 'All' && rec.reviewType !== reviewTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = rec.protocolId.toLowerCase().includes(q);
        const matchesTitle = rec.title.toLowerCase().includes(q);
        const matchesPi = rec.pi.toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesPi) return false;
      }
      return true;
    });
  }, [archivedRecords, searchQuery, statusFilter, collegeFilter, reviewTypeFilter]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setCollegeFilter('All');
    setReviewTypeFilter('All');
  };

  const handleExportCsv = () => {
    const headers = [
      'Protocol ID',
      'Research Title',
      'Principal Investigator',
      'College / Unit',
      'Review Type',
      'Validity',
      'Status',
      'Decision Date',
    ];
    const rows = archivedRecords.map((r) => [
      r.protocolId,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.pi}"`,
      `"${r.unitFull}"`,
      r.reviewTypeFull,
      `"${r.validity}"`,
      r.status,
      `"${r.decisionDate}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'URERB_Ethics_Records_Archive.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${archivedRecords.length} archived protocol records to CSV.`);
  };

  const handleSimulatedDownload = (docTitle, protocolId) => {
    const activeUser = getCurrentUser();
    const officerLabel =
      activeUser?.role === 'secretariat'
        ? `${activeUser.name || activeUser.fullName} (${activeUser.title || 'Secretariat Officer'})`
        : 'Secretariat Officer';
    const content = `MARIANO MARCOS STATE UNIVERSITY\nUNIVERSITY RESEARCH ETHICS REVIEW BOARD (URERB)\nARCHIVED RECORD REPOSITORY\n\nProtocol ID: ${protocolId}\nDocument: ${docTitle}\nRetrieved By: ${officerLabel}\nTimestamp: ${new Date().toLocaleString()}\n\nThis is an official archived document copy from the URERB Digital Ledger.`;
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${protocolId}_${docTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${docTitle} (${protocolId})`);
  };

  const renderStatusPill = (status) => {
    switch (status) {
      case 'In Deliberation':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse"></span>
            In Deliberation
          </span>
        );
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#14532D] border border-[#BBF7D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#14532D]"></span>
            Active
          </span>
        );
      case 'Report Due':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
            Report Due
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#14532D] border border-[#BBF7D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#14532D]"></span>
            Completed
          </span>
        );
      case 'Disapproved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
            Disapproved
          </span>
        );
      case 'Archived':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EEF2FF] text-[#3730A3] border border-[#C7D2FE]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]"></span>
            Archived
          </span>
        );
    }
  };

  return (
    <SecretariatLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#14532D] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-[#0F172A] tracking-tight">
            Ethics Records &amp; Archives
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Centralized repository of completed and archived URERB application records.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#14532D] hover:bg-[#0F3F21] text-white text-xs font-bold shadow-sm transition-colors self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          Export Records (.csv)
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <span className="material-symbols-outlined text-[18px] text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Protocol ID, Research Title, or PI..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#14532D] focus:bg-white transition-colors"
            />
          </div>

          {/* All Statuses */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#334155] focus:outline-none focus:border-[#14532D]"
          >
            <option value="All">All Statuses</option>
            <option value="In Deliberation">In Deliberation</option>
            <option value="Active">Active Clearance</option>
            <option value="Report Due">Report Due</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
            <option value="Disapproved">Disapproved</option>
          </select>

          {/* All Colleges / Units */}
          <select
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#334155] focus:outline-none focus:border-[#14532D]"
          >
            <option value="All">All Colleges / Units</option>
            <option value="CCIS">College of Computing &amp; Information Sciences (CCIS)</option>
            <option value="CAS">College of Arts &amp; Sciences (CAS)</option>
            <option value="CHS">College of Health Sciences (CHS)</option>
            <option value="CAFSD">College of Agriculture, Food &amp; Sustainable Dev. (CAFSD)</option>
            <option value="COM">College of Medicine (COM)</option>
            <option value="COE">College of Engineering (COE)</option>
            <option value="CIT">College of Industrial Technology (CIT)</option>
            <option value="CBEA">College of Business, Economics &amp; Accountancy (CBEA)</option>
            <option value="CTE">College of Teacher Education (CTE)</option>
          </select>

          {/* All Review Types */}
          <select
            value={reviewTypeFilter}
            onChange={(e) => setReviewTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#334155] focus:outline-none focus:border-[#14532D]"
          >
            <option value="All">All Review Types</option>
            <option value="Expedited">Expedited</option>
            <option value="Full Board">Full Board</option>
            <option value="Exempt">Exempt</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={handleClearFilters}
            className="px-2.5 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[#64748B] w-[150px]">
                  Protocol ID
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Research Title / Principal Investigator
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[#64748B] w-[120px]">
                  Review Type
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[#64748B] w-[170px]">
                  Validity
                </th>
                <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-[#64748B] w-[135px]">
                  Status
                </th>
                <th className="py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[#64748B] text-right w-[130px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredRecords.map((rec) => {
                const isReportDue = rec.status === 'Report Due';
                return (
                  <tr key={rec.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-4 px-5 align-middle">
                      <span className="font-mono text-xs font-bold text-[#14532D]">
                        {rec.protocolId}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <p
                        className="text-[13px] font-bold text-[#0F172A] truncate max-w-[340px]"
                        title={rec.title}
                      >
                        {rec.titleShort || rec.title}
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {rec.pi} · {rec.unit}
                      </p>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <span className="text-xs font-medium text-[#475569]">{rec.reviewType}</span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <span
                        className={`text-xs ${
                          isReportDue ? 'font-bold text-[#DC2626]' : 'font-medium text-[#475569]'
                        }`}
                      >
                        {rec.validity}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle">{renderStatusPill(rec.status)}</td>
                    <td className="py-4 px-5 align-middle text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#14532D] hover:text-[#0F3F21] px-2 py-1 rounded hover:bg-[#E8F5E9] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          View
                        </button>
                        <button
                          onClick={() =>
                            handleSimulatedDownload(
                              rec.documents?.[0]?.title || 'Ethics Record Package',
                              rec.protocolId
                            )
                          }
                          title="Download Ethics Record"
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-[20px]">folder_off</span>
                      </div>
                      <p className="text-sm font-bold text-[#0F172A]">No archived records found</p>
                      <p className="text-xs text-[#64748B]">
                        No protocol records match your current search or filter criteria.
                      </p>
                      <button
                        onClick={handleClearFilters}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#0F3F21] transition-colors"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-5 py-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
          <p className="text-xs text-[#64748B]">
            Showing <span className="font-semibold text-[#0F172A]">{filteredRecords.length}</span>{' '}
            of <span className="font-semibold text-[#0F172A]">{archivedRecords.length}</span> protocol records
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActivePage((p) => Math.max(1, p - 1))}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">chevron_left</span>
              Previous
            </button>
            <button
              onClick={() => setActivePage(1)}
              className="w-7 h-7 rounded-lg text-xs font-bold bg-[#14532D] text-white transition-colors"
            >
              1
            </button>
            <button
              onClick={() => setActivePage((p) => p + 1)}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50 transition-colors"
            >
              Next
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom PHREB Compliance Bar */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] font-mono text-[#475569]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#14532D]">verified_user</span>
          <span>
            PHREB SOP-09 Compliance: Retained 3 years post-completion in URERB Physical Vault &amp;
            Digital Ledger.
          </span>
        </div>
        <span className="text-[#64748B]">Digital Ledger Status: Ready</span>
      </div>

      {/* RECORD DETAILS MODAL (Completed / Archived OR Report Due) */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-[580px] overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[#F1F5F9] flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center flex-wrap gap-2.5">
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    {selectedRecord.recordType === 'report_due'
                      ? 'Record Details — Report Due'
                      : 'Record Details'}
                  </h3>
                  {selectedRecord.recordType === 'report_due' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#B91C1C]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                      Report Due
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#14532D] border border-[#BBF7D0]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#14532D]"></span>
                      {selectedRecord.modalBadge || 'Completed'}
                    </span>
                  )}
                </div>
                {selectedRecord.recordType === 'report_due' && (
                  <p className="text-xs text-[#64748B] mt-1">
                    Cleared &amp; Monitored Records · Institutional Repository
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-[#94A3B8] hover:text-[#475569] p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* SECTION 1: RECORD INFORMATION */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  <span className="material-symbols-outlined text-[15px] text-[#14532D]">
                    description
                  </span>
                  <span>Section 1: Record Information</span>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-4 space-y-3.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        Protocol ID
                      </p>
                      <p className="font-mono text-xs font-bold text-[#14532D] mt-0.5">
                        {selectedRecord.protocolId}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        Review Type
                      </p>
                      <p className="text-xs font-medium text-[#0F172A] mt-0.5">
                        {selectedRecord.reviewTypeFull}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      Research Title
                    </p>
                    <p className="text-[13px] font-bold text-[#0F172A] mt-0.5 leading-snug">
                      {selectedRecord.title}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        Principal Investigator
                      </p>
                      <p className="text-xs font-medium text-[#0F172A] mt-0.5">
                        {selectedRecord.pi}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        College / Unit
                      </p>
                      <p className="text-xs font-medium text-[#0F172A] mt-0.5">
                        {selectedRecord.unitFull}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        Date Submitted
                      </p>
                      <p className="text-xs font-medium text-[#0F172A] mt-0.5">
                        {selectedRecord.dateSubmitted}
                      </p>
                    </div>
                    {selectedRecord.recordType === 'report_due' ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Current Validity
                        </p>
                        <p className="text-xs font-medium text-[#0F172A] mt-0.5">
                          {selectedRecord.currentValidity || '—'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                          Final Status
                        </p>
                        <p className="text-xs font-bold text-[#14532D] mt-0.5 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#14532D]"></span>
                          {selectedRecord.modalBadge || 'Completed'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: REVIEW INFORMATION or REPORT STATUS & ACTION REQUIRED */}
              {selectedRecord.recordType === 'report_due' ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                    <span className="material-symbols-outlined text-[15px] text-[#14532D]">
                      check_circle
                    </span>
                    <span>Section 2: Report Status &amp; Action Required</span>
                  </div>
                  {(() => {
                    const isReceived = !!reportReceivedMap[selectedRecord.id];
                    return (
                      <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase ${
                              isReceived ? 'text-[#14532D]' : 'text-[#B91C1C]'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isReceived ? 'bg-[#14532D]' : 'bg-[#DC2626]'
                              }`}
                            ></span>
                            {isReceived ? 'Status: Received' : 'Status: Report Due'}
                          </span>
                          {isReceived ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#E2E8F0] text-[#14532D] text-[11px] font-bold">
                              ✓ Report Received
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-bold">
                              Action Required
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-medium text-[#64748B]">Status</p>
                            <p className="text-xs font-semibold text-[#0F172A] mt-0.5">
                              {isReceived ? 'Received' : 'Pending Annual Report'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-[#64748B]">Due Date</p>
                            <p className="text-xs font-semibold text-[#0F172A] mt-0.5">
                              {selectedRecord.dueDate || '—'}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-[#475569]">
                          An annual report is required for this active protocol.
                        </p>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={async () => {
                              const nextState = !isReceived;
                              setReportReceivedMap((prev) => ({
                                ...prev,
                                [selectedRecord.id]: nextState,
                              }));
                              try {
                                await archivesApi.toggleReport(selectedRecord.id);
                                fetchArchives();
                              } catch (err) {
                                console.warn('Toggle report error:', err);
                              }
                              showToast(
                                nextState
                                  ? `Marked annual report as Received for ${selectedRecord.protocolId}`
                                  : `Reverted annual report status to Due for ${selectedRecord.protocolId}`
                              );
                            }}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              isReceived
                                ? 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] hover:bg-[#E2E8F0]'
                                : 'bg-[#14532D] text-white border-[#14532D] hover:bg-[#0F3F21]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              check_circle
                            </span>
                            {isReceived
                              ? 'Report Received (Completed)'
                              : 'Mark Report as Received'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                    <span className="material-symbols-outlined text-[15px] text-[#14532D]">
                      fact_check
                    </span>
                    <span>Section 2: Review Information</span>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        Review Panel
                      </p>
                      <p className="text-xs font-medium text-[#0F172A] mt-0.5">
                        {selectedRecord.reviewPanel}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        Decision Date
                      </p>
                      <p className="text-xs font-medium text-[#0F172A] mt-0.5">
                        {selectedRecord.decisionDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        Assigned Reviewer
                      </p>
                      <p className="text-xs font-medium text-[#0F172A] mt-0.5">
                        {selectedRecord.assignedReviewer}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        Decision
                      </p>
                      <p className="text-xs font-semibold text-[#0F172A] mt-0.5 inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#14532D]">
                          check_circle
                        </span>
                        {selectedRecord.decision}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: ASSOCIATED DOCUMENTS */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  <span className="material-symbols-outlined text-[15px] text-[#14532D]">
                    folder_open
                  </span>
                  <span>Section 3: Associated Documents</span>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] divide-y divide-[#F1F5F9] overflow-hidden bg-white">
                  {selectedRecord.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                            doc.iconColor || 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            {doc.icon || 'description'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0F172A] truncate">{doc.title}</p>
                          <p className="text-[11px] text-[#64748B]">{doc.meta}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() =>
                            setPreviewDoc({
                              ...doc,
                              title: doc.title,
                              fileName: doc.fileName || `${selectedRecord.protocolId}_${doc.title.replace(/\s+/g, '_')}.pdf`,
                              fileSize: doc.fileSize,
                              version: 'Archived Final',
                              status: 'Verified',
                              uploadedAt: selectedRecord.decisionDate,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#14532D] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          View
                        </button>
                        <button
                          onClick={() =>
                            handleSimulatedDownload(doc.title, selectedRecord.protocolId)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">download</span>
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Footnote for Completed/Archived records */}
              {selectedRecord.recordType !== 'report_due' && (
                <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2.5 flex items-center gap-2 text-xs text-[#64748B]">
                  <span className="material-symbols-outlined text-[16px] text-[#64748B]">info</span>
                  <span>
                    This record is archived and is available for reference and record retrieval.
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 rounded-lg bg-[#14532D] hover:bg-[#0F3F21] text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
      </div>
    </SecretariatLayout>
  );
};

export default RecordsAndArchives;
