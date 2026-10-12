'use client';

import React from 'react';
import { TECHBETA_EVENTS, getShortCode } from '@/lib/events';
import { Check, Trophy, Sparkles, X } from 'lucide-react';

interface EventSelectorProps {
  selectedTechEvents: string[];
  onTechEventsChange: (events: string[]) => void;
  selectedNonTechEvents: string[];
  onNonTechEventsChange: (events: string[]) => void;
  accentColor?: 'violet' | 'blue';
}

export default function EventSelector({
  selectedTechEvents,
  onTechEventsChange,
  selectedNonTechEvents,
  onNonTechEventsChange,
  accentColor = 'violet',
}: EventSelectorProps) {
  const techEvents = TECHBETA_EVENTS.filter((e) => e.category === 'Technical');
  const nonTechEvents = TECHBETA_EVENTS.filter((e) => e.category === 'Non-Technical');

  const isTechSelected = (name: string, shortCode: string) => {
    return selectedTechEvents.some(
      (e) => e.toUpperCase() === name.toUpperCase() || getShortCode(e) === shortCode
    );
  };

  const toggleTech = (name: string, shortCode: string) => {
    if (isTechSelected(name, shortCode)) {
      onTechEventsChange(
        selectedTechEvents.filter(
          (e) => e.toUpperCase() !== name.toUpperCase() && getShortCode(e) !== shortCode
        )
      );
    } else {
      // Remove any loose matches of this event, then add standard name
      const filtered = selectedTechEvents.filter(
        (e) => e.toUpperCase() !== name.toUpperCase() && getShortCode(e) !== shortCode
      );
      onTechEventsChange([...filtered, name]);
    }
  };

  const isNonTechSelected = (name: string, shortCode: string) => {
    return selectedNonTechEvents.some(
      (e) => e.toUpperCase() === name.toUpperCase() || getShortCode(e) === shortCode
    );
  };

  const toggleNonTech = (name: string, shortCode: string) => {
    if (isNonTechSelected(name, shortCode)) {
      onNonTechEventsChange(
        selectedNonTechEvents.filter(
          (e) => e.toUpperCase() !== name.toUpperCase() && getShortCode(e) !== shortCode
        )
      );
    } else {
      const filtered = selectedNonTechEvents.filter(
        (e) => e.toUpperCase() !== name.toUpperCase() && getShortCode(e) !== shortCode
      );
      onNonTechEventsChange([...filtered, name]);
    }
  };

  const selectAllTech = () => {
    onTechEventsChange(techEvents.map((e) => e.name));
  };

  const clearAllTech = () => {
    onTechEventsChange([]);
  };

  const selectAllNonTech = () => {
    onNonTechEventsChange(nonTechEvents.map((e) => e.name));
  };

  const clearAllNonTech = () => {
    onNonTechEventsChange([]);
  };

  const totalSelected = selectedTechEvents.length + selectedNonTechEvents.length;

  const techBorderClass = accentColor === 'blue' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/70 text-blue-950' : 'border-violet-500 ring-1 ring-violet-500 bg-violet-50/70 text-violet-950';
  const techBadgeClass = accentColor === 'blue' ? 'bg-blue-600 text-white' : 'bg-violet-600 text-white';
  const techHeaderBadgeClass = accentColor === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700';

  return (
    <div className="space-y-3.5">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
        <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
          <Trophy className={`w-3.5 h-3.5 ${accentColor === 'blue' ? 'text-blue-600' : 'text-violet-600'}`} />
          <span>Registered Events Selection</span>
        </label>
        <span className="text-[11px] font-semibold text-slate-500">
          {totalSelected === 0 ? (
            <span className="text-amber-600 font-bold">0 selected (Pick at least 1)</span>
          ) : (
            <span className="text-emerald-700 font-bold">
              {totalSelected} event{totalSelected > 1 ? 's' : ''} selected
            </span>
          )}
        </span>
      </div>

      {/* Technical Events */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-600" />
              Technical Events
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${techHeaderBadgeClass}`}>
              {selectedTechEvents.length} / {techEvents.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={selectAllTech}
              className="text-slate-500 hover:text-slate-900 font-semibold underline decoration-slate-300"
            >
              All
            </button>
            <span className="text-slate-300">&bull;</span>
            <button
              type="button"
              onClick={clearAllTech}
              className="text-slate-500 hover:text-slate-900 font-semibold underline decoration-slate-300"
            >
              None
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {techEvents.map((evt) => {
            const isSelected = isTechSelected(evt.name, evt.shortCode);
            return (
              <button
                key={evt.id}
                type="button"
                onClick={() => toggleTech(evt.name, evt.shortCode)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? techBorderClass
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? techBadgeClass : 'border border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs leading-tight">{evt.name}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-800 shrink-0">
                      {evt.shortCode}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    {evt.defaultType}
                    {evt.shortCode === 'IF' && ' \u2022 Idea Presentation'}
                    {evt.shortCode === 'GB' && ' \u2022 Prototype & AI'}
                    {evt.shortCode === 'UV' && ' \u2022 UI/UX Challenge'}
                    {evt.shortCode === 'LT' && ' \u2022 Code Debugging'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Non-Technical Events */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-600" />
              Non-Technical Events
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {selectedNonTechEvents.length} / {nonTechEvents.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={selectAllNonTech}
              className="text-slate-500 hover:text-slate-900 font-semibold underline decoration-slate-300"
            >
              All
            </button>
            <span className="text-slate-300">&bull;</span>
            <button
              type="button"
              onClick={clearAllNonTech}
              className="text-slate-500 hover:text-slate-900 font-semibold underline decoration-slate-300"
            >
              None
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {nonTechEvents.map((evt) => {
            const isSelected = isNonTechSelected(evt.name, evt.shortCode);
            return (
              <button
                key={evt.id}
                type="button"
                onClick={() => toggleNonTech(evt.name, evt.shortCode)}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/70 text-amber-950'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-amber-600 text-white' : 'border border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs leading-tight">{evt.name}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-800 shrink-0">
                      {evt.shortCode}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                    {evt.defaultType}
                    {evt.shortCode === 'BB' && ' \u2022 Ad & Concept Pitch'}
                    {evt.shortCode === 'BNB' && ' \u2022 Auction & Product Pitch'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
