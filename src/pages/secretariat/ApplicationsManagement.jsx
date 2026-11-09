import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SecretariatLayout from '../../layouts/SecretariatLayout';
import { ROUTES } from '../../constants/routes';
import { checkingApi } from '../../services/api';

const padCount = (n) => String(n || 0).padStart(2, '0');

export default function ApplicationsManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const res = await checkingApi.queue();
      if (res && res.success) {
        const list = Array.isArray(res.queue) ? res.queue : (Array.isArray(res.protocols) ? res.protocols : []);
        setQueue(list);
      }
    } catch (err) {
      console.error('Failed to load applications queue:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const handleSync = () => fetchQueue();
    window.addEventListener('urerb_secretariat_queue_sync', handleSync);
    return () => {
      window.removeEventListener('urerb_secretariat_queue_sync', handleSync);
    };
  }, []);

  const tabs = useMemo(() => {
    return [
      { id: 'all', label: 'All Protocols', count: padCount(queue.length), badgeStyle: 'bg-[#e8ecfb] text-slate-700' },
      { id: 'new', label: 'New Submissions', count: padCount(queue.filter((p) => p.statusCategory === 'new').length), badgeStyle: 'bg-[#e8ecfb] text-slate-700' },
      { id: 'checking', label: 'Completeness Check', count: padCount(queue.filter((p) => p.statusCategory === 'checking').length), badgeStyle: 'bg-[#e8ecfb] text-slate-700' },
      { id: 'clarification', label: 'Pending PI Clarification', count: padCount(queue.filter((p) => p.statusCategory === 'clarification').length), badgeStyle: 'bg-[#fee2e2] text-[#991b1b]' },
      { id: 'assigned', label: 'Assigned to Reviewers', count: padCount(queue.filter((p) => p.statusCategory === 'assigned').length), badgeStyle: 'bg-[#e8ecfb] text-slate-700' },
    ];
  }, [queue]);

  const now = new Date();
  const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const currentAcademicYear = `AY ${startYear}-${startYear + 1}`;
  const prevAcademicYear = `AY ${startYear - 1}-${startYear}`;

  const [activeTab, setActiveTab] = useState(
    tabs.some((t) => t.id === tabParam) ? tabParam : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('All');
  const [selectedCollege, setSelectedCollege] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [routingProtocol, setRoutingProtocol] = useState(null);

  useEffect(() => {
    if (tabParam && tabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, tabs]);

  const filteredProtocols = useMemo(() => {
    return queue.filter((item) => {
      if (activeTab !== 'all' && item.statusCategory !== activeTab) {
        return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchId = item.protocolId.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchPi = item.pi.toLowerCase().includes(q);
        if (!matchId && !matchTitle && !matchPi) return false;
      }

      if (selectedTrack !== 'All' && item.reviewTrack !== selectedTrack) {
        return false;
      }

      if (selectedCollege !== 'All' && !item.college.includes(selectedCollege)) {
        return false;
      }

      if (selectedYear !== 'All' && item.academicYear !== selectedYear) {
        return false;
      }

      return true;
    });
  }, [queue, activeTab, searchQuery, selectedTrack, selectedCollege, selectedYear]);

  const handleClearFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setSelectedTrack('All');
    setSelectedCollege('All');
    setSelectedYear('All');
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'Passed Intake':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#d1fae5] text-[#065f46]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#065f46]"></span>
            Passed Intake
          </span>
        );
      case 'New Intake':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#e0e7ff] text-[#1e3a8a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a]"></span>
            New Intake
          </span>
        );
      case 'Checking':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#e8ecfb] text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            Checking
          </span>
        );
      case 'PI Clarification':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#fee2e2] text-[#991b1b]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#991b1b]"></span>
            PI Clarification
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#e0e7ff] text-[#1e3a8a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a]"></span>
            {status}
          </span>
        );
    }
  };

  return (
    <SecretariatLayout>
      <div className="space-y-5">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Applications Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Receive, filter, track intake stages, and coordinate review workflows.
          </p>
        </div>

        {/* Status Filter Tabs Bar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-1.5 shadow-2xs flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#14432f] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : tab.badgeStyle
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Controls Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search protocol ID, title, or investigator..."
                className="w-full pl-9 pr-3.5 py-2 bg-[#f4f6fb] border border-slate-200/80 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#14432f]"
              />
            </div>

            {/* Review Track Select */}
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="px-3.5 py-2 bg-[#f4f6fb] border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#14432f] cursor-pointer"
            >
              <option value="All">Review Track: All</option>
              <option value="Expedited Review">Review Track: Expedited</option>
              <option value="Full Board Review">Review Track: Full Board</option>
              <option value="Exempted Review">Review Track: Exempted</option>
            </select>

            {/* College / Unit Select */}
            <select
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              className="px-3.5 py-2 bg-[#f4f6fb] border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#14432f] cursor-pointer min-w-[200px]"
            >
              <option value="All">College / Unit: All</option>
              <option value="CCIS">College of Computing and Information Sciences (CCIS)</option>
              <option value="CAS">College of Arts and Sciences (CAS)</option>
              <option value="CBEA">College of Business, Economics and Accountancy (CBEA)</option>
              <option value="CTE">College of Teacher Education (CTE)</option>
              <option value="CHS">College of Health Sciences (CHS)</option>
              <option value="COE">College of Engineering (COE)</option>
              <option value="CAFSD">College of Agriculture (CAFSD)</option>
              <option value="CIT">College of Industrial Technology (CIT)</option>
              <option value="COM">College of Medicine (COM)</option>
              <option value="COL">College of Law (COL)</option>
              <option value="GS">Graduate School (GS)</option>
            </select>

            {/* Academic Year Select */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3.5 py-2 bg-[#f4f6fb] border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-[#14432f] cursor-pointer"
            >
              <option value="All">All Years</option>
              <option value={currentAcademicYear}>{currentAcademicYear}</option>
              <option value={prevAcademicYear}>{prevAcademicYear}</option>
            </select>

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <span>✕</span>
              <span>Clear</span>
            </button>
          </div>

          {/* Active Filter Subrow */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-500 flex-wrap">
              <span className="material-symbols-outlined text-[15px] text-[#14432f]">
                filter_alt
              </span>
              <span>Filtered by:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e8ecfb] text-slate-700 font-mono text-[11px] font-medium">
                {selectedCollege === 'All' ? 'All Units' : selectedCollege}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e8ecfb] text-slate-700 font-mono text-[11px] font-medium">
                {selectedYear}
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              Showing {filteredProtocols.length} records
            </div>
          </div>
        </div>

        {/* Protocol Cards List */}
        <div className="space-y-4">
          {filteredProtocols.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-2xs space-y-2">
              <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[22px]">inbox</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                No protocol applications found
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                There are currently no submissions in the Secretariat queue matching your selected filter criteria.
              </p>
            </div>
          )}
          {filteredProtocols.map((protocol) => (
            <div
              key={protocol.id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-shadow space-y-4"
            >
              {/* Top Row: ID + Note Badge on Left, Status Pill on Right */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-xs text-[#14432f]">
                    {protocol.protocolId}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                      protocol.badgeType === 'danger'
                        ? 'bg-[#fee2e2] text-[#991b1b]'
                        : 'bg-[#e8ecfb] text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        protocol.badgeType === 'danger' ? 'bg-[#991b1b]' : 'bg-[#14432f]'
                      }`}
                    ></span>
                    {protocol.badgeNote}
                  </span>
                </div>

                {getStatusPill(protocol.status)}
              </div>

              {/* Title & Investigator */}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {protocol.title}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {protocol.pi} · {protocol.college}
                </p>
              </div>

              {/* Bottom Row: Metadata Left, Action Buttons Right */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-5 text-xs text-slate-600 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-slate-400">
                      track_changes
                    </span>
                    <span>{protocol.reviewTrack}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-slate-400">
                      calendar_today
                    </span>
                    <span>Received: {protocol.dateReceived}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-slate-400">
                      hourglass_top
                    </span>
                    <span>Stage: {protocol.stage}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`${ROUTES.SECRETARIAT.APPLICATION_PROCESSING}?id=${protocol.protocolId}`)
                    }
                    className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Details
                  </button>

                  {protocol.actionType === 'route' && (
                    <button
                      type="button"
                      onClick={() => setRoutingProtocol(protocol)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>Route</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                  )}

                  {protocol.actionType === 'check' && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`${ROUTES.SECRETARIAT.APPLICATION_CHECKING}?id=${protocol.protocolId}&state=deficient`)
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>Check</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                  )}

                  {protocol.actionType === 'continue' && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`${ROUTES.SECRETARIAT.APPLICATION_CHECKING}?id=${protocol.protocolId}&state=verified`)
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>Continue</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                  )}

                  {protocol.actionType === 'deficit' && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`${ROUTES.SECRETARIAT.APPLICATION_CHECKING}?id=${protocol.protocolId}&state=deficient`)
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>View Deficit</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                  )}

                  {protocol.actionType === 'details' && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`${ROUTES.SECRETARIAT.APPLICATION_PROCESSING}?id=${protocol.protocolId}`)
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>Coordinate</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Route Application to Review Coordination? Modal */}
      {routingProtocol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#d1fae5] text-[#065f46] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">alt_route</span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Route Application to Review Coordination?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confirm routing to assign reviewers and set review timelines.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoutingProtocol(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-4 leading-relaxed">
              This application has completed intake verification and is ready for review panel and reviewer coordination.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-[#f4f6fb] border border-slate-200/70 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Protocol ID</span>
                <span className="font-mono font-bold text-slate-900">
                  {routingProtocol.protocolId}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Research Title</span>
                <span className="font-bold text-slate-900 leading-snug block">
                  {routingProtocol.title}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Principal Investigator</span>
                <span className="font-medium text-slate-900">{routingProtocol.pi}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Current Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#d1fae5] text-[#065f46]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#065f46]"></span>
                  Passed Intake
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRoutingProtocol(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = routingProtocol.protocolId;
                  setRoutingProtocol(null);
                  navigate(`${ROUTES.SECRETARIAT.APPLICATION_PROCESSING}?id=${id}`);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14432f] hover:bg-[#0f3323] text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
                <span>Route Application</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </SecretariatLayout>
  );
}
