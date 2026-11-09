import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export default function DocumentsModal({ isOpen, onClose, protocol, onViewDocument }) {
  const navigate = useNavigate();
  if (!isOpen || !protocol) return null;

  const handleOpenDoc = (doc) => {
    if (onViewDocument) {
      onViewDocument(doc);
    } else {
      navigate(`${ROUTES.REVIEWER.REVIEW_WORKSPACE}?id=${protocol.protocolCode}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 relative">
        {/* Header with Title and Close Button */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Submitted Protocol Documents
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Documents submitted for Protocol {protocol.protocolCode}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Protocol Context Banner Card */}
        <div className="mt-4 p-4 rounded-xl bg-[#f5f3ff]/60 border border-indigo-100/80">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span className="text-xs font-mono font-bold text-indigo-950 bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200/60">
              {protocol.protocolCode}
            </span>
            <span className="text-xs font-semibold text-indigo-800 bg-white/80 px-2 py-0.5 rounded border border-indigo-200/80 shadow-2xs">
              {protocol.track}
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 leading-snug">
            {protocol.title}
          </h4>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Principal Investigator: <span className="font-semibold text-slate-800">{protocol.pi}</span>
          </p>
        </div>

        {/* Documents List */}
        <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {protocol.documents?.map((doc) => {
            const docType = (doc.type || '').toLowerCase();
            const docName = (doc.name || doc.title || '').toLowerCase();
            const isZip = docType.includes('zip');
            const isCert = docName.includes('endorsement') || docName.includes('clearance');
            
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      {isZip ? 'folder_zip' : isCert ? 'verified' : 'description'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                      {doc.name}
                    </h5>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {[doc.type, doc.size, doc.uploadedDate ? `Uploaded ${doc.uploadedDate}` : ''].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 ml-3">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                    Submitted
                  </span>
                  <button
                    onClick={() => handleOpenDoc(doc)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
