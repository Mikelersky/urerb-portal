import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ResearcherLayout from '../../layouts/ResearcherLayout';
import { ROUTES } from '../../constants/routes';
import { getCurrentUser } from '../../utils/auth';
import { protocolsApi } from '../../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPickupApp, setSelectedPickupApp] = useState(null);
  const [draftToDelete, setDraftToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteDraft = async () => {
    if (!draftToDelete) return;
    setIsDeleting(true);
    try {
      await protocolsApi.deleteDraft(draftToDelete.id);
      setApplications((prev) => prev.filter((a) => a.id !== draftToDelete.id));
      window.dispatchEvent(new Event('urerb_applications_sync'));
      setDraftToDelete(null);
    } catch (err) {
      console.error('Failed to delete draft:', err);
      alert(err.message || 'Failed to delete draft');
    } finally {
      setIsDeleting(false);
    }
  };

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

    const handleSync = () => {
      setCurrentUser(getCurrentUser());
      fetchProtocols();
    };

    window.addEventListener('urerb_applications_sync', handleSync);
    window.addEventListener('urerb_auth_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('urerb_applications_sync', handleSync);
      window.removeEventListener('urerb_auth_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Top 3 recent applications for the dashboard executive view
  const recentApplications = applications.slice(0, 3);

  // Stats
  const totalCount = applications.length;
  const underReviewCount = applications.filter((a) =>
    ['Under Review', 'Passed Intake', 'Assigned to Reviewers'].includes(a.status)
  ).length;
  const revisionCount = applications.filter((a) =>
    ['Revision Required', 'PI Clarification'].includes(a.status)
  ).length;
  const completedCount = applications.filter((a) =>
    ['Clearance Issued', 'Completed'].includes(a.status)
  ).length;
  const revisionApp = applications.find((a) =>
    ['Revision Required', 'PI Clarification'].includes(a.status)
  );
  const draftsCount = applications.filter((a) => a.status === 'Draft').length;

  return (
    <ResearcherLayout applicationsCount={totalCount}>
      <div className="space-y-6 pb-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back, {currentUser?.name ? currentUser.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, '').split(' ')[0] : 'Researcher'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Mariano Marcos State University · {currentUser?.college || currentUser?.department || 'University Research Ethics Portal'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={ROUTES.RESEARCHER.MY_APPLICATIONS}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">folder_open</span>
              <span>All Applications ({totalCount})</span>
            </Link>
            <Link
              to={ROUTES.RESEARCHER.NEW_APPLICATION}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1e513b] text-white font-semibold text-xs shadow-xs hover:bg-[#163f2e] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Protocol</span>
            </Link>
          </div>
        </div>

        {/* Priority Action Required Alert Banner */}
        {revisionApp && (
          <div className="bg-[#fff8f8] border border-red-200/90 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0 mt-0.5 ring-4 ring-red-100/50">
                <span className="material-symbols-outlined text-[20px]">rate_review</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">
                    Action Required: Revision / Clarification Requested
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ffdad6] text-[#93000a] border border-red-200">
                    Action Needed
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1 max-w-2xl leading-relaxed">
                  Protocol <strong className="font-mono text-[#1e513b]">{revisionApp.protocolCode || revisionApp.protocolId}</strong> requires attention: {revisionApp.remarks || 'Please review committee remarks.'}
                </p>
                <div className="text-[11px] text-slate-500 font-mono mt-1">
                  {revisionApp.academicUnit} · {revisionApp.stageLabel}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <Link
                to={`${ROUTES.RESEARCHER.APPLICATION_TRACKING}?id=${revisionApp.protocolCode || revisionApp.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Respond to Revision</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        )}

        {/* 4 Quick Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Registered */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Total Protocols
              </span>
              <span className="material-symbols-outlined text-[20px] text-slate-400">
                folder_copy
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                {String(totalCount).padStart(2, '0')}
              </span>
              <span className="text-xs text-slate-500 font-medium">registered</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Submitted ethics applications</p>
          </div>

          {/* Under Review */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-blue-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                Under Review
              </span>
              <span className="material-symbols-outlined text-[20px] text-blue-600">
                hourglass_top
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-blue-700">
                {String(underReviewCount).padStart(2, '0')}
              </span>
              <span className="text-xs text-blue-600 font-medium">in progress</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Intake and panel review</p>
          </div>

          {/* Revision Required */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-red-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-red-600 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                Action Needed
              </span>
              <span className="material-symbols-outlined text-[20px] text-red-500">
                error_outline
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-red-600">
                {String(revisionCount).padStart(2, '0')}
              </span>
              <span className="text-xs text-red-600 font-medium">clarification/revision</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting researcher upload</p>
          </div>

          {/* Cleared / Completed */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-emerald-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#1e513b] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1e513b]">
                Ethics Approved
              </span>
              <span className="material-symbols-outlined text-[20px] text-[#1e513b]">
                verified
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-[#1e513b]">
                {String(completedCount).padStart(2, '0')}
              </span>
              <span className="text-xs text-[#1e513b] font-medium">cleared</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Clearance issued</p>
          </div>
        </div>

        {/* Quick Action Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to={ROUTES.RESEARCHER.NEW_APPLICATION}
            className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-[#1e513b] hover:shadow-sm transition-all group flex items-start gap-3.5"
          >
            <div className="p-2.5 rounded-lg bg-emerald-50 text-[#1e513b] group-hover:bg-[#1e513b] group-hover:text-white transition-colors shrink-0">
              <span className="material-symbols-outlined text-[22px]">post_add</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#1e513b] transition-colors">
                Start New Protocol
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Step-by-step submission wizard with automatic draft saving.
              </p>
            </div>
          </Link>

          <Link
            to={ROUTES.RESEARCHER.HELP_CENTER}
            className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-[#1e513b] hover:shadow-sm transition-all group flex items-start gap-3.5"
          >
            <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-[#1e513b] group-hover:text-white transition-colors shrink-0">
              <span className="material-symbols-outlined text-[22px]">download_for_offline</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#1e513b] transition-colors">
                Download Official Forms
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Get URERB Forms 13, 14, 15, 16 &amp; 17 blank templates.
              </p>
            </div>
          </Link>

          <Link
            to={ROUTES.RESEARCHER.APPLICATION_TRACKING}
            className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-[#1e513b] hover:shadow-sm transition-all group flex items-start gap-3.5"
          >
            <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-[#1e513b] group-hover:text-white transition-colors shrink-0">
              <span className="material-symbols-outlined text-[22px]">timeline</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#1e513b] transition-colors">
                Track Review Milestones
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Monitor panel deliberations, review comments &amp; status logs.
              </p>
            </div>
          </Link>
        </div>

        {/* Recent Protocols Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Recent Protocol Submissions
              </h2>
              <p className="text-xs text-slate-500">
                Most active research studies in your current portfolio.
              </p>
            </div>
            <Link
              to={ROUTES.RESEARCHER.MY_APPLICATIONS}
              className="text-xs font-semibold text-[#1e513b] hover:text-[#163f2e] transition-colors hover:underline"
            >
              View Full Archive
            </Link>
          </div>

          {draftsCount > 1 && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">edit_note</span>
                <span>
                  You have <strong>{draftsCount} unsubmitted drafts</strong> saved. You can manage, select, or bulk delete them in My Applications.
                </span>
              </div>
              <Link
                to={ROUTES.RESEARCHER.MY_APPLICATIONS}
                className="text-[#1e513b] hover:text-[#163f2e] hover:underline font-semibold flex items-center gap-1 shrink-0"
              >
                <span>Manage &amp; clean up drafts</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {recentApplications.length === 0 ? (
              <div className="p-8 text-center bg-gray-50/40">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <span className="material-symbols-outlined text-[24px]">folder_open</span>
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">No protocol submissions yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
                  Start your first research ethics application to begin the review process and obtain institutional clearance.
                </p>
                <Link
                  to={ROUTES.RESEARCHER.NEW_APPLICATION}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e513b] text-white font-medium text-xs hover:bg-[#163f2e] transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Start New Protocol</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-[#1e513b] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          {app.protocolCode || app.protocolId}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {app.reviewType || app.reviewTrack}
                        </span>
                        {['Revision Required', 'PI Clarification'].includes(app.status) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            Action Needed
                          </span>
                        )}
                        {['Under Review', 'Checking', 'Passed Intake', 'Assigned to Reviewers'].includes(app.status) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {app.stageLabel || app.status}
                          </span>
                        )}
                        {['Completed', 'Clearance Issued'].includes(app.status) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Cleared
                          </span>
                        )}
                        {app.status === 'Draft' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Draft
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {app.title}
                      </h3>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>Submitted: {app.dateSubmitted || 'Draft'}</span>
                        <span>·</span>
                        <span>Academic Unit: {app.academicUnitShort || app.academicUnit}</span>
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      {['Completed', 'Clearance Issued'].includes(app.status) ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPickupApp(app)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[16px] text-emerald-700">
                            verified
                          </span>
                          <span>Claim at Office</span>
                        </button>
                      ) : ['Revision Required', 'PI Clarification'].includes(app.status) ? (
                        <Link
                          to={`${ROUTES.RESEARCHER.APPLICATION_TRACKING}?id=${app.protocolCode || app.id}`}
                          className="px-3.5 py-1.5 rounded-lg bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <span>View Feedback</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      ) : app.status === 'Draft' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            to={`${ROUTES.RESEARCHER.NEW_APPLICATION}?mode=draft&id=${app.id}`}
                            className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            <span>Edit Draft</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDraftToDelete(app)}
                            className="p-1.5 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold transition-all inline-flex items-center shadow-xs cursor-pointer"
                            title="Delete Draft"
                          >
                            <span className="material-symbols-outlined text-[16px] text-red-500">delete</span>
                          </button>
                        </div>
                      ) : (
                        <Link
                          to={`${ROUTES.RESEARCHER.APPLICATION_TRACKING}?id=${app.protocolCode || app.id}`}
                          className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <span>Track Status</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Physical Certificate Claiming Guidance Modal */}
      {selectedPickupApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Certificate of Ethics Clearance
                  </h3>
                  <p className="text-xs text-slate-500">Official In-Person Claiming Guidelines</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPickupApp(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content Body */}
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

      {/* Draft Delete Confirmation Modal */}
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
                Deleting this draft will permanently remove all attached draft files, form progress, and records from the database.
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
                onClick={handleDeleteDraft}
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
    </ResearcherLayout>
  );
}
