import React, { useState } from 'react';

export default function DocumentViewer({
  protocol,
  activeDoc,
  currentPage = 1,
  totalPages,
  onPageChange,
  isLocked = false,
}) {
  const [internalPage, setInternalPage] = useState(currentPage);
  const [zoomLevel, setZoomLevel] = useState(100);
  const page = onPageChange ? currentPage : internalPage;

  const fileNameOrPath = activeDoc?.fileName || activeDoc?.name || activeDoc?.fileUrl || '';
  const detectedExt = fileNameOrPath.includes('.')
    ? fileNameOrPath.split('.').pop().split('?')[0].toUpperCase()
    : '';
  const rawType = (activeDoc?.type || '').toUpperCase();
  const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(rawType) || ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(detectedExt);
  const isPdf = !isImage && (rawType === 'PDF' || detectedExt === 'PDF' || !['DOC', 'DOCX', 'XLS', 'XLSX'].includes(detectedExt));
  const fileUrl = activeDoc?.fileUrl;
  const downloadUrl = activeDoc?.downloadUrl || activeDoc?.fileUrl;

  const handlePrev = () => {
    const newPage = Math.max(1, page - 1);
    if (onPageChange) onPageChange(newPage);
    else setInternalPage(newPage);
  };

  const handleNext = () => {
    const newPage = totalPages ? Math.min(totalPages, page + 1) : page + 1;
    if (onPageChange) onPageChange(newPage);
    else setInternalPage(newPage);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(150, prev + 10));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(70, prev - 10));
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const a = window.document.createElement('a');
      a.href = downloadUrl;
      a.download = activeDoc?.fileName || activeDoc?.name || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      return;
    }

    const filename = `${protocol?.protocolCode || 'Protocol'}-${activeDoc?.name || 'Document'}.pdf`;
    const blob = new Blob([`URERB Institutional Protocol Document: ${filename}`], {
      type: 'application/pdf',
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col h-full">
      {/* Top Document Toolbar */}
      <div className="p-3 sm:px-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[#1e513b] text-[19px]">
            description
          </span>
          <span className="font-bold text-slate-900 truncate">
            {activeDoc?.name || 'Submitted Protocol Document'}
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pagination */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={handlePrev}
              disabled={page <= 1}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white rounded disabled:opacity-30 transition-colors cursor-pointer"
              title="Previous Page"
            >
              ← Prev
            </button>
            {totalPages ? (
              <span className="font-semibold text-slate-800 px-2 text-xs">
                Page {page} of {totalPages}
              </span>
            ) : (
              <div className="flex items-center gap-1.5 px-2">
                <span className="text-slate-500 font-medium text-xs">Page</span>
                <input
                  type="number"
                  min="1"
                  value={page}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1) {
                      if (onPageChange) onPageChange(val);
                      else setInternalPage(val);
                    }
                  }}
                  className="w-12 text-center text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded py-0.5 focus:outline-none focus:border-[#1e513b] focus:ring-1 focus:ring-[#1e513b]"
                  title="Jump to Page"
                />
              </div>
            )}
            <button
              onClick={handleNext}
              disabled={totalPages ? page >= totalPages : false}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white rounded disabled:opacity-30 transition-colors cursor-pointer"
              title="Next Page"
            >
              Next →
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 shadow-2xs">
            <button
              onClick={handleZoomOut}
              className="hover:text-slate-900 px-1 font-bold cursor-pointer"
              title="Zoom Out"
            >
              −
            </button>
            <span className="text-[11px] font-mono px-1 font-medium">{zoomLevel}%</span>
            <button
              onClick={handleZoomIn}
              className="hover:text-slate-900 px-1 font-bold cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <span className="text-slate-300 mx-0.5">|</span>
            <button
              onClick={() => setZoomLevel(100)}
              className="material-symbols-outlined text-[15px] hover:text-slate-900 cursor-pointer"
              title="Reset Zoom"
            >
              fit_screen
            </button>
          </div>

          {/* Open in Tab Button */}
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs shadow-2xs transition-colors"
              title="Open document in a separate browser tab"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              <span>Open in Tab</span>
            </a>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Realistic Document Paper Canvas or Embedded Viewer */}
      <div className="flex-1 p-4 sm:p-6 bg-slate-100/70 overflow-y-auto max-h-[620px]">
        {fileUrl ? (
          isPdf ? (
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full h-[580px] bg-white rounded shadow border border-slate-300 overflow-hidden transition-transform duration-150"
            >
              <iframe
                key={`${fileUrl}-${page}`}
                src={`${fileUrl}#page=${page}`}
                title={activeDoc?.name || 'Protocol PDF Preview'}
                className="w-full h-full border-0"
              />
            </div>
          ) : isImage ? (
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="bg-white border border-slate-300 rounded shadow p-4 max-w-2xl mx-auto flex items-center justify-center transition-transform duration-150"
            >
              <img
                src={fileUrl}
                alt={activeDoc?.name || 'Protocol Document'}
                className="max-h-[540px] max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-xs text-center space-y-4 max-w-md mx-auto my-12">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[32px]">draft</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{activeDoc?.name}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Word / DOCX format is attached. Download the file to review full protocol text and inline track changes.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-[#1e513b] text-white text-xs font-semibold rounded-lg hover:bg-[#163f2e] inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Download Document ({activeDoc?.size || 'DOCX'})</span>
              </button>
            </div>
          )
        ) : (
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="bg-white border border-slate-300 rounded shadow-md p-6 sm:p-8 max-w-2xl mx-auto font-sans text-slate-900 text-xs leading-relaxed space-y-4 transition-transform duration-150"
          >
            {/* Official MMSU Institutional Form Header */}
            <div className="border border-slate-800 p-2 sm:p-3">
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2 flex items-center justify-center">
                  <img
                    src="/logos/mmsu-seal.png"
                    alt="MMSU Seal"
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div className="col-span-7 text-center border-l border-r border-slate-300 px-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
                    MARIANO MARCOS STATE UNIVERSITY
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 leading-tight">
                    University Research Ethics Review Board
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 tracking-tight uppercase">
                    {activeDoc?.name || 'PROTOCOL SUBMISSION DOCUMENT'}
                  </div>
                </div>
                <div className="col-span-3 text-[9px] font-mono space-y-0.5 text-slate-600 border-l border-slate-300 pl-2">
                  <div>Version: <span className="font-bold text-slate-900">{activeDoc?.version || 'v1.0'}</span></div>
                  <div>Type: <span className="font-bold text-slate-900">{activeDoc?.type || 'PDF'}</span></div>
                  <div>Page: <span className="font-bold text-slate-900">{page} of {totalPages}</span></div>
                  <div>Submitted: <span className="font-bold text-slate-900">{protocol?.submittedDate || protocol?.dateSubmitted || '—'}</span></div>
                </div>
              </div>
            </div>

            {/* Form Identification Table */}
            <div className="border border-slate-400 divide-y divide-slate-400 text-[11px]">
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 p-2 bg-slate-50 font-bold text-slate-800">
                  URERB Protocol Code:
                  <span className="block text-[9px] font-normal text-slate-500">
                    (assigned by URERB Secretariat)
                  </span>
                </div>
                <div className="col-span-7 p-2 font-mono font-bold text-slate-900 flex items-center">
                  {protocol?.protocolCode || '—'}
                </div>
              </div>
              <div className="grid grid-cols-12 divide-x divide-slate-400">
                <div className="col-span-5 p-2 bg-slate-50 font-bold text-slate-800">
                  Study Protocol Title:
                </div>
                <div className="col-span-7 p-2 text-slate-900 font-medium">
                  {protocol?.title || '—'}
                </div>
              </div>
            </div>

            {/* Page Details */}
            {page === 1 && (
              <div className="space-y-3 pt-2">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px]">
                  Part A: Protocol &amp; Document Overview
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1.5">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-800 block">Principal Investigator</span>
                      <span className="text-slate-600">{protocol?.pi || '—'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">Academic Unit</span>
                      <span className="text-slate-600">{protocol?.college || protocol?.academicUnit || '—'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">Review Track</span>
                      <span className="text-slate-600">{protocol?.track || protocol?.reviewTrack || '—'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">Assigned Panel</span>
                      <span className="text-slate-600">{protocol?.panel || protocol?.panelName || 'Panel Review'}</span>
                    </div>
                  </div>
                  {activeDoc && (
                    <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-800">Active Attachment:</span>{' '}
                      {activeDoc.name}
                      {activeDoc.subtext ? ` (${activeDoc.subtext})` : ''}
                    </div>
                  )}
                </div>
              </div>
            )}

            {page === 2 && (
              <div className="space-y-3 pt-2">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px]">
                  Part B: Recorded Findings &amp; Observations (Page 2)
                </div>
                {protocol?.findings?.filter((f) => Number(f.page) === 2).length > 0 ? (
                  protocol.findings
                    .filter((f) => Number(f.page) === 2)
                    .map((finding, idx) => (
                      <div
                        key={finding.id || idx}
                        className="p-3 bg-amber-50/90 rounded border border-amber-300 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-amber-600">
                              rate_review
                            </span>
                            {finding.section}
                          </span>
                          <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            Finding Recorded
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px]">{finding.content || finding.text}</p>
                      </div>
                    ))
                ) : (
                  <div className="p-4 bg-slate-50 rounded border border-slate-200 text-slate-500 text-center">
                    No reviewer findings recorded for Page 2 of{' '}
                    <span className="font-semibold text-slate-700">
                      {activeDoc?.name || 'this document'}
                    </span>
                    .
                  </div>
                )}
              </div>
            )}

            {page === 3 && (
              <div className="space-y-3 pt-2">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px]">
                  Part C: Recorded Findings &amp; Endorsements (Page 3)
                </div>
                {protocol?.findings?.filter((f) => Number(f.page) >= 3).length > 0 ? (
                  protocol.findings
                    .filter((f) => Number(f.page) >= 3)
                    .map((finding, idx) => (
                      <div
                        key={finding.id || idx}
                        className="p-3 bg-amber-50/90 rounded border border-amber-300 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-amber-600">
                              rate_review
                            </span>
                            Page {finding.page} · {finding.section}
                          </span>
                          <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            Finding Recorded
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px]">{finding.content || finding.text}</p>
                      </div>
                    ))
                ) : (
                  <div className="p-4 bg-slate-50 rounded border border-slate-200 text-slate-500 text-center">
                    No reviewer findings recorded for Page 3 of{' '}
                    <span className="font-semibold text-slate-700">
                      {activeDoc?.name || 'this document'}
                    </span>
                    .
                  </div>
                )}
              </div>
            )}

            {/* Footer note */}
            <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Mariano Marcos State University · University Research Ethics Review Board</span>
              <span>PHREB Accredited Level 2</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
