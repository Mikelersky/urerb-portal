import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ResearcherLayout from '../../layouts/ResearcherLayout';
import { DEMO_HELP_CATEGORIES, DEMO_FAQS, DEMO_HELP_TOPICS } from '../../data/demoData';
import { ROUTES } from '../../constants/routes';

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState('faq-1');

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DEMO_FAQS;
    return DEMO_FAQS.filter((faq) => {
      const inQuestion = faq.question?.toLowerCase().includes(q);
      const inLead = faq.lead?.toLowerCase().includes(q);
      const inText = faq.text?.toLowerCase().includes(q);
      const inAnswer = faq.answer?.some((step) => step.toLowerCase().includes(q));
      const inItems = faq.items?.some((item) => item.toLowerCase().includes(q));
      return inQuestion || inLead || inText || inAnswer || inItems;
    });
  }, [searchQuery]);

  const handleCategoryClick = (catTitle) => {
    if (catTitle === 'Application Process') {
      navigate(ROUTES.RESEARCHER.NEW_APPLICATION);
    } else if (catTitle === 'Submission & Status') {
      navigate(ROUTES.RESEARCHER.APPLICATION_TRACKING);
    } else if (catTitle === 'Requirements & Forms') {
      setSearchQuery('Informed Consent');
      setOpenFaq('faq-2');
    } else if (catTitle === 'Review & Revisions') {
      setSearchQuery('revisions');
      setOpenFaq('faq-4');
    }
  };

  return (
    <ResearcherLayout>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 font-medium select-none">
        <Link to={ROUTES.RESEARCHER.DASHBOARD} className="hover:text-slate-800 flex items-center transition-colors">
          <span className="material-symbols-outlined text-[16px] mr-1 text-slate-400">home</span>
          <span>Home</span>
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">Help Center</span>
      </nav>

      {/* Header Search Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-xs">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Help Center</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Find answers, institutional requirements, and procedural guidance for your research ethics applications.
          </p>
        </div>

        {/* Search Box */}
        <div className="mt-6">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2" htmlFor="help-search">
            Search the Help Center
          </label>
          <div className="relative max-w-2xl">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">
              search
            </span>
            <input
              id="help-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a question or topic (e.g., Informed Consent, Form 16, Expedited Review)..."
              className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1e513b] focus:border-[#1e513b] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Suggested Topic Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 text-xs">
            <span className="text-slate-400 font-medium mr-1 text-[11px]">Suggested topics:</span>
            {DEMO_HELP_TOPICS.map((topic, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSearchQuery(topic)}
                className={`px-2.5 py-1 rounded-md transition font-medium text-xs cursor-pointer ${
                  searchQuery.toLowerCase() === topic.toLowerCase()
                    ? 'bg-[#1e513b] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Help Categories */}
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
          Quick Help Categories
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEMO_HELP_CATEGORIES.map((cat, i) => (
            <div
              key={i}
              onClick={() => handleCategoryClick(cat.title)}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:border-[#1e513b] hover:shadow-xs transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#1e513b] flex items-center justify-center mb-3 group-hover:bg-[#1e513b] group-hover:text-white transition">
                  <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1 group-hover:text-[#1e513b] transition">
                  {cat.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {cat.description}
                </p>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-[#1e513b] mt-3 group-hover:underline">
                {cat.linkText}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
          <span className="text-xs text-slate-400">
            {filteredFaqs.length} {filteredFaqs.length === 1 ? 'common question' : 'common questions'}
          </span>
        </div>

        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                No matching questions found for "{searchQuery}"
              </p>
              <p className="text-xs text-slate-500">
                Try searching for a different keyword or browse all frequently asked questions.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 inline-flex items-center px-3.5 py-1.5 rounded-lg bg-[#1e513b] text-white text-xs font-semibold hover:bg-[#163f2e] cursor-pointer"
              >
                Show All FAQs
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`bg-white border rounded-lg overflow-hidden transition-all duration-200 ${isOpen ? 'border-emerald-300' : 'border-slate-200'}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex items-center justify-between p-4 font-semibold text-xs sm:text-sm text-slate-900 cursor-pointer text-left select-none hover:bg-slate-50 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-[#1e513b]' : 'bg-slate-300'}`} />
                      <span>{faq.question}</span>
                    </span>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs text-slate-600 border-t border-slate-100 bg-slate-50/50 leading-relaxed">
                      {faq.answer && (
                        <ol className="list-decimal list-inside space-y-1.5 ml-1 text-slate-600">
                          {faq.answer.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ol>
                      )}
                      {faq.lead && <p className="mb-2 font-medium text-slate-700">{faq.lead}</p>}
                      {faq.items && (
                        <ul className="list-disc list-inside space-y-1 ml-1 text-slate-600">
                          {faq.items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}
                      {faq.text && <p>{faq.text}</p>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </ResearcherLayout>
  );
}
