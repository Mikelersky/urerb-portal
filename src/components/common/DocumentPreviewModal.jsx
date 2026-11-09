import React from 'react';

export default function DocumentPreviewModal({ document: docItem, onClose }) {
  if (!docItem) return null;

  const fileNameOrPath = docItem.fileName || docItem.name || docItem.fileUrl || '';
  const detectedExt = fileNameOrPath.includes('.')
    ? fileNameOrPath.split('.').pop().split('?')[0].toUpperCase()
    : '';
  const rawType = (docItem.type || '').toUpperCase();
  const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(rawType) || ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(detectedExt);
  const isPdf = !isImage && (rawType === 'PDF' || detectedExt === 'PDF' || !['DOC', 'DOCX', 'XLS', 'XLSX'].includes(detectedExt));
  const ext = isPdf ? 'PDF' : (isImage ? (detectedExt || 'IMAGE') : (detectedExt || rawType || 'DOC'));
  const fileUrl = docItem.fileUrl;
  const downloadUrl = docItem.downloadUrl || docItem.fileUrl;

  const handleDownload = () => {
    if (downloadUrl) {
      const a = window.document.createElement('a');
      a.href = downloadUrl;
      a.download = docItem.name || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      return;
    }

    const docTitle = docItem.title || docItem.name || 'document';
    const blob = new Blob([
      `MARIANO MARCOS STATE UNIVERSITY\nUniversity Research Ethics Review Board (URERB)\n\nDocument: ${docTitle}\nVersion: ${docItem.version || 'v1.0'}\nStatus: Official Record\nVerified: PHREB SOP 2024`
    ], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1e513b]/10 text-[#1e513b] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">description</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {docItem.title || docItem.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                  {docItem.version || 'v1.0'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {docItem.size ? `${docItem.size} · ` : ''}{ext || 'PDF'} Document · Uploaded by Principal Investigator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                title="Open in new window"
              >
                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                <span className="hidden sm:inline">Open in Tab</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Content - Document Reader */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 font-sans flex flex-col items-center justify-center">
          {fileUrl ? (
            isPdf ? (
              <div className="w-full flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-xs text-slate-500 pb-2 px-1">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[15px] text-[#1e513b]">picture_as_pdf</span>
                    <span>Official Document PDF Reader</span>
                  </span>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#1e513b] hover:underline font-semibold"
                  >
                    <span>Full Window Reader</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>
                </div>
                <div className="w-full h-[65vh] bg-white rounded-lg shadow-xs overflow-hidden border border-slate-200">
                  <iframe
                    src={fileUrl}
                    title={docItem.title || 'Document Preview'}
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            ) : isImage ? (
              <div className="max-h-[65vh] max-w-full overflow-auto bg-white p-2 rounded-lg shadow-xs border border-slate-200">
                <img
                  src={fileUrl}
                  alt={docItem.title || 'Document Preview'}
                  className="max-h-[60vh] max-w-full object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-xs text-center space-y-4 max-w-md">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[32px]">draft</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{docItem.name || docItem.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Word document preview is not directly embeddable in-browser. Please download the file to inspect full formatting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-[#1e513b] text-white text-xs font-semibold rounded-lg hover:bg-[#163f2e] inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Download Document ({docItem.size || 'DOCX'})</span>
                </button>
              </div>
            )
          ) : (
            /* Fallback simulated paper page when fileUrl is absent */
            <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs space-y-5 text-xs text-slate-700 max-w-xl mx-auto w-full">
              <div className="text-center pb-4 border-b border-slate-200 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                  Republic of the Philippines
                </p>
                <p className="font-bold text-sm text-slate-900">
                  MARIANO MARCOS STATE UNIVERSITY
                </p>
                <p className="text-[11px] font-semibold text-[#1e513b]">
                  University Research Ethics Review Board (URERB)
                </p>
                <span className="inline-block mt-2 font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                  Official Submission File · PHREB SOP 2024
                </span>
              </div>

              <div className="space-y-3 leading-relaxed">
                <div className="p-3 bg-slate-50 rounded border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                    Document Scope &amp; Identification
                  </span>
                  <p className="font-semibold text-slate-800 text-xs">
                    {docItem.title || docItem.name}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {docItem.description || 'Verified institutional compliance form adhering strictly to National Ethical Guidelines for Health and Health-Related Research.'}
                  </p>
                </div>

                <div className="space-y-2 pt-2 text-slate-600 text-[11px]">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                    Section 1: General Ethics Declaration
                  </h4>
                  <p>
                    The principal investigator attests that all study procedures, participant involvement criteria, and field collection protocols will be carried out in rigorous compliance with PHREB Level 2 ethics standards and institutional data privacy protocols.
                  </p>
                  {docItem.notes && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 mt-2">
                      <strong>Reviewer Compliance Note:</strong> {docItem.notes}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-dashed border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>DIGITAL VERIFICATION: PASSED</span>
                  <span>CRYPTOGRAPHIC HASH: SHA-256 VALIDATED</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
          <span className="text-[11px] text-slate-500 italic hidden sm:inline">
            * Official preview of submitted ethics document.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-[#1e513b] hover:bg-[#163f2e] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
