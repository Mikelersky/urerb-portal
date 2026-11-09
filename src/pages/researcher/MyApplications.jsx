import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ResearcherLayout from '../../layouts/ResearcherLayout';
import { ROUTES } from '../../constants/routes';
import { protocolsApi } from '../../services/api';

export default function MyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses (Active)');
  const [selectedReviewType, setSelectedReviewType] = useState('All Review Types');
  const [selectedPeriod, setSelectedPeriod] = useState('All Semesters');
  const [selectedPickupApp, setSelectedPickupApp] = useState(null);

  // Draft deletion states
  const [draftToDelete, setDraftToDelete] = useState(null);
  const [selectedDraftIds, setSelectedDraftIds] = useState([]);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState(null);

  const ayOptions = useMemo(() => {
    const now = new Date();
    const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const base = [
      `AY ${startYear}-${startYear + 1}`,
      `AY ${startYear - 1}-${startYear}`,
    ];
    applications.forEach((app) => {
      if (app.academicYear && !base.includes(app.academicYear)) {
        base.push(app.academicYear);
      }
    });
    return base;
  }, [applications]);

  useEffect(() => {
    const fetchProtocols = () => {
      protocolsApi.list()
        .then((res) => {
          if (res && Array.isArray(res.protocols)) {
            setApplications(res.protocols);
          }
        })
        .catch((err) => {
          console.error('Failed to load researcher applications:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    fetchProtocols();

    const handleSync = () => fetchProtocols();
    window.addEventListener('urerb_applications_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('urerb_applications_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Filter logic
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const code = (app.protocolCode || app.protocolId || '').toLowerCase();
      const title = (app.title || '').toLowerCase();
      const unit = (app.academicUnit || app.department || '').toLowerCase();
      const q = searchTerm.trim().toLowerCase();

      const matchesSearch =
        q === '' ||
        code.includes(q) ||
        title.includes(q) ||
        unit.includes(q);

      let matchesStatus = true;
      if (selectedStatus === 'Draft') {
        matchesStatus = app.status === 'Draft';
      } else if (selectedStatus === 'Under Review') {
        matchesStatus = ['Under Review', 'Checking', 'Passed Intake', 'Assigned to Reviewers', 'New Intake'].includes(app.status);
      } else if (selectedStatus === 'Revision Required') {
        matchesStatus = ['Revision Required', 'PI Clarification'].includes(app.status);
      } else if (selectedStatus === 'Completed') {
        matchesStatus = ['Completed', 'Clearance Issued'].includes(app.status);
      }

      const matchesReview =
        selectedReviewType === 'All Review Types' ||
        (app.reviewTrack || app.reviewType) === selectedReviewType;

      const matchesPeriod =
        selectedPeriod === 'All Semesters' ||
        !app.academicYear ||
        app.academicYear === selectedPeriod;

      return matchesSearch && matchesStatus && matchesReview && matchesPeriod;
    });
  }, [applications, searchTerm, selectedStatus, selectedReviewType, selectedPeriod]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('All Statuses (Active)');
    setSelectedReviewType('All Review Types');
    setSelectedPeriod('All Semesters');
  };

  // Metric counts
  const totalCount = applications.length;
  const underReviewCount = applications.filter((a) =>
    ['Under Review', 'Passed Intake', 'Assigned to Reviewers', 'Checking', 'New Intake'].includes(a.status)
  ).length;
  const revisionCount = applications.filter((a) =>
    ['Revision Required', 'PI Clarification'].includes(a.status)
  ).length;
  const completedCount = applications.filter((a) =>
    ['Completed', 'Clearance Issued'].includes(a.status)
  ).length;
  const draftsCount = applications.filter((a) => a.status === 'Draft').length;

  // Draft selection logic
  const visibleDrafts = useMemo(() => {
    return filteredApps.filter((a) => a.status === 'Draft');
  }, [filteredApps]);

  const allVisibleDraftsSelected =
    visibleDrafts.length > 0 &&
    visibleDrafts.every((d) => selectedDraftIds.includes(d.id));

  const toggleSelectAllVisibleDrafts = () => {
    if (allVisibleDraftsSelected) {
      setSelectedDraftIds((prev) =>
        prev.filter((id) => !visibleDrafts.some((d) => d.id === id))
      );
    } else {
      const newIds = new Set([...selectedDraftIds, ...visibleDrafts.map((d) => d.id)]);
      setSelectedDraftIds(Array.from(newIds));
    }
  };

  const toggleSelectDraft = (id) => {
    setSelectedDraftIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Delete single draft
  const handleDeleteSingleDraft = async () => {
    if (!draftToDelete) return;
    setIsDeleting(true);
    try {
      await protocolsApi.deleteDraft(draftToDelete.id);
      setApplications((prev) => prev.filter((a) => a.id !== draftToDelete.id));
      setSelectedDraftIds((prev) => prev.filter((id) => id !== draftToDelete.id));
      setDeleteFeedback({
        type: 'success',
        message: `Draft "${draftToDelete.title || 'Untitled Protocol'}" was deleted permanently.`,
      });
      window.dispatchEvent(new Event('urerb_applications_sync'));
      setDraftToDelete(null);
    } catch (err) {
      console.error('Failed to delete draft:', err);
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'Failed to delete draft application.',
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setDeleteFeedback(null), 4000);
    }
  };

  // Delete selected drafts
  const handleDeleteSelectedDrafts = async () => {
    if (selectedDraftIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await protocolsApi.deleteDrafts(selectedDraftIds);
      const count = res.count || selectedDraftIds.length;
      setApplications((prev) => prev.filter((a) => !selectedDraftIds.includes(a.id)));
      setSelectedDraftIds([]);
      setShowDeleteSelectedModal(false);
      setDeleteFeedback({
        type: 'success',
        message: `${count} draft application(s) deleted successfully.`,
      });
      window.dispatchEvent(new Event('urerb_applications_sync'));
    } catch (err) {
      console.error('Failed to delete selected drafts:', err);
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'Failed to delete selected drafts.',
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setDeleteFeedback(null), 4000);
    }
  };

  // Delete all drafts
  const handleDeleteAllDrafts = async () => {
    setIsDeleting(true);
    try {
      const res = await protocolsApi.deleteAllDrafts();
      const count = res.count || draftsCount;
      setApplications((prev) => prev.filter((a) => a.status !== 'Draft'));
      setSelectedDraftIds([]);
      setShowDeleteAllModal(false);
      setDeleteFeedback({
        type: 'success',
        message: `All ${count} unsubmitted draft application(s) have been deleted.`,
      });
      window.dispatchEvent(new Event('urerb_applications_sync'));
    } catch (err) {
      console.error('Failed to delete all drafts:', err);
      setDeleteFeedback({
        type: 'error',
        message: err.message || 'Failed to clear all drafts.',
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setDeleteFeedback(null), 4000);
    }
  };

  return (
    <ResearcherLayout applicationsCount={totalCount}>
      {/* Top Header & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            My Applications
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Track, submit, and manage your research ethics applications.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {draftsCount > 1 && (
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              title="Remove all unsubmitted draft protocols"
            >
              <span className="material-symbols-outlined text-[18px] text-red-600">delete_sweep</span>
              <span>Clear All Drafts ({draftsCount})</span>
            </button>
          )}
          <Link
            to={ROUTES.RESEARCHER.NEW_APPLICATION}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1e513b] text-white font-semibold text-sm shadow-xs hover:bg-[#163f2e] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>New Application</span>
          </Link>
        </div>
      </div>

      {/* 5 Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* All Applications */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              All Applications
            </span>
            <span className="material-symbols-outlined text-[22px] text-gray-400">
              folder_copy
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {String(totalCount).padStart(2, '0')}
            </span>
            <span className="text-xs text-gray-500 font-medium">protocols</span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Total registered</p>
        </div>

        {/* Under Review */}
        <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Under Review
            </span>
            <span className="material-symbols-outlined text-[22px] text-blue-600">
              hourglass_top
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-700">
              {String(underReviewCount).padStart(2, '0')}
            </span>
            <span className="text-xs text-blue-600 font-medium">in progress</span>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">Intake and panel review</p>
        </div>

        {/* Revision Required */}
        <div className="bg-white rounded-xl p-5 border border-red-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              Revision Required
            </span>
            <span className="material-symbols-outlined text-[22px] text-red-500">
              error_outline
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-600">
              {String(revisionCount).padStart(2, '0')}
            </span>
            <span className="text-xs text-red-600 font-medium">action needed</span>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">Awaiting response</p>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#1e513b] mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1e513b]">
              Completed
            </span>
            <span className="material-symbols-outlined text-[22px] text-[#1e513b]">
              verified
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#1e513b]">
              {String(completedCount).padStart(2, '0')}
            </span>
            <span className="text-xs text-[#1e513b] font-medium">cleared</span>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">Ethics approved</p>
        </div>

        {/* Drafts */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'Draft' ? 'All Statuses (Active)' : 'Draft')}
          className={`bg-white rounded-xl p-5 border shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:border-gray-400 ${
            selectedStatus === 'Draft' ? 'ring-2 ring-gray-600 border-gray-600 bg-gray-50/60' : 'border-gray-200'
          }`}
          title="Click to filter by unsubmitted drafts"
        >
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Drafts
            </span>
            <span className="material-symbols-outlined text-[22px] text-gray-400">
              edit_note
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-800">
              {String(draftsCount).padStart(2, '0')}
            </span>
            <span className="text-xs text-gray-500 font-medium">unsubmitted</span>
          </div>
          <div className="flex items-center justify-between mt-1.5 text-xs">
            <span className="text-gray-400 text-[11px]">
              {selectedStatus === 'Draft' ? 'Active filter' : 'Click to filter'}
            </span>
            {draftsCount > 1 && (
              <span className="text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                {draftsCount} drafts
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {deleteFeedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-150 ${
            deleteFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-[#1e513b]'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {deleteFeedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-medium">{deleteFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteFeedback(null)}
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Bulk Draft Selection Bar */}
      {selectedDraftIds.length > 0 && (
        <div className="bg-red-50/90 border border-red-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-red-950 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-[20px]">check_box</span>
            <span>
              <strong>{selectedDraftIds.length}</strong> draft{selectedDraftIds.length > 1 ? 's' : ''} selected for deletion
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedDraftIds([])}
              className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              Cancel Selection
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteSelectedModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>Delete Selected ({selectedDraftIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Multi-Draft Helper Notification */}
      {draftsCount > 1 && selectedDraftIds.length === 0 && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">
              edit_note
            </span>
            <span>
              You have <strong>{draftsCount} unsubmitted drafts</strong> saved. You can select specific drafts using the table checkboxes or clean up all unneeded drafts at once.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('Draft');
                const allDraftIds = applications.filter((a) => a.status === 'Draft').map((a) => a.id);
                setSelectedDraftIds(allDraftIds);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100/60 text-amber-900 font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-700">checklist</span>
              <span>Select All Drafts</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              <span>Clear All Drafts</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Protocol ID, title, investigator, or keyword..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-200 rounded-lg px-3 py-1.5 shrink-0 focus-within:border-[#1e513b] focus-within:bg-white transition-colors">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs font-semibold text-gray-800 bg-transparent border-0 p-0 pl-1 pr-6 focus:ring-0 cursor-pointer"
              >
                <option>All Statuses (Active)</option>
                <option>Draft</option>
                <option>Under Review</option>
                <option>Revision Required</option>
                <option>Completed</option>
              </select>
            </div>

            {/* Review Type Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-200 rounded-lg px-3 py-1.5 shrink-0 focus-within:border-[#1e513b] focus-within:bg-white transition-colors">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Review
              </span>
              <select
                value={selectedReviewType}
                onChange={(e) => setSelectedReviewType(e.target.value)}
                className="text-xs font-semibold text-gray-800 bg-transparent border-0 p-0 pl-1 pr-6 focus:ring-0 cursor-pointer"
              >
                <option>All Review Types</option>
                <option value="Expedited Review">Expedited Review</option>
                <option value="Full Board Review">Full Board Review</option>
                <option value="Exempted Review">Exempted Review</option>
              </select>
            </div>

            {/* Academic Period Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-200 rounded-lg px-3 py-1.5 shrink-0 focus-within:border-[#1e513b] focus-within:bg-white transition-colors">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Period
              </span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-xs font-semibold text-gray-800 bg-transparent border-0 p-0 pl-1 pr-6 focus:ring-0 cursor-pointer"
              >
                <option value="All Semesters">All Semesters</option>
                {ayOptions.map((ay) => (
                  <option key={ay} value={ay}>
                    {ay}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filter Info & Reset Subrow */}
        <div className="flex items-center justify-between pt-2.5 text-xs border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="inline-flex items-center gap-1.5 bg-[#eef5f0] text-[#1e513b] border border-[#1e513b]/20 px-2.5 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e513b]" />
              <span>
                Showing <strong>{filteredApps.length}</strong> of {applications.length} applications
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-[#1e513b] font-medium text-xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] text-gray-400">refresh</span>
            <span>Clear Filters</span>
          </button>
        </div>
      </div>

      {/* Applications Table Section */}
      {applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-8 space-y-4 text-center">
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-full bg-[#eef0ff] border border-blue-100 flex items-center justify-center text-blue-700 mb-3">
              <span className="material-symbols-outlined text-[24px]">folder_open</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">No applications yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mb-4 leading-relaxed">
              Start your first research ethics application to begin the review process and obtain institutional clearance.
            </p>
            <Link
              to={ROUTES.RESEARCHER.NEW_APPLICATION}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e513b] text-white font-medium text-xs hover:bg-[#163f2e] transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Start New Application</span>
            </Link>
          </div>
        </div>
      ) : (
        <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden w-full">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  {draftsCount > 0 && (
                    <th className="py-2.5 px-3 whitespace-nowrap text-center w-8">
                      {visibleDrafts.length > 0 ? (
                        <input
                          type="checkbox"
                          checked={allVisibleDraftsSelected}
                          onChange={toggleSelectAllVisibleDrafts}
                          className="rounded text-[#1e513b] focus:ring-[#1e513b] cursor-pointer"
                          title="Select / deselect all visible drafts"
                        />
                      ) : null}
                    </th>
                  )}
                  <th className="py-2.5 px-3 whitespace-nowrap text-left w-32">Protocol ID</th>
                  <th className="py-2.5 px-3 text-left">Research Title &amp; Academic Unit</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-left w-32">Review Type</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-left w-28">Date Submitted</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-left w-36">Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-left w-36">Stage Label</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    className={`transition-colors ${
                      selectedDraftIds.includes(app.id)
                        ? 'bg-red-50/50 hover:bg-red-50/70'
                        : 'hover:bg-gray-50/70'
                    }`}
                  >
                    {/* Checkbox for Draft selection */}
                    {draftsCount > 0 && (
                      <td className="py-2 px-3 whitespace-nowrap align-middle text-center">
                        {app.status === 'Draft' ? (
                          <input
                            type="checkbox"
                            checked={selectedDraftIds.includes(app.id)}
                            onChange={() => toggleSelectDraft(app.id)}
                            className="rounded text-[#1e513b] focus:ring-[#1e513b] cursor-pointer"
                            title={`Select draft ${app.protocolCode || app.protocolId}`}
                          />
                        ) : (
                          <span className="text-gray-300 font-mono text-[10px] select-none">—</span>
                        )}
                      </td>
                    )}

                    {/* Protocol ID */}
                    <td className="py-2 px-3 whitespace-nowrap align-middle">
                      <span
                        className={`font-mono font-medium text-[11px] px-2 py-0.5 rounded inline-block ${
                          app.status === 'Completed' || app.status === 'Clearance Issued'
                            ? 'text-emerald-800 bg-[#eef5f0] border border-emerald-200'
                            : 'text-gray-700 bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {app.protocolCode || app.protocolId}
                      </span>
                    </td>

                    {/* Title & Unit */}
                    <td className="py-2 px-3 align-middle">
                      <div className="font-semibold text-xs text-gray-900 leading-snug">
                        {app.title}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                        {app.academicUnitShort || app.academicUnit}
                      </div>
                    </td>

                    {/* Review Type */}
                    <td className="py-2 px-3 whitespace-nowrap align-middle text-gray-700 text-xs">
                      <span className="inline-flex items-center text-[11px] font-medium text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                        {app.reviewTrack || app.reviewType}
                      </span>
                    </td>

                    {/* Date Submitted */}
                    <td className="py-2 px-3 whitespace-nowrap align-middle text-gray-600 font-mono text-xs">
                      {app.dateSubmitted || 'Draft'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2 px-3 whitespace-nowrap align-middle">
                      {['Revision Required', 'PI Clarification'].includes(app.status) && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 border border-red-200/80 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                          <span>Action Needed</span>
                        </span>
                      )}
                      {['Under Review', 'Passed Intake', 'Assigned to Reviewers', 'Checking', 'New Intake'].includes(app.status) && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
                          <span>{app.status}</span>
                        </span>
                      )}
                      {['Completed', 'Clearance Issued'].includes(app.status) && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                          <span>Completed</span>
                        </span>
                      )}
                      {app.status === 'Draft' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                          <span>Draft</span>
                        </span>
                      )}
                    </td>

                    {/* Stage Label */}
                    <td className="py-2 px-3 whitespace-nowrap align-middle text-xs text-slate-600">
                      {app.stageLabel || app.status}
                    </td>

                    {/* Action Button */}
                    <td className="py-2 px-3 whitespace-nowrap align-middle text-right">
                      {['Completed', 'Clearance Issued'].includes(app.status) ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPickupApp(app)}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md border border-emerald-300 bg-[#eef5f0] text-[#1e513b] hover:bg-emerald-100 font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                          title="View In-Person Pickup Instructions"
                        >
                          <span className="material-symbols-outlined text-[15px] text-emerald-700">verified</span>
                          <span>Claim at Office</span>
                        </button>
                      ) : ['Revision Required', 'PI Clarification'].includes(app.status) ? (
                        <button
                          type="button"
                          onClick={() => navigate(`${ROUTES.RESEARCHER.APPLICATION_TRACKING}?id=${app.protocolCode || app.id}`)}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md bg-[#1e513b] text-white hover:bg-[#163f2e] font-medium text-xs transition-colors shadow-xs cursor-pointer"
                        >
                          <span>View Feedback</span>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </button>
                      ) : app.status === 'Draft' ? (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => navigate(`${ROUTES.RESEARCHER.NEW_APPLICATION}?mode=draft&id=${app.id}`)}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-xs transition-colors shadow-xs cursor-pointer"
                            title="Continue editing draft"
                          >
                            <span className="material-symbols-outlined text-[15px] text-gray-500">edit</span>
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDraftToDelete(app)}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium text-xs transition-colors shadow-xs cursor-pointer"
                            title="Delete this draft permanently"
                          >
                            <span className="material-symbols-outlined text-[15px] text-red-600">delete</span>
                            <span>Delete</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`${ROUTES.RESEARCHER.APPLICATION_TRACKING}?id=${app.protocolCode || app.id}`)}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-xs transition-colors shadow-xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px] text-gray-500">visibility</span>
                          <span>Track Status</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Physical Certificate Claiming Instructions Modal */}
      {selectedPickupApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#1e513b] flex items-center justify-center shrink-0 border border-emerald-200">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    Certificate of Ethics Clearance
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Physical Hard Copy Issuance Notice</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPickupApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Protocol ID:</span>
                  <span className="font-mono font-semibold text-[#1e513b]">{selectedPickupApp.protocolCode || selectedPickupApp.protocolId}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 font-medium shrink-0">Study Title:</span>
                  <span className="font-medium text-slate-900 text-right leading-snug">{selectedPickupApp.title}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 mt-0.5">
                  <span className="text-slate-500 font-medium">Certificate No.:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedPickupApp.clearanceCertNo || 'Official On File'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Clearance Validity:</span>
                  <span className="font-semibold text-emerald-800">{selectedPickupApp.clearanceValidity || '1 Year From Issuance'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900">
                <span className="material-symbols-outlined text-amber-700 text-[18px] mt-0.5 shrink-0">
                  apartment
                </span>
                <p className="leading-relaxed">
                  <strong>In-Person Claiming Required:</strong> In adherence to PHREB and URERB Standard Operating Procedures, the Certificate of Ethics Clearance is issued exclusively as an embossed physical hard copy bearing the official dry seal and signatures of the Panel Chair and Secretariat.
                </p>
              </div>

              <div className="border border-slate-200 rounded-lg p-3.5 space-y-2 bg-white">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#1e513b] text-[16px]">location_on</span>
                  <span>Claiming Office &amp; Schedule:</span>
                </div>
                <ul className="space-y-1.5 text-slate-600 pl-5 list-disc leading-relaxed">
                  <li><strong>Location:</strong> URERB Secretariat Office, FEM Hall 2nd Floor, MMSU Main Campus, City of Batac</li>
                  <li><strong>Office Hours:</strong> Monday to Friday, 8:00 AM – 5:00 PM (excluding holidays)</li>
                  <li><strong>Requirement:</strong> Please present your valid MMSU Faculty / Employee / Student ID upon claiming.</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedPickupApp(null)}
                className="px-5 py-2 rounded-lg bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Single Draft Delete Confirmation Modal */}
      {draftToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Draft Application?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <div className="font-mono text-[11px] font-semibold text-gray-600">
                  {draftToDelete.protocolCode || draftToDelete.protocolId || `DRAFT-${draftToDelete.id}`}
                </div>
                <div className="font-semibold text-gray-900 text-xs leading-snug">
                  {draftToDelete.title || 'Untitled Draft Protocol'}
                </div>
                <div className="text-[11px] text-gray-500">
                  {draftToDelete.academicUnit || 'Academic Unit Unspecified'}
                </div>
              </div>

              <p className="text-gray-600 leading-relaxed">
                Deleting this draft will permanently delete all attached draft files, form progress, and records. Any officially submitted protocols will not be affected.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDraftToDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSingleDraft}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Yes, Delete Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Selected Drafts Delete Confirmation Modal */}
      {showDeleteSelectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_sweep</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {selectedDraftIds.length} Selected Drafts?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permanently remove selected unsubmitted draft applications.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-gray-600 leading-relaxed">
                You are about to permanently delete <strong>{selectedDraftIds.length}</strong> selected draft protocol(s). All draft form data and uploaded files will be removed.
              </p>

              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-slate-50 p-2 text-xs">
                {applications
                  .filter((a) => selectedDraftIds.includes(a.id))
                  .map((d) => (
                    <div key={d.id} className="py-1 px-1.5 flex items-center justify-between text-gray-700">
                      <span className="truncate max-w-[260px] font-medium">{d.title || 'Untitled Draft'}</span>
                      <span className="font-mono text-[10px] text-gray-500 shrink-0">{d.protocolCode || `DRAFT-${d.id}`}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteSelectedModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSelectedDrafts}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Yes, Delete Selected</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete All Drafts Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">auto_delete</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete All {draftsCount} Draft Protocols?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clean up all unsubmitted draft applications in your workspace.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-red-50/80 border border-red-200 rounded-lg text-red-900 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0 mt-0.5">warning</span>
                <p className="leading-relaxed">
                  This will permanently clear all <strong>{draftsCount}</strong> unsubmitted drafts and their attached files. Only draft records will be deleted — your submitted, in-review, and approved protocols are completely safe.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAllDrafts}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Clearing Drafts...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    <span>Yes, Clear All Drafts</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ResearcherLayout>
  );
}
