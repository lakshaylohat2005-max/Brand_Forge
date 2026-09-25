"use client";

import { useState } from 'react';
import { BrandProject, StageName } from '@/lib/types';

const STAGES: StageName[] = [
  'Understand',
  'Position',
  'Shape',
  'Challenge',
  'Visualize',
  'Consistency',
  'Launch'
];

export default function Home() {
  const [project, setProject] = useState<BrandProject>(() => ({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
    rawIdea: ''
  }));
  
  const [currentStage, setCurrentStage] = useState<StageName>('Understand');
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleAiCall = async () => {
    setLoading(true);
    try {
      let currentContext = { ...project };
      
      if (currentStage === 'Understand' && currentContext.understanding?.openQuestions && currentContext.understanding.openQuestions.length > 0) {
        const newQaPairs = currentContext.understanding.openQuestions.map((q, i) => ({
          question: q,
          answer: answers[i] || "No answer provided"
        }));
        
        currentContext = {
          ...currentContext,
          understanding: {
            ...currentContext.understanding,
            openQuestions: [],
            qaPairs: [...(currentContext.understanding.qaPairs || []), ...newQaPairs]
          }
        };
        setProject(currentContext);
        setAnswers({});
      }
      
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: currentStage, context: currentContext })
      });
      const data = await res.json();
      
      setProject(prev => {
        const nextState = { ...prev, ...data };
        if (currentStage === 'Understand' && nextState.understanding && (!nextState.understanding.openQuestions || nextState.understanding.openQuestions.length === 0)) {
          setTimeout(() => setCurrentStage('Position'), 500);
        }
        return nextState;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChallengeAction = (id: string, action: 'accepted' | 'dismissed') => {
    setProject(prev => {
      const next = { ...prev };
      
      const logIndex = next.challengeLog?.findIndex(l => l.id === id);
      if (logIndex !== undefined && logIndex >= 0 && next.challengeLog) {
        const log = next.challengeLog[logIndex];
        
        if (action === 'accepted' && log.fieldToPatch !== 'none') {
           if (log.fieldToPatch === 'tagline') next.tagline = log.betterAlternative;
           else if (log.fieldToPatch === 'onePitchLine') next.onePitchLine = log.betterAlternative;
           else if (log.fieldToPatch.startsWith('positioning.') && next.positioning) {
             const key = log.fieldToPatch.split('.')[1] as keyof typeof next.positioning;
             next.positioning = { ...next.positioning, [key]: log.betterAlternative };
           }
        }
        
        next.challengeLog = [...next.challengeLog];
        next.challengeLog[logIndex] = { ...log, status: action };
      }
      
      return next;
    });
  };

  const exportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "brand-forge-kit.json");
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);
  };

  const isStageDone = (stage: StageName) => {
    switch (stage) {
      case 'Understand': return !!project.understanding && (!project.understanding.openQuestions || project.understanding.openQuestions.length === 0);
      case 'Position': return !!project.positioning;
      case 'Shape': return !!project.personality && !!project.namingDirections && !!project.selectedNamingDirection;
      case 'Challenge': return !!project.challengeLog && project.challengeLog.every(c => c.status !== 'pending');
      case 'Visualize': return !!project.visualDirection;
      case 'Consistency': return !!project.consistencyReport && project.consistencyReport.resolved;
      case 'Launch': return !!project.launchAssets;
      default: return false;
    }
  };

  const renderStageContent = () => {
    return (
      <div className="p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 opacity-50 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              {currentStage} Phase
            </h2>
            {isStageDone(currentStage) && (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1 shadow-sm">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                Completed
              </span>
            )}
          </div>
          
          {currentStage === 'Understand' && (
            <div className="mb-6 space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                What is your raw brand idea?
              </label>
              <textarea 
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none shadow-sm bg-gray-50/50"
                rows={4}
                placeholder="Describe your brand idea, what you sell, or what problem you solve..."
                value={project.rawIdea}
                onChange={(e) => setProject({...project, rawIdea: e.target.value})}
                disabled={isStageDone('Understand')}
              />
              
              {project.understanding?.openQuestions && project.understanding.openQuestions.length > 0 && (
                <div className="mt-4 p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                  <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Clarifying Questions
                  </h3>
                  {project.understanding.openQuestions.map((q, i) => (
                    <div key={i} className="space-y-2">
                      <label className="block text-sm font-medium text-indigo-800">{q}</label>
                      <input 
                        type="text"
                        className="w-full p-3 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        placeholder="Your answer..."
                        value={answers[i] || ''}
                        onChange={(e) => setAnswers({...answers, [i]: e.target.value})}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAiCall();
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {currentStage === 'Position' && (
            <div className="space-y-6">
              {project.understanding ? (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-6 shadow-inner">
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Understanding Context
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block mb-1">Target User</span>
                      <p className="font-medium text-slate-900">{project.understanding.targetUser}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Core Problem</span>
                      <p className="font-medium text-slate-900">{project.understanding.coreProblem}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500 block mb-1">Constraints</span>
                      <p className="font-medium text-slate-900">{project.understanding.constraints}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-sm mb-4">Complete the Understand stage first.</div>
              )}
              
              {project.positioning ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input type="text" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow" value={project.positioning.category || ''} onChange={(e) => setProject({...project, positioning: {...project.positioning, category: e.target.value}})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Differentiator</label>
                    <input type="text" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow" value={project.positioning.differentiator || ''} onChange={(e) => setProject({...project, positioning: {...project.positioning, differentiator: e.target.value}})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Differentiator Justification</label>
                    <textarea className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow" rows={2} value={project.positioning.differentiatorJustification || ''} onChange={(e) => setProject({...project, positioning: {...project.positioning, differentiatorJustification: e.target.value}})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Value Proposition</label>
                      <textarea className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow" rows={3} value={project.positioning.valueProp || ''} onChange={(e) => setProject({...project, positioning: {...project.positioning, valueProp: e.target.value}})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Competitive Angle</label>
                      <textarea className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow" rows={3} value={project.positioning.competitiveAngle || ''} onChange={(e) => setProject({...project, positioning: {...project.positioning, competitiveAngle: e.target.value}})} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-3 bg-gray-50/80 rounded-xl border border-gray-100 shadow-inner">
                  <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  <p>No positioning generated yet.</p>
                </div>
              )}
            </div>
          )}

          {currentStage === 'Shape' && (
            <div className="space-y-6">
              {project.positioning ? (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-6 shadow-inner">
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Positioning Context
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block mb-1">Category</span>
                      <p className="font-medium text-slate-900">{project.positioning.category}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Differentiator</span>
                      <p className="font-medium text-slate-900">{project.positioning.differentiator}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500 block mb-1">Value Prop</span>
                      <p className="font-medium text-slate-900">{project.positioning.valueProp}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-sm mb-4">Complete the Position stage first.</div>
              )}
              
              {project.personality ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Personality Traits</h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.personality.traits?.map((t, i) => (
                        <div key={i} className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-sm group relative cursor-help">
                          <span className="font-semibold text-indigo-700">{t.name}</span>
                          <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                            {t.justification}
                          </div>
                        </div>
                      ))}
                    </div>
                    <h4 className="text-sm font-semibold text-rose-800 mb-3">Traits to Avoid</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.personality.traitsToAvoid?.map((t, i) => (
                        <div key={i} className="px-3 py-2 bg-rose-50 border border-rose-100 rounded-lg text-sm group relative cursor-help">
                          <span className="font-semibold text-rose-700">{t.name}</span>
                          <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                            {t.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Naming Directions</h3>
                      <p className="text-sm text-gray-500">Select one direction to carry forward to the next stage.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {project.namingDirections?.map((dir, i) => (
                        <button 
                          key={i} 
                          onClick={() => setProject({...project, selectedNamingDirection: dir.direction})}
                          className={`text-left p-4 rounded-xl border transition-all ${project.selectedNamingDirection === dir.direction ? 'border-indigo-500 bg-indigo-50 shadow-md ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
                        >
                          <h4 className="font-bold text-indigo-900 mb-2">{dir.direction}</h4>
                          <p className="text-xs text-gray-600 mb-3 line-clamp-3">{dir.rationale}</p>
                          <div className="flex flex-wrap gap-1">
                            {dir.exampleNames.map((name, j) => (
                              <span key={j} className="px-2 py-1 bg-white border border-gray-200 text-xs font-medium rounded text-gray-700">{name}</span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Tagline & Pitch</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                      <input type="text" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow" value={project.tagline || ''} onChange={(e) => setProject({...project, tagline: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">One-Line Pitch</label>
                      <input type="text" className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-shadow" value={project.onePitchLine || ''} onChange={(e) => setProject({...project, onePitchLine: e.target.value})} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-3 bg-gray-50/80 rounded-xl border border-gray-100 shadow-inner">
                  <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  <p>No shape generated yet.</p>
                </div>
              )}
            </div>
          )}

          {currentStage === 'Challenge' && (
            <div className="space-y-6">
              {project.challengeLog ? (
                project.challengeLog.length > 0 ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200 shadow-sm flex items-start gap-3">
                      <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                      <div>
                        <h4 className="font-bold">Creative Director Feedback</h4>
                        <p>The AI reviewed your brand identity and flagged these issues. Review each one to proceed.</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {project.challengeLog.map((log) => (
                        <div key={log.id} className={`p-5 rounded-xl border transition-all ${log.status === 'pending' ? 'bg-white border-rose-200 shadow-sm' : log.status === 'accepted' ? 'bg-emerald-50 border-emerald-200 opacity-70' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-rose-800 flex items-center gap-2">
                              {log.status === 'pending' && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                              {log.issue}
                            </h4>
                            {log.status !== 'pending' && (
                              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${log.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
                                {log.status}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-4">{log.why}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                            <div className="p-3 bg-rose-50/50 rounded border border-rose-100">
                              <span className="block text-xs font-semibold text-rose-500 mb-1">CURRENT ({log.fieldToPatch})</span>
                              <p className="line-through text-gray-500">{log.originalValue || '(None)'}</p>
                            </div>
                            <div className="p-3 bg-emerald-50/50 rounded border border-emerald-100">
                              <span className="block text-xs font-semibold text-emerald-500 mb-1">SUGGESTED</span>
                              <p className="font-medium text-gray-900">{log.betterAlternative}</p>
                            </div>
                          </div>
                          
                          {log.status === 'pending' && (
                            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                              <button 
                                onClick={() => handleChallengeAction(log.id, 'accepted')}
                                className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-medium rounded-lg text-sm transition-colors"
                              >
                                Apply Fix
                              </button>
                              <button 
                                onClick={() => handleChallengeAction(log.id, 'dismissed')}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm transition-colors"
                              >
                                Keep Original
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h4 className="font-bold text-lg">No Issues Found!</h4>
                    <p>The AI creative director reviewed your brand identity and couldn&apos;t find any glaring issues. It&apos;s solid.</p>
                  </div>
                )
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-3 bg-gray-50/80 rounded-xl border border-gray-100 shadow-inner">
                  <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  <p>No challenges generated yet. Generate to review your brand.</p>
                </div>
              )}
            </div>
          )}

          {currentStage === 'Visualize' && (
            <div className="space-y-6">
              {project.visualDirection ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                  
                  {project.visualDirection.closestGoogleFont && (
                    <style dangerouslySetInnerHTML={{__html: `
                      @import url('https://fonts.googleapis.com/css2?family=${project.visualDirection.closestGoogleFont.replace(/ /g, '+')}:wght@400;700&display=swap');
                      .dynamic-font { font-family: '${project.visualDirection.closestGoogleFont}', sans-serif; }
                    `}} />
                  )}

                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Wordmark Mockup</h3>
                    <p className="text-sm text-gray-500 mb-6">Using Google Font: <span className="font-medium text-indigo-600">{project.visualDirection.closestGoogleFont || 'default'}</span></p>
                    
                    <div className="flex items-center justify-center p-12 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                      <span className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dynamic-font transition-all text-center">
                        {project.namingDirections?.find(d => d.direction === project.selectedNamingDirection)?.exampleNames[0] || 'BrandName'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Color Mood</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {project.visualDirection.colorMood?.map((color, i) => (
                        <div key={i} className="flex flex-col items-center group">
                          <div 
                            className="w-full h-24 rounded-lg shadow-md mb-3 border border-gray-200 group-hover:scale-105 transition-transform duration-200" 
                            style={{ backgroundColor: color.hex }}
                          ></div>
                          <span className="font-bold text-xs uppercase tracking-wide text-gray-800 bg-gray-100 px-2 py-1 rounded">{color.hex}</span>
                          <span className="text-xs text-gray-600 font-medium mt-2 mb-1 text-center leading-tight">{color.name}</span>
                          <p className="text-[10px] text-gray-400 text-center leading-tight">{color.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Imagery Style</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{project.visualDirection.imageryStyle}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Motifs</h3>
                      <ul className="list-disc pl-4 text-sm text-gray-700 space-y-2">
                        {project.visualDirection.motifs?.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="text-sm font-bold text-rose-800 mb-3 uppercase tracking-wide">Shapes to Avoid</h3>
                      <ul className="list-disc pl-4 text-sm text-gray-700 space-y-2">
                        {project.visualDirection.shapesToAvoid?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-3 bg-gray-50/80 rounded-xl border border-gray-100 shadow-inner">
                  <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <p>No visual direction generated yet.</p>
                </div>
              )}
            </div>
          )}

          {currentStage === 'Consistency' && (
            <div className="space-y-6">
              {project.consistencyReport ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                  
                  {project.consistencyReport.resolved || !project.consistencyReport.conflicts || project.consistencyReport.conflicts.length === 0 ? (
                    <div className="p-8 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <h3 className="font-bold text-2xl text-emerald-900">Brand is Cohesive</h3>
                      <p className="max-w-md">Your brand decisions across all stages align perfectly. There are no contradictions between your positioning, personality, and visual direction.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="p-6 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg mb-1 text-rose-900">Inconsistencies Detected</h3>
                          <p>The AI found conflicts across your brand decisions. Jump back to the relevant stages to fix them. Your existing data will be preserved.</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {project.consistencyReport.conflicts.map((conflict, i) => (
                          <div key={i} className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                            <div>
                              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 font-bold text-[10px] uppercase tracking-wider rounded mb-3">
                                Stage: {conflict.stageName}
                              </span>
                              <p className="text-sm text-gray-800 font-medium mb-4">{conflict.issue}</p>
                            </div>
                            <button 
                              onClick={() => setCurrentStage(conflict.stageName)}
                              className="self-start text-sm text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 transition-colors"
                            >
                              Go to {conflict.stageName}
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-end pt-4">
                        <button
                          onClick={() => setProject(p => ({...p, consistencyReport: { ...p.consistencyReport!, resolved: true }}))}
                          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          Mark as resolved anyway (Ignore)
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-3 bg-gray-50/80 rounded-xl border border-gray-100 shadow-inner">
                  <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <p>No consistency report generated yet.</p>
                </div>
              )}
            </div>
          )}

          {currentStage === 'Launch' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
              {project.launchAssets ? (
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-12">
                  <div className="text-center space-y-4 pb-8 border-b border-gray-100">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                      {project.namingDirections?.find(d => d.direction === project.selectedNamingDirection)?.exampleNames[0] || 'Your Brand'}
                    </h2>
                    <p className="text-xl text-indigo-600 font-medium">{project.tagline}</p>
                    <p className="text-gray-500 max-w-2xl mx-auto">{project.onePitchLine}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-gray-900 border-b pb-2">Positioning</h3>
                      <div className="space-y-4 text-sm">
                        <div><span className="font-semibold text-gray-700 block">Category:</span> {project.positioning?.category}</div>
                        <div><span className="font-semibold text-gray-700 block">Differentiator:</span> {project.positioning?.differentiator}</div>
                        <div><span className="font-semibold text-gray-700 block">Value Prop:</span> {project.positioning?.valueProp}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-gray-900 border-b pb-2">Personality</h3>
                      <div className="flex flex-wrap gap-2">
                        {project.personality?.traits?.map(t => (
                          <span key={t.name} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">{t.name}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 border-b pb-2">Visual Identity</h3>
                    {project.visualDirection?.closestGoogleFont && (
                      <style dangerouslySetInnerHTML={{__html: `
                        @import url('https://fonts.googleapis.com/css2?family=${project.visualDirection.closestGoogleFont.replace(/ /g, '+')}:wght@400;700&display=swap');
                        .dynamic-font-launch { font-family: '${project.visualDirection.closestGoogleFont}', sans-serif; }
                      `}} />
                    )}
                    <div className="p-6 bg-gray-50 rounded-xl flex items-center justify-center mb-6">
                      <span className="text-5xl font-bold text-gray-900 dynamic-font-launch text-center">
                        Aa Bb Cc<br/><span className="text-lg text-gray-400 font-sans mt-2 block">({project.visualDirection?.closestGoogleFont})</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {project.visualDirection?.colorMood?.map(c => (
                        <div key={c.hex} className="flex-1 min-w-[100px]">
                          <div className="h-16 w-full rounded-lg shadow-inner mb-2 border border-gray-200" style={{ backgroundColor: c.hex }}></div>
                          <p className="text-xs font-bold text-center uppercase text-gray-700">{c.hex}</p>
                          <p className="text-[10px] text-center text-gray-500 line-clamp-1">{c.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 border-b pb-2">Launch Copy</h3>
                    
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Landing Page Hero</span>
                      <h4 className="text-2xl font-bold text-gray-900 mb-2">{project.launchAssets.landingPage.headline}</h4>
                      <p className="text-lg text-gray-600">{project.launchAssets.landingPage.subhead}</p>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Brand Pitch (One-Pager)</span>
                      <div className="space-y-3 text-sm text-gray-700">
                        <p><strong className="text-gray-900">Problem:</strong> {project.launchAssets.brandPitch.problem}</p>
                        <p><strong className="text-gray-900">Solution:</strong> {project.launchAssets.brandPitch.solution}</p>
                        <p><strong className="text-gray-900">Why Now:</strong> {project.launchAssets.brandPitch.whyNow}</p>
                        <p><strong className="text-gray-900">Personality:</strong> {project.launchAssets.brandPitch.personalityOneLiner}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                      <span className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2 block">Social Launch Post</span>
                      <p className="text-gray-800 italic">&quot;{project.launchAssets.socialPost}&quot;</p>
                    </div>
                  </div>

                  <div className="pt-8 flex flex-wrap justify-center gap-4 print:hidden border-t border-gray-100">
                    <button onClick={exportJson} className="px-6 py-3 bg-white text-gray-700 border border-gray-300 font-medium rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                      Export JSON
                    </button>
                    <button onClick={() => window.print()} className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                      Print Summary View
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-3 bg-gray-50/80 rounded-xl border border-gray-100 shadow-inner">
                  <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  <p>No launch assets generated yet.</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex justify-end gap-4 print:hidden">
            {isStageDone(currentStage) && currentStage !== 'Launch' && (
              <button 
                onClick={() => setCurrentStage(STAGES[STAGES.indexOf(currentStage) + 1])}
                className="px-6 py-3 bg-white text-indigo-700 font-medium rounded-xl hover:bg-indigo-50 border border-indigo-200 transition-all duration-200 shadow-sm"
              >
                Lock & Continue
              </button>
            )}
            <button 
              onClick={handleAiCall}
              disabled={loading || (currentStage === 'Understand' && !project.rawIdea) || (currentStage === 'Position' && !project.understanding)}
              className="group relative flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 overflow-hidden"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {!loading && (
                <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              )}
              {loading ? 'Generating...' : (currentStage === 'Understand' && project.understanding?.openQuestions?.length) ? 'Submit Answers' : isStageDone(currentStage) ? 'Regenerate' : `Generate ${currentStage}`}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Sidebar */}
      <div className="w-72 bg-white/60 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 print:hidden">
        <div className="p-8 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">Brand Forge</h1>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider ml-11">AI Identity Builder</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-hide">
          {STAGES.map((stage, index) => {
            const done = isStageDone(stage);
            const active = currentStage === stage;
            return (
              <button
                key={stage}
                onClick={() => setCurrentStage(stage)}
                className={`
                  w-full text-left px-4 py-3.5 rounded-xl flex items-center justify-between transition-all duration-200 group relative overflow-hidden
                  ${active 
                    ? 'bg-indigo-50/80 text-indigo-700 shadow-sm border border-indigo-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'}
                `}
              >
                {active && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                )}
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${active ? 'bg-indigo-200/50 text-indigo-700' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                    {index + 1}
                  </span>
                  <span className={`font-medium ${active ? 'font-semibold tracking-tight' : ''}`}>{stage}</span>
                </div>
                
                {done ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                ) : (
                  <div className={`w-2 h-2 rounded-full ${active ? 'bg-indigo-300 animate-pulse' : 'bg-slate-200 group-hover:bg-slate-300'}`}></div>
                )}
              </button>
            )
          })}
        </nav>
        
        <div className="p-6 border-t border-slate-100 mt-auto bg-white/40">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">Session ID</span>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded truncate" title={project.id}>{project.id}</span>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/40 blur-[100px] pointer-events-none"></div>
        
        <header className="bg-white/40 backdrop-blur-md border-b border-slate-200/50 px-10 py-5 z-10">
          <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Current Stage</span>
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              <span className="text-sm font-bold text-slate-700">{currentStage}</span>
            </div>
            
            <button 
              onClick={() => console.log(project)}
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-full border border-slate-200 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
              Log Output
            </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-10 z-10">
          <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderStageContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
