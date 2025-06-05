"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const notify = (msg: string) => alert(msg);

type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  theme?: string;
};

const themeStyles: Record<string, React.CSSProperties> = {
  vanilla: {
    background: '#fffaf0',
    color: '#3b3b3b'
  },
  chocolate: {
    background: '#3e2723',
    color: '#fff8e1'
  },
  dark: {
    background: '#1f2937',
    color: '#e5e7eb'
  },
  light: {
    background: '#ffffff',
    color: '#111827'
  }
};

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTheme, setNewTheme] = useState('vanilla');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchNotes = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) console.error('Error loading notes:', error);
      else setNotes(data);
    };

    fetchNotes();
  }, []);

  const selectedNote = notes.find(note => note.id === selectedNoteId);

  const createNewNote = () => {
    setSelectedNoteId(null);
    setNewTitle('');
    setNewContent('');
    setNewTheme('vanilla');
  };

  const saveNote = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    if (selectedNoteId) {
      const { error } = await supabase
        .from('notes')
        .update({ title: newTitle, content: newContent, theme: newTheme })
        .eq('id', selectedNoteId);

      if (error) return notify('Error saving note');
      setNotes(prev =>
        prev.map(note =>
          note.id === selectedNoteId ? { ...note, title: newTitle, content: newContent, theme: newTheme } : note
        )
      );
      notify('Note updated');
    } else {
      const { data, error } = await supabase
        .from('notes')
        .insert([
          {
            title: newTitle || 'Untitled',
            content: newContent,
            theme: newTheme,
            user_id: user.id,
          },
        ])
        .select(); 

      if (error) {
        console.error('Supabase insert error:', error.message);
        return notify('Error saving new note: ' + error.message);
      }

      const inserted = data as Note[]; 
      setNotes(prev => [...prev, ...inserted]);
      if (inserted?.[0]?.id) setSelectedNoteId(inserted[0].id);
      notify('Note added');
    }
  };
  const deleteNote = async () => {
    if (!selectedNoteId) return;
    const { error } = await supabase.from('notes').delete().eq('id', selectedNoteId);
    if (error) return notify('Failed to delete note');
    setNotes(prev => prev.filter(note => note.id !== selectedNoteId));
    setSelectedNoteId(null);
    setNewTitle('');
    setNewContent('');
    setNewTheme('vanilla');
    notify('Note deleted');
  };


  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) notify('Error logging out');
    else router.push('/login');
  };

  useEffect(() => {
    if (selectedNote) {
      setNewTitle(selectedNote.title);
      setNewContent(selectedNote.content);
      setNewTheme(selectedNote.theme || 'vanilla');
    }
  }, [selectedNoteId]);

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ position: 'absolute', top: '45.5rem', left: '1rem', zIndex: 1000 }}
      >
        ☰
      </button>

      <aside
        style={{
          width: sidebarOpen ? '250px' : '0',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          background: '#1e293b',
          color: '#fff',
          borderRight: sidebarOpen ? '1px solid #ccc' : 'none',
          padding: sidebarOpen ? '1rem' : '0',
        }}
      >
        {sidebarOpen && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Notes</h2>
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ marginBottom: '1rem', padding: '0.5rem', width: '100%' }}
            />
            <button onClick={createNewNote} style={{ marginBottom: '1rem', width: '100%' }}>+ New Note</button>
            <ul>
              {filteredNotes.map(note => (
                <li key={note.id}>
                  <button
                    onClick={() => setSelectedNoteId(note.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: selectedNoteId === note.id ? '#3b82f6' : '#334155',
                      color: '#fff',
                      fontWeight: selectedNoteId === note.id ? 700 : 500,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      marginBottom: '0.5rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    {note.title || 'Untitled'}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '1rem', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={handleLogout}>Logout</button>
          {selectedNoteId && <button onClick={deleteNote} style={{ backgroundColor: '#ef4444', color: '#fff' }}>Delete</button>}
        </header>

        <div className={`note-theme-${newTheme}`} style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <input
            className="note-title"
            placeholder="Title"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              padding: '0.75rem',
              width: '100%',
              marginBottom: '1rem',
              borderRadius: '6px',
              border: '1px solid #ccc'
            }}
          />
          <textarea
            className="note-content"
            placeholder="Write your note here..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            style={{ height: '50vh', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ccc', width: '100%', marginBottom: '1rem' }}
          />
          <select
            value={newTheme}
            onChange={e => setNewTheme(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', marginBottom: '1rem' }}
          >
            <option value="vanilla">Vanilla</option>
            <option value="chocolate">Chocolate</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <footer style={{ padding: '1rem', borderTop: '1px solid #ddd', textAlign: 'right' }}>
          <button onClick={saveNote}>Save Note</button>
        </footer>
      </main>
    </div>
  );
}
