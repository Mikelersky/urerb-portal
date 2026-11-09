import React from 'react';

export default function ReviewDetailsModal({ isOpen, onClose, review }) {
  if (!isOpen || !review) return null;

  const getRecommendationBadgeStyle = (rec) => {
    const text = (rec || '').toLowerCase();
    if (text.includes('approv')) {
      return {
        badge: 'bg-[#dcfce7] border-[#bbf7d0] text-[#166534]',
        icon: 'text-[#16a34a]',
        iconName: 'check_circle',
      };
    }
    if (text.includes('disapprov') || text.includes('reject')) {
      return {
        badge: 'bg-[#ffe4e6] border-[#fecdd3] text-[#9f1239]',
        icon: 'text-[#e11d48]',
        iconName: 'cancel',
      };
    }
    if (text.includes('major')) {
      return {
        badge: 'bg-[#ffedd5] border-[#fed7aa] text-[#9a3412]',
        icon: 'text-[#ea580c]',
        iconName: 'warning',
      };
    }
    if (text.includes('minor') || text.includes('revis') || text.includes('modifi')) {
      return {
        badge: 'bg-[#fef9c3] border-[#fef08a] text-[#854d0e]',
        icon: 'text-[#ca8a04]',
        iconName: 'rate_review',
      };
    }
    return {
      badge: 'bg-slate-100 border-slate-200 text-slate-800',
      icon: 'text-slate-600',
      iconName: 'rate_review',
    };
  };

  const getDecisionBadgeStyle = (dec) => {
    const text = (dec || '').toLowerCase();
    if (text.includes('approv') || text.includes('cleared')) {
      return {
        badge: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        icon: 'text-emerald-600',
        iconName: 'verified',
      };
    }
    if (text.includes('disapprov') || text.includes('reject')) {
      return {
        badge: 'bg-rose-50 border-rose-200 text-rose-800',
        icon: 'text-rose-600',
        iconName: 'block',
      };
    }
    if (text.includes('revis')) {
      return {
        badge: 'bg-amber-50 border-amber-200 text-amber-800',
        icon: 'text-amber-600',
        iconName: 'pending_actions',
      };
    }
    return {
      badge: 'bg-slate-50 border-slate-200 text-slate-800',
      icon: 'text-slate-600',
      iconName: 'gavel',
    };
  };

  const getProtocolCodeColor = (decisionType) => {
    switch (decisionType) {
      case 'approved':
        return 'text-emerald-800';
      case 'disapproved':
        return 'text-rose-800';
      case 'revision':
        return 'text-amber-800';
      default:
        return 'text-slate-900';
    }
  };

  const recStyle = getRecommendationBadgeStyle(review.recommendationBadge || review.recommendation);
  const decStyle = getDecisionBadgeStyle(review.finalDecision);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Review Details
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#eef2f9] text-slate-700 border border-slate-200/90 shadow-2xs">
                <span className="material-symbols-outlined text-[14px] text-slate-500">
                  lock
                </span>
                <span>Read-only — Review Submitted</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only — Review already submitted
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Top Protocol Summary Card */}
          <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                RESEARCH TITLE
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {review.title}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  PROTOCOL ID
                </span>
                <span className={`font-mono font-bold ${getProtocolCodeColor(review.decisionType)}`}>
                  {review.protocolCode}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  PRINCIPAL INVESTIGATOR
                </span>
                <span className="font-semibold text-slate-800">
                  {review.pi}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  REVIEW TRACK
                </span>
                <span className="text-slate-700 font-medium">
                  {review.track}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  DATE SUBMITTED
                </span>
                <span className="font-mono text-slate-700">
                  {review.dateSubmitted}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Reviewer Recommendation & Final Board Decision */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                REVIEWER RECOMMENDATION
              </span>
              <div className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg font-bold text-xs shadow-2xs ${recStyle.badge}`}>
                <span className={`material-symbols-outlined text-[17px] ${recStyle.icon}`}>
                  {recStyle.iconName}
                </span>
                <span>{review.recommendationBadge || review.recommendation}</span>
              </div>
            </div>

            {review.finalDecision && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  FINAL URERB DECISION
                </span>
                <div className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg font-bold text-xs shadow-2xs ${decStyle.badge}`}>
                  <span className={`material-symbols-outlined text-[17px] ${decStyle.icon}`}>
                    {decStyle.iconName}
                  </span>
                  <span>{review.finalDecision}</span>
                  {review.finalDecisionSub && (
                    <span className="text-[10px] font-normal opacity-85">
                      · {review.finalDecisionSub}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section: Review Findings */}
          {review.findings && review.findings.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                REVIEW FINDINGS
              </span>
              <div className="space-y-2.5">
                {review.findings.map((f, i) => (
                  <div
                    key={f.id || i}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        Page {f.page} · {f.section}
                      </h4>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                        {f.sectionBadge || `Section ${f.section.split('—')[0].trim()}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                      {f.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Overall Review Comments */}
          {review.overallComments && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                OVERALL REVIEW COMMENTS
              </span>
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-normal">
                {review.overallComments}
              </div>
            </div>
          )}

          {/* Section: Justification for the Recommendation */}
          {review.justification && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                JUSTIFICATION FOR THE RECOMMENDATION
              </span>
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-normal">
                {review.justification}
              </div>
            </div>
          )}

          {/* Section: Additional Review Notes */}
          {review.additionalNotes && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                ADDITIONAL REVIEW NOTES
              </span>
              <div className="p-3 bg-slate-50/50 border border-slate-200/80 rounded-xl text-xs text-slate-500 leading-relaxed">
                {review.additionalNotes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
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
