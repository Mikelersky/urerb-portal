import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ResearcherLayout from '../../layouts/ResearcherLayout';
import { ROUTES } from '../../constants/routes';
import { protocolsApi } from '../../services/api';
import DocumentPreviewModal from '../../components/common/DocumentPreviewModal';

export default function ApplicationTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApplications = async () => {
    try {
      const res = await protocolsApi.list();
      if (res && res.success && Array.isArray(res.protocols)) {
        setApplications(res.protocols);
      }
    } catch (err) {
      console.error('Failed to load researcher applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    const handleSync = () => fetchApplications();
    window.addEventListener('urerb_applications_sync', handleSync);
    return () => {
      window.removeEventListener('urerb_applications_sync', handleSync);
    };
  }, []);

  const currentProtocolId = searchParams.get('id') || '';

  const protocol = useMemo(() => {
    if (!applications.length) return null;
    const raw =
      (currentProtocolId &&
        applications.find(
          (a) =>
            a.protocolId?.toLowerCase() === currentProtocolId.toLowerCase() ||
            a.protocolCode?.toLowerCase() === currentProtocolId.toLowerCase() ||
            String(a.id) === currentProtocolId
        )) ||
      applications[0];
    if (!raw) return null;

    const rawDocs = raw.documents || [];
    const mappedDocs = rawDocs.map((d) => {
      const isDeficient = d.status === 'Deficient' || d.status === 'Revision Required';
      return {
        id: d.id,
        documentKey: d.documentKey || d.key,
        title: d.title,
        fileName: d.fileName,
        description: d.fileName ? `${d.fileName} (${d.fileSizeFormatted || d.fileSize || 'Attached'})` : (d.remarks || 'Document attached'),
        version: d.version || 'v1.0',
        date: d.uploadedAt || raw.dateSubmitted || 'Recent',
        status: d.status || 'Verified',
        statusType: isDeficient ? 'revision' : (raw.status === 'Completed' || raw.status === 'Clearance Issued' || d.status === 'Approved') ? 'approved' : 'review',
        fileSize: d.fileSizeFormatted || d.fileSize,
        fileUrl: d.fileUrl,
        downloadUrl: d.downloadUrl,
        issueText: d.issueText || d.notes || d.remarks || '',
      };
    });

    const isDisapproved = raw.status === 'Disapproved';
    const isRevision = !isDisapproved && (raw.status === 'Revision Required' || raw.status === 'PI Clarification' || mappedDocs.some((d) => d.statusType === 'revision'));

    return {
      id: raw.id,
      protocolId: raw.protocolCode || raw.protocolId,
      title: raw.title,
      shortTitle: raw.title?.length > 70 ? raw.title.slice(0, 70) + '...' : raw.title,
      pi: raw.piName || raw.pi || 'Principal Investigator',
      reviewType: raw.reviewTrack || raw.reviewType || 'Expedited Review',
      submittedDate: raw.dateSubmitted || '—',
      activeStep: raw.activeStep || (raw.status === 'Draft' ? 1 : raw.status === 'Completed' || isDisapproved ? 5 : 2),
      stepStatus: raw.stageLabel || `Stage: ${raw.status || 'Submitted'}`,
      dueDate: raw.dueDate || '—',
      daysRemaining: raw.daysRemaining || (raw.dueDate ? 'In Progress' : '—'),
      lastUpdateDate: raw.dateSubmitted || 'Recently',
      verificationDate: raw.verificationDate || '',
      deliberationDate: raw.decisionDate || '',
      statusBadge: raw.status || 'Under Review',
      statusType: isDisapproved ? 'disapproved' : isRevision ? 'revision' : (raw.status === 'Completed' || raw.status === 'Clearance Issued') ? 'approved' : 'review',
      remarks: raw.remarks || 'Protocol queued in URERB review workflow.',
      reviewer: raw.reviewer || 'URERB Committee',
      documents: mappedDocs,
      logs: raw.logs || [],
    };
  }, [applications, currentProtocolId]);

  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState('');

  // Modal state: null | 'upload' | 'confirm' | 'success'
  const [activeModal, setActiveModal] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Submission completion state
  const [isRevisionSubmitted, setIsRevisionSubmitted] = useState(false);

  // Uploaded file state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedRawFile, setSelectedRawFile] = useState(null);
  const [selectedRevisionDoc, setSelectedRevisionDoc] = useState(null);
  const [isUploadingRevision, setIsUploadingRevision] = useState(false);

  const fileInputRef = useRef(null);

  // Clear search error and reset revision state when active protocol changes
  useEffect(() => {
    setSearchError('');
    setIsRevisionSubmitted(false);
    setUploadedFile(null);
    setSelectedRawFile(null);
    setSelectedRevisionDoc(null);
  }, [currentProtocolId]);

  const revisionDoc = useMemo(
    () => protocol?.documents?.find((d) => d.statusType === 'revision') || protocol?.documents?.[0] || null,
    [protocol]
  );

  const effectiveRevisionDoc = selectedRevisionDoc || revisionDoc;

  const deficientDocsList = useMemo(
    () => protocol?.documents?.filter((d) => d.statusType === 'revision') || [],
    [protocol]
  );

  const handleDownloadDoc = (doc) => {
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, '_blank');
      return;
    }
    const docTitle = doc.title || 'document';
    const blob = new Blob([
      `MARIANO MARCOS STATE UNIVERSITY\nUniversity Research Ethics Review Board (URERB)\n\nProtocol ID: ${protocol?.protocolId}\nDocument: ${docTitle}\nVersion: ${doc.version || 'v1.0'}\nStatus: ${doc.status || 'Verified'}\nDate: ${doc.date || 'Recent'}`
    ], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.id || 'doc'}_${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedRawFile(file);
      const sizeFormatted =
        file.size < 1024 * 1024
          ? `${Math.max(1, Math.round(file.size / 1024))} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setUploadedFile({
        name: file.name,
        size: sizeFormatted,
        time: `Uploaded at ${timeStr}`,
        version: 'Revised',
      });
    }
  };

  const handleUploadRevisedClick = () => {
    if (!uploadedFile) return;
    setActiveModal('confirm');
  };

  const handleConfirmSubmission = () => {
    if (!uploadedFile) return;
    setActiveModal('success');
  };

  const handleDone = async () => {
    setIsRevisionSubmitted(true);
    setActiveModal(null);
    if (protocol && selectedRawFile) {
      setIsUploadingRevision(true);
      try {
        const docKey = effectiveRevisionDoc?.documentKey || 'form15';
        await protocolsApi.submitRevision(protocol.id, docKey, selectedRawFile);
        await fetchApplications();
      } catch (err) {
        console.error('Failed to submit revision to server:', err);
        alert(err.message || 'Failed to submit revision to server.');
      } finally {
        setIsUploadingRevision(false);
      }
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = searchInput.trim().toUpperCase();
    if (!query) return;

    const match = applications.find(
      (app) =>
        app.protocolId?.toUpperCase().includes(query) ||
        app.title?.toUpperCase().includes(query)
    );
    if (match) {
      setSearchParams({ id: match.protocolId });
      setSearchError('');
      setSearchInput('');
      return;
    }

    setSearchError(`No submitted protocol found matching "${searchInput}". Please check the ID or view all submissions in My Applications.`);
  };

  // Timeline step calculation
  const getProgressWidth = () => {
    if (!protocol) return '0%';
    if (protocol.activeStep === 5) return '100%';
    if (protocol.activeStep === 4) return '75%';
    if (protocol.activeStep === 3) return '50%';
    if (protocol.activeStep === 2) return '25%';
    return '10%';
  };

  if (!protocol) {
    return (
      <ResearcherLayout>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Application Tracking
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Track real-time review progress, requirements, and clearances for your submitted protocols.
            </p>
          </div>
          <Link
            to={ROUTES.RESEARCHER.MY_APPLICATIONS}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1e513b] hover:text-[#163f2e] transition-colors self-start md:self-end"
          >
            <span className="material-symbols-outlined text-[18px]">folder_open</span>
            <span>View All My Applications</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-2">
          <label htmlFor="protocol-search-input" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Track a Protocol
          </label>
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">
                search
              </span>
              <input
                id="protocol-search-input"
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (searchError) setSearchError('');
                }}
                placeholder="Enter Protocol ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#1e513b] text-white font-semibold text-sm shadow-xs hover:bg-[#163f2e] transition-colors shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              <span>Search</span>
            </button>
          </form>
          {searchError && (
            <div className="mt-2 pt-2.5 border-t border-gray-100 flex items-center gap-2 text-xs text-red-600">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{searchError}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-8 space-y-4 text-center">
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-full bg-[#eef5f0] border border-emerald-100 flex items-center justify-center text-[#1e513b] mb-3">
              <span className="material-symbols-outlined text-[24px]">manage_search</span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">No protocols available to track</h3>
            <p className="text-xs text-gray-500 max-w-sm mb-4 leading-relaxed">
              You have not submitted any research ethics protocols yet. Submit a new application to track its review milestones and clearance status in real time.
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
      </ResearcherLayout>
    );
  }

  return (
    <ResearcherLayout>
      {/* Page Title & Subtitle Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Application Tracking
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Track real-time review progress, requirements, and clearances for your submitted protocols.
          </p>
        </div>
        <Link
          to={ROUTES.RESEARCHER.MY_APPLICATIONS}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1e513b] hover:text-[#163f2e] transition-colors self-start md:self-end"
        >
          <span className="material-symbols-outlined text-[18px]">folder_open</span>
          <span>View All My Applications</span>
        </Link>
      </div>

      {/* Simple, Cohesive Search Protocol Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-2">
        <label htmlFor="protocol-search-input" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
          Track Another Protocol
        </label>
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] pointer-events-none">
              search
            </span>
            <input
              id="protocol-search-input"
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (searchError) setSearchError('');
              }}
              placeholder="Enter Protocol ID or research title..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b] transition-colors"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#1e513b] text-white font-semibold text-sm shadow-xs hover:bg-[#163f2e] transition-colors shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
            <span>Search</span>
          </button>
        </form>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-500 gap-1 pt-0.5">
          <span>Type or paste any Protocol ID to view its real-time review status and timeline.</span>
          <span className="font-mono text-[11px] text-gray-400">
            Currently tracking: <strong className="text-slate-700">{protocol.protocolId}</strong>
          </span>
        </div>

        {searchError && (
          <div className="mt-2 pt-2.5 border-t border-gray-100 flex items-center gap-2 text-xs text-red-600">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* 2. Active Protocol Header Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#1e513b] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              {protocol.protocolId}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">{protocol.reviewType}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            {protocol.title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Principal Investigator: <strong className="text-slate-700">{protocol.pi}</strong> · Submitted: {protocol.submittedDate}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {protocol.statusType === 'disapproved' ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs bg-red-100 text-red-800 font-semibold border border-red-200 shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-red-600">cancel</span>
              Protocol Disapproved
            </span>
          ) : protocol.statusType === 'revision' && !isRevisionSubmitted ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-red-100 text-red-700 font-semibold border border-red-200">
                <span className="material-symbols-outlined text-[16px] text-red-600">warning</span>
                Revision Required
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(uploadedFile ? 'confirm' : 'upload')}
                className="h-10 px-4 bg-[#1e513b] hover:bg-[#163f2e] text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>Submit Revision for Review</span>
              </button>
            </>
          ) : protocol.statusType === 'approved' ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-emerald-700">verified</span>
              Ethics Clearance Granted — Ready for Pickup
            </span>
          ) : protocol.statusType === 'verification' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <span className="material-symbols-outlined text-[16px] text-amber-600">fact_check</span>
              Verification Ongoing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
              <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
              Under Panel Review
            </span>
          )}
        </div>
      </div>

      {/* 3. Protocol Overview 4-Column Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="flex flex-col gap-1 sm:px-2 pt-2 sm:pt-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Protocol ID
            </span>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#1e513b] text-[18px]">fingerprint</span>
              <span className="text-sm font-semibold text-slate-900 font-mono">{protocol.protocolId}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:px-4 pt-3 sm:pt-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Principal Investigator
            </span>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">person</span>
              <span className="text-sm font-medium text-slate-900">{protocol.pi}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:px-4 pt-3 sm:pt-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Review Type
            </span>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">fact_check</span>
              <span className="text-sm font-medium text-slate-900">{protocol.reviewType}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:px-4 pt-3 sm:pt-0">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Submitted Date
            </span>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_today</span>
              <span className="text-sm font-medium text-slate-900">{protocol.submittedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Review Milestones Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1e513b] text-[20px]">linear_scale</span>
            <span>Review Milestones Timeline</span>
          </h2>
          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg border border-slate-200">
            {protocol.stepStatus}
          </span>
        </div>

        <div className="relative py-2 overflow-x-auto">
          <div className="min-w-[700px] flex items-start justify-between relative px-6">
            <div className="absolute top-[18px] left-[50px] right-[50px] h-[3px] bg-slate-100 -z-0">
              <div className="h-full bg-[#1e513b] transition-all duration-300" style={{ width: getProgressWidth() }} />
            </div>

            {/* Step 1 */}
            <div className="flex flex-col items-center text-center relative z-10 w-28">
              <div className="w-9 h-9 rounded-full bg-[#1e513b] text-white flex items-center justify-center shadow-xs ring-4 ring-white">
                <span className="material-symbols-outlined text-[18px]">check</span>
              </div>
              <span className="text-xs font-semibold text-slate-900 mt-2 leading-tight">1. Submission</span>
              <span className="text-[12px] text-[#1e513b] font-medium mt-0.5">Completed</span>
              <span className="font-mono text-[11px] text-slate-400">{protocol.submittedDate}</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center relative z-10 w-36">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-xs ring-4 ring-white ${protocol.activeStep >= 2 ? 'bg-[#1e513b] text-white' : 'bg-slate-100 text-slate-400'}`}>
                <span className="material-symbols-outlined text-[18px]">{protocol.activeStep > 2 ? 'check' : 'hourglass_empty'}</span>
              </div>
              <span className="text-xs font-semibold text-slate-900 mt-2 leading-tight">2. Secretariat Verification</span>
              <span className={`text-[12px] font-medium mt-0.5 ${protocol.activeStep >= 2 ? 'text-[#1e513b]' : 'text-slate-400'}`}>
                {protocol.activeStep > 2 ? 'Completed' : protocol.activeStep === 2 ? 'Active' : 'Pending'}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {protocol.activeStep > 2
                  ? protocol.verificationDate || protocol.submittedDate
                  : protocol.activeStep === 2
                  ? protocol.lastUpdateDate
                  : 'Pending'}
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center relative z-10 w-36">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-xs ring-4 ring-white ${protocol.activeStep >= 3 ? 'bg-[#1e513b] text-white' : 'bg-slate-100 text-slate-400'}`}>
                <span className="material-symbols-outlined text-[18px]">{protocol.activeStep > 3 ? 'check' : protocol.activeStep === 3 ? 'rate_review' : 'schedule'}</span>
              </div>
              <span className="text-xs font-semibold text-slate-900 mt-2 leading-tight">3. Panel Deliberation</span>
              <span className={`text-[12px] font-medium mt-0.5 ${protocol.activeStep >= 3 ? 'text-[#1e513b]' : 'text-slate-400'}`}>
                {protocol.activeStep > 3 ? 'Completed' : protocol.activeStep === 3 ? 'In Progress' : 'Pending'}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {protocol.activeStep > 3
                  ? protocol.deliberationDate || protocol.lastUpdateDate
                  : protocol.activeStep === 3
                  ? protocol.dueDate !== '—'
                    ? `Target: ${protocol.dueDate}`
                    : 'In Progress'
                  : 'Pending'}
              </span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center text-center relative z-10 w-36">
              {protocol.statusType === 'disapproved' ? (
                <>
                  <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center shadow-xs ring-4 ring-red-100/50">
                    <span className="material-symbols-outlined text-[20px] text-red-600 font-bold">cancel</span>
                  </div>
                  <span className="text-xs font-bold text-red-700 mt-2 leading-tight">4. Deliberation Result</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white uppercase font-bold">
                    Disapproved
                  </span>
                  <span className="font-mono text-[11px] text-red-600 font-semibold">{protocol.deliberationDate || 'Final'}</span>
                </>
              ) : protocol.statusType === 'revision' && !isRevisionSubmitted ? (
                <>
                  <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center shadow-xs ring-4 ring-red-100/50 animate-bounce">
                    <span className="material-symbols-outlined text-[20px] text-red-600 font-bold">priority_high</span>
                  </div>
                  <span className="text-xs font-bold text-red-700 mt-2 leading-tight">4. Revision Required</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white uppercase font-bold">
                    Active
                  </span>
                  <span className="font-mono text-[11px] text-red-600 font-semibold">{protocol.dueDate}</span>
                </>
              ) : protocol.activeStep >= 4 ? (
                <>
                  <div className="w-9 h-9 rounded-full bg-[#1e513b] text-white flex items-center justify-center shadow-xs ring-4 ring-white">
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-900 mt-2 leading-tight">4. Revisions Cleared</span>
                  <span className="text-[12px] text-[#1e513b] font-medium mt-0.5">Complied</span>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center ring-4 ring-white font-mono font-semibold">
                    4
                  </div>
                  <span className="text-xs font-medium text-slate-500 mt-2 leading-tight">4. Revisions</span>
                  <span className="text-[12px] text-slate-400 mt-0.5">If Required</span>
                </>
              )}
            </div>

            {/* Step 5 */}
            <div className={`flex flex-col items-center text-center relative z-10 w-36 ${protocol.activeStep === 5 ? '' : 'opacity-60'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ring-4 ring-white font-mono font-semibold ${protocol.statusType === 'disapproved' ? 'bg-red-50 text-red-500 border border-red-200' : protocol.activeStep === 5 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                {protocol.statusType === 'disapproved' ? <span className="material-symbols-outlined text-[18px]">block</span> : protocol.activeStep === 5 ? <span className="material-symbols-outlined text-[18px]">verified</span> : '5'}
              </div>
              <span className={`text-xs mt-2 leading-tight font-semibold ${protocol.statusType === 'disapproved' ? 'text-red-700' : protocol.activeStep === 5 ? 'text-emerald-800' : 'text-slate-600'}`}>
                {protocol.statusType === 'disapproved' ? 'Clearance Denied' : '5. Ethics Clearance'}
              </span>
              <span className="text-[12px] text-slate-500 mt-0.5">
                {protocol.statusType === 'disapproved' ? 'Non-Compliant' : protocol.activeStep === 5 ? 'Certificate Ready' : 'Upcoming'}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {protocol.statusType === 'disapproved' ? 'Archived' : protocol.activeStep === 5 ? 'Claim at Office' : 'Final Issuance'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Status Specific Callout Blocks */}

      {/* Disapproved Block */}
      {protocol.statusType === 'disapproved' && (
        <div className="bg-white border-2 border-red-300 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-red-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">gpp_bad</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Protocol Evaluation Disposition: Disapproved
                </h3>
                <p className="text-xs text-slate-500">
                  Ethics Clearance Denied by URERB Committee
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 text-red-700 font-medium text-xs border border-red-200">
              <span className="material-symbols-outlined text-[16px]">event_busy</span>
              <span>Decision Date: <strong className="font-bold">{protocol.deliberationDate || protocol.lastUpdateDate || 'Completed'}</strong></span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-2">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-700">campaign</span>
              <span>Review Panel Disposition &amp; Ethical Justification:</span>
            </div>
            <blockquote className="text-xs sm:text-sm text-slate-800 font-medium italic border-l-4 border-red-600 pl-3 py-1.5 bg-white rounded-r-lg">
              {protocol.remarks || 'This research protocol has been evaluated and does not satisfy the ethical requirements stipulated under the Philippine Health Research Ethics Board (PHREB) National Ethical Guidelines.'}
            </blockquote>
            <p className="text-xs text-slate-600 leading-relaxed">
              Research activities involving human participants or protected communities may not proceed under this protocol.
            </p>
          </div>

          {/* List of Specific Non-Compliant / Deficient Forms */}
          {deficientDocsList.length > 0 && (
            <div className="space-y-2 mt-1">
              <span className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-red-600">warning</span>
                Non-Compliant Forms Flagged by Reviewer ({deficientDocsList.length}):
              </span>
              <div className="grid grid-cols-1 gap-2">
                {deficientDocsList.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-lg bg-red-50/70 border border-red-200 text-xs"
                  >
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-red-600">description</span>
                      <span className="truncate">{d.title}</span>
                    </div>
                    <p className="text-[11px] text-red-800 mt-1 pl-5 leading-snug">
                      <strong>Deficiency / Reason:</strong> {d.issueText || 'Failed compliance criteria.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">What are my next steps?</div>
            <p className="text-[11px] leading-relaxed">
              If you wish to submit an appeal or file a substantially revised study protocol, please consult the URERB Secretariat Office or review the National Ethical Guidelines for Health and Health-Related Research.
            </p>
          </div>
        </div>
      )}

      {/* Revision Required Block */}
      {protocol.statusType === 'revision' && !isRevisionSubmitted && (
        <div className="bg-white border-2 border-red-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-red-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">rate_review</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {deficientDocsList.length > 1
                  ? `Action Required: Revise ${deficientDocsList.length} Deficient Forms`
                  : effectiveRevisionDoc
                  ? `Action Required: Revise ${effectiveRevisionDoc.title}`
                  : 'Action Required: Compliance Revision'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 text-red-700 font-medium text-xs">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>Due Date: <strong className="font-bold">{protocol.dueDate}</strong> ({protocol.daysRemaining})</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-2">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#1e513b]">campaign</span>
              <span>{protocol.reviewer}:</span>
            </div>
            <blockquote className="text-xs sm:text-sm text-slate-800 font-medium italic border-l-4 border-red-500 pl-3 py-1 bg-white rounded-r-lg">
              {protocol.remarks}
            </blockquote>
            <p className="text-xs text-slate-600 leading-relaxed">
              Please address the Secretariat / Committee remarks above and re-upload the corrected forms.
            </p>
          </div>

          {/* List of Specific Deficient Forms */}
          {deficientDocsList.length > 0 && (
            <div className="space-y-2 mt-1">
              <span className="text-xs font-bold text-red-950 block">
                Specific Forms Requiring Revision ({deficientDocsList.length}):
              </span>
              <div className="grid grid-cols-1 gap-2">
                {deficientDocsList.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded-lg bg-red-50/60 border border-red-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-red-600">warning</span>
                        <span className="truncate">{d.title}</span>
                      </div>
                      <p className="text-[11px] text-red-700 mt-1 pl-5 leading-snug">
                        {d.issueText || 'Specific correction or re-upload required.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRevisionDoc(d);
                        setActiveModal('upload');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white border border-red-300 hover:bg-red-50 text-red-800 font-semibold text-xs transition-colors shrink-0 cursor-pointer self-start sm:self-center"
                    >
                      <span className="material-symbols-outlined text-[15px]">upload_file</span>
                      <span>Re-upload this form</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-600">
              Once updated, attach the new file version and confirm your compliance response.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedRevisionDoc(deficientDocsList[0] || null);
                setActiveModal('upload');
              }}
              className="h-9 px-4 bg-[#1e513b] hover:bg-[#163f2e] text-white rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-xs font-semibold cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload Revised Document</span>
            </button>
          </div>
        </div>
      )}

      {/* Review in Progress Block */}
      {protocol.statusType === 'review' && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-blue-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Panel Deliberation in Progress</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium text-xs">
              <span className="material-symbols-outlined text-[16px]">event</span>
              <span>Review Target: <strong className="font-bold">{protocol.dueDate}</strong></span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-2">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#1e513b]">campaign</span>
              <span>{protocol.reviewer}:</span>
            </div>
            <blockquote className="text-xs sm:text-sm text-slate-800 font-medium italic border-l-4 border-blue-500 pl-3 py-1 bg-white rounded-r-lg">
              {protocol.remarks}
            </blockquote>
            <p className="text-xs text-slate-600 leading-relaxed">
              No researcher action is required at this stage. You will be notified automatically if panel members submit clarification queries or approval sign-offs.
            </p>
          </div>
        </div>
      )}

      {/* Clearance Granted Block */}
      {protocol.statusType === 'approved' && (
        <div className="bg-white border-2 border-emerald-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Ethics Clearance Officially Issued</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium text-xs border border-emerald-200">
              <span className="material-symbols-outlined text-[16px]">apartment</span>
              <span>Ready for In-Person Claiming</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-2.5">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#1e513b]">location_on</span>
              <span>Official Claiming Location &amp; Instructions:</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              In adherence to PHREB and URERB Standard Operating Procedures, the Certificate of Ethics Clearance is issued exclusively as an embossed physical hard copy bearing the official dry seal and signatures of the Panel Chair and Secretariat.
            </p>
            <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-3 space-y-1">
              <div><strong>Office Location:</strong> URERB Secretariat Office, 2nd Floor ITC Building, MMSU Main Campus, Batac City</div>
              <div><strong>Claiming Hours:</strong> Monday to Friday, 8:00 AM – 5:00 PM (excluding holidays)</div>
              <div><strong>Identification:</strong> Present your valid MMSU Faculty / Employee / Student ID upon claiming.</div>
            </div>
          </div>
        </div>
      )}

      {/* Secretariat Intake Verification Block */}
      {protocol.statusType === 'verification' && (
        <div className="bg-white border-2 border-amber-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">fact_check</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">Secretariat Document Completeness Intake</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 font-medium text-xs">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>Target: <strong className="font-bold">{protocol.dueDate}</strong></span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col gap-2">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#1e513b]">campaign</span>
              <span>{protocol.reviewer}:</span>
            </div>
            <blockquote className="text-xs sm:text-sm text-slate-800 font-medium italic border-l-4 border-amber-500 pl-3 py-1 bg-white rounded-r-lg">
              {protocol.remarks}
            </blockquote>
            <p className="text-xs text-slate-600 leading-relaxed">
              The Secretariat is verifying uploaded Forms 15, 16, 17, and endorsement signatures before formal assignment to the ethics panel.
            </p>
          </div>
        </div>
      )}

      {/* 6. Associated Documents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1e513b] text-[20px]">folder</span>
            <h3 className="text-sm font-bold text-slate-900">Associated Protocol Documents</h3>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {protocol.documents.length} Documents Linked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-4" scope="col">Document Name</th>
                <th className="py-2.5 px-4" scope="col">Version</th>
                <th className="py-2.5 px-4" scope="col">Date</th>
                <th className="py-2.5 px-4" scope="col">Review Status</th>
                <th className="py-2.5 px-4 text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {protocol.documents.map((doc) => (
                <tr
                  key={doc.id}
                  className={doc.statusType === 'revision' && !isRevisionSubmitted ? 'bg-red-50/30 hover:bg-red-50/50 transition-colors' : 'hover:bg-slate-50/70 transition-colors'}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className={`material-symbols-outlined text-[20px] ${doc.statusType === 'revision' && !isRevisionSubmitted ? 'text-red-600' : 'text-[#1e513b]'}`}>
                        {doc.statusType === 'revision' && !isRevisionSubmitted ? 'assignment_late' : 'description'}
                      </span>
                      <div>
                        <p className={`font-semibold ${doc.statusType === 'revision' && !isRevisionSubmitted ? 'text-red-800' : 'text-slate-900'}`}>
                          {doc.title}
                        </p>
                        <p className="text-[11px] text-slate-500">{doc.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {isRevisionSubmitted && uploadedFile && revisionDoc && doc.id === revisionDoc.id
                      ? uploadedFile.version
                      : doc.version}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">{doc.date}</td>
                  <td className="py-3 px-4">
                    {doc.statusType === 'approved' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                        <span className="material-symbols-outlined text-[13px]">check</span>
                        Approved
                      </span>
                    ) : doc.statusType === 'revision' && !isRevisionSubmitted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-red-100 text-red-700 font-semibold border border-red-200">
                        <span className="material-symbols-outlined text-[13px] text-red-600">warning</span>
                        Revision Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                        <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
                        Under Review
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      {doc.statusType === 'revision' && !isRevisionSubmitted && (
                        <button
                          onClick={() => {
                            setSelectedRevisionDoc(doc);
                            setActiveModal('upload');
                          }}
                          className="p-1.5 hover:bg-red-100 rounded text-slate-500 hover:text-red-700 transition-colors cursor-pointer"
                          title="Upload Revision"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">upload_file</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="View Document"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button
                        onClick={() => handleDownloadDoc(doc)}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Download Document"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Upload Revised Document */}
      {activeModal === 'upload' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Upload Revised Document</h2>
                <p className="text-xs text-slate-500 mt-0.5">Upload the revised version of the document requested by the reviewer.</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3.5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 text-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Protocol ID:</span>
                  <span className="font-mono font-semibold text-[#1e513b]">{protocol.protocolId}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium shrink-0">Document:</span>
                  <span className="font-medium text-slate-900 text-right truncate">
                    {effectiveRevisionDoc?.title || 'Protocol Revision Document'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Current Version:</span>
                  <span className="font-mono text-slate-600">{effectiveRevisionDoc?.version || 'v1.0'}</span>
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-slate-200/60 pt-1.5 mt-0.5">
                  <span className="text-slate-500 font-medium shrink-0">Required Revision:</span>
                  <span className="font-medium text-red-600 text-right line-clamp-2">
                    {effectiveRevisionDoc?.issueText || protocol.remarks}
                  </span>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#1e513b]/40 bg-[#1e513b]/5 hover:bg-[#1e513b]/10 rounded-lg p-5 text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#1e513b]/10 flex items-center justify-center text-[#1e513b] mb-1">
                  <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 font-medium">
                  <span className="text-[#1e513b] underline cursor-pointer">Choose revised document</span> or drag &amp; drop
                </p>
                <p className="text-[11px] text-slate-500">PDF or DOCX, maximum 10 MB</p>
              </div>

              {uploadedFile && (
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#1e513b]/10 text-[#1e513b] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">description</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {uploadedFile.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                          {uploadedFile.version}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">
                        {uploadedFile.size} · {uploadedFile.time}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[#1e513b] shrink-0 pl-2">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 italic">
                * Uploading this file does not submit your revision for review.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!uploadedFile}
                onClick={handleUploadRevisedClick}
                className="px-4 py-2 rounded-lg bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Upload Revised Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Submit Revision Confirmation */}
      {activeModal === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200/80 max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#1e513b] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">help_outline</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">Submit Revision for Review?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Your revised document will be sent to the URERB for another review.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 my-4 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between py-0.5 border-b border-slate-200/50">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[11px]">Application ID</span>
                <span className="font-semibold font-mono text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {protocol.protocolId}
                </span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-b border-slate-200/50 gap-3">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[11px] shrink-0">Document</span>
                <span className="font-medium text-slate-800 text-xs sm:text-sm text-right truncate">
                  {uploadedFile?.name || effectiveRevisionDoc?.title || 'Revised Protocol Document'}
                </span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-b border-slate-200/50">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[11px]">Version</span>
                <span className="font-semibold font-mono text-xs text-slate-800">
                  {uploadedFile?.version || 'Revised'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[11px]">Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Ready for Review
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-500 mb-5 px-1 leading-relaxed">
              <span className="material-symbols-outlined text-[16px] text-slate-400 mt-0.5 shrink-0">info</span>
              <span>Once submitted, editing of the revised document will be temporarily locked while the Secretariat and Panel verify your compliance revisions.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmission}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1e513b] hover:bg-[#163f2e] rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Confirm Submission</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Revision Submitted Successfully */}
      {activeModal === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200/80 max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#1e513b] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">check_circle</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">Revision Submitted Successfully</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Your revised document has been submitted to the URERB for review.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDone}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 my-4 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[11px]">Application ID</span>
                <span className="font-semibold font-mono text-xs text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {protocol.protocolId}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/50 gap-3">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[11px] shrink-0">Document</span>
                <span className="font-medium text-slate-800 text-xs sm:text-sm text-right truncate">
                  {uploadedFile?.name || effectiveRevisionDoc?.title || 'Revised Protocol Document'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[11px]">Current Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                  Under Review
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-500 mb-5 px-1 leading-relaxed">
              <span className="material-symbols-outlined text-[16px] text-[#1e513b] mt-0.5 shrink-0">verified</span>
              <span>URERB Secretariat has been notified. You can track progress and evaluator feedback from your Protocol Tracking dashboard.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleDone}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white bg-[#1e513b] hover:bg-[#163f2e] rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Reader / Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </ResearcherLayout>
  );
}
