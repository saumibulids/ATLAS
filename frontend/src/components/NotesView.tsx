import React, { useState } from 'react';
import { FileText, Plus, Search, Tag, Trash2, Pin, Calendar } from 'lucide-react';
import { NoteItem } from '../types';

interface NotesViewProps {
  notes: NoteItem[];
  onAddNote: (title: string, content: string, color?: 'pink' | 'cream' | 'sky' | 'denim') => void;
  onDeleteNote: (id: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  onAddNote,
  onDeleteNote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<'pink' | 'cream' | 'sky' | 'denim'>('sky');

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag ? n.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onAddNote(title, content, color);
    setTitle('');
    setContent('');
    setIsAdding(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF5FB] border border-[#94C2DA]/60 text-xs font-bold text-[#203F9A] mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Tactile Paper Desk • Cornell Notes</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1E1B17]">
            Cascading Protocol Notes & Study Memos
          </h2>
          <p className="text-xs text-[#4E7CB2]">
            Structured reference sheets, TCP sequence breakdowns, and verified textbook annotations.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="tactile-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Note</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#4E7CB2]/20">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#4E7CB2]" />
          <input
            type="text"
            placeholder="Search through notes, RFC excerpts, definitions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs bg-transparent focus:outline-none text-[#1E1B17] placeholder:text-[#4E7CB2]/60"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedTag === null
                ? 'bg-[#203F9A] text-white'
                : 'bg-[#FAF2EA] text-[#444652] hover:bg-[#EEE7DF]'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                selectedTag === tag
                  ? 'bg-[#203F9A] text-white'
                  : 'bg-[#FAF2EA] text-[#444652] hover:bg-[#EEE7DF]'
              }`}
            >
              <Tag className="w-3 h-3" />
              <span>#{tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* New Note Form Drawer */}
      {isAdding && (
        <form onSubmit={handleCreate} className="paper-card rounded-2xl p-6 space-y-4 border-2 border-[#203F9A]/30">
          <h3 className="font-bold text-base text-[#1E1B17]">Write New Study Note</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#444652]">Title</label>
              <input
                type="text"
                placeholder="e.g. Congestion Window vs Flow Control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-[#4E7CB2]/20 bg-[#FAF2EA]/40 mt-1 focus:outline-[#203F9A]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#444652]">Paper Tint</label>
              <div className="flex items-center gap-3 mt-1.5">
                {[
                  { id: 'sky', label: 'Sky Blue', bg: 'bg-[#EBF5FB]' },
                  { id: 'pink', label: 'Soft Pink', bg: 'bg-[#FFF0F7]' },
                  { id: 'cream', label: 'Archival Cream', bg: 'bg-[#FAF2EA]' },
                  { id: 'denim', label: 'Denim White', bg: 'bg-white' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${c.bg} ${
                      color === c.id ? 'ring-2 ring-[#203F9A] font-bold' : 'border-gray-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-[#444652]">Note Content & Bullet Points</label>
            <textarea
              rows={4}
              placeholder="Enter concepts, formulas, memory shortcuts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-xs p-3 rounded-lg border border-[#4E7CB2]/20 bg-[#FAF2EA]/40 mt-1 focus:outline-[#203F9A]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-xs font-semibold text-[#757683]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tactile-btn-primary px-5 py-2 rounded-xl text-xs font-bold"
            >
              Save to Desk
            </button>
          </div>
        </form>
      )}

      {/* Cascading Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="paper-card rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF2EA] text-[#203F9A] flex items-center justify-center mx-auto border border-[#4E7CB2]/20">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#1E1B17]">No Notes Yet</h3>
            <p className="text-xs text-[#4E7CB2] max-w-md mx-auto">
              Capture your study memos, key formulas, or ask Atlas in the Tutor tab to save explanations directly into your Cascading Notes.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="tactile-btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => {
            const bgMap = {
              sky: 'bg-[#EBF5FB] border-[#94C2DA]',
              pink: 'bg-[#FFF0F7] border-[#E7A0CC]',
              cream: 'bg-[#FAF2EA] border-[#E0D9D1]',
              denim: 'bg-white border-[#4E7CB2]/20',
            };
            return (
              <div
                key={note.id}
                className={`rounded-2xl p-6 border shadow-xs transition-all hover:-translate-y-1 hover:shadow-md flex flex-col justify-between ${
                  bgMap[note.color] || bgMap.cream
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#757683]">
                      <Calendar className="w-3 h-3 text-[#4E7CB2]" />
                      <span>{note.timestamp}</span>
                    </div>
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="text-[#757683] hover:text-rose-600 transition-colors p-1"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-bold text-base text-[#1E1B17] leading-snug">
                    {note.title}
                  </h3>

                  <p className="text-xs text-[#444652] leading-relaxed whitespace-pre-line">
                    {note.content}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-4 mt-3 border-t border-[#4E7CB2]/15">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/80 text-[#203F9A] border border-[#4E7CB2]/15"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
