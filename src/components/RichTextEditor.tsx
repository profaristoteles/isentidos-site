import React, { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Escreva o conteúdo aqui...', label }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isVisualMode, setIsVisualMode] = useState(true);
  const [htmlContent, setHtmlContent] = useState(value || '');

  // Sincroniza o valor vindo do componente pai para a div contentEditable
  useEffect(() => {
    if (editorRef.current && isVisualMode) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    setHtmlContent(value || '');
  }, [value, isVisualMode]);

  const handleInput = () => {
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      setHtmlContent(currentHTML);
      onChange(currentHTML);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setHtmlContent(val);
    onChange(val);
  };

  const execCmd = (command: string, arg: string = '') => {
    if (!isVisualMode) return;
    document.execCommand(command, false, arg);
    // Retorna foco para o editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  const addLink = () => {
    if (!isVisualMode) return;
    const url = prompt('Digite o link (ex: https://exemplo.com.br):', 'https://');
    if (url && url !== 'https://') {
      execCmd('createLink', url);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full text-slate-800 font-sans">
      {label && (
        <label className="font-semibold text-sm text-navy block">
          {label}
        </label>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col">
        {/* Barra de ferramentas */}
        <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1 items-center justify-between">
          <div className="flex flex-wrap gap-1 items-center">
            {/* Botões do Editor Visual */}
            <button
              type="button"
              onClick={() => execCmd('bold')}
              disabled={!isVisualMode}
              className={`p-1.5 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Negrito"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6zM6 12h9a4 4 0 014 4 4 4 0 01-4 4H6zM6 4v16" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => execCmd('italic')}
              disabled={!isVisualMode}
              className={`p-1.5 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Itálico"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="4" x2="10" y2="4" />
                <line x1="14" y1="20" x2="5" y2="20" />
                <line x1="15" y1="4" x2="9" y2="20" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => execCmd('underline')}
              disabled={!isVisualMode}
              className={`p-1.5 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Sublinhado"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 4v6a6 6 0 0012 0V4M4 20h16" />
              </svg>
            </button>

            <div className="w-px h-5 bg-slate-300 mx-1" />

            <button
              type="button"
              onClick={() => execCmd('insertUnorderedList')}
              disabled={!isVisualMode}
              className={`p-1.5 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Lista de Marcadores"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <line x1="9" y1="6" x2="20" y2="6" />
                <line x1="9" y1="12" x2="20" y2="12" />
                <line x1="9" y1="18" x2="20" y2="18" />
                <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                <circle cx="4" cy="18" r="1.5" fill="currentColor" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => execCmd('insertOrderedList')}
              disabled={!isVisualMode}
              className={`p-1.5 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Lista Numerada"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <line x1="10" y1="6" x2="20" y2="6" />
                <line x1="10" y1="12" x2="20" y2="12" />
                <line x1="10" y1="18" x2="20" y2="18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h1v4M3 8h3M4 14h2a1 1 0 011 1v1a1 1 0 01-1 1H4v1h3" />
              </svg>
            </button>

            <button
              type="button"
              onClick={addLink}
              disabled={!isVisualMode}
              className={`p-1.5 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Inserir Link"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => execCmd('removeFormat')}
              disabled={!isVisualMode}
              className={`p-1.5 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Limpar Formatação"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12M13 18h5M12 6H7" />
              </svg>
            </button>

            <div className="w-px h-5 bg-slate-300 mx-1" />

            <button
              type="button"
              onClick={() => execCmd('undo')}
              disabled={!isVisualMode}
              className={`p-1.5 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Desfazer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => execCmd('redo')}
              disabled={!isVisualMode}
              className={`p-1.5 rounded-lg text-slate-600 hover:text-navy hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Refazer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>

          {/* Alternador Código/Visual */}
          <button
            type="button"
            onClick={() => setIsVisualMode(!isVisualMode)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold bg-white border border-slate-200 text-navy hover:bg-slate-100 hover:border-slate-300 transition-all"
            title={isVisualMode ? 'Editar Código HTML' : 'Visualizar Editor'}
          >
            {isVisualMode ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-orange-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                </svg>
                Código HTML
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-orange-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Visualizar
              </>
            )}
          </button>
        </div>

        {/* Área editável */}
        <div className="flex-1 bg-white relative">
          {isVisualMode ? (
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              className="p-4 min-h-[220px] max-h-[400px] overflow-y-auto outline-none focus:ring-2 focus:ring-orange-200 text-sm leading-relaxed prose max-w-none text-slate-800"
              style={{ minHeight: '220px' }}
            />
          ) : (
            <textarea
              value={htmlContent}
              onChange={handleTextareaChange}
              placeholder={placeholder}
              className="w-full min-h-[220px] max-h-[400px] p-4 text-xs font-mono bg-slate-900 text-slate-200 outline-none border-none resize-y focus:ring-2 focus:ring-orange-200"
              style={{ minHeight: '220px' }}
            />
          )}

          {/* Placeholder visual */}
          {isVisualMode && !htmlContent && (
            <div className="absolute top-4 left-4 text-slate-400 text-sm pointer-events-none select-none">
              {placeholder}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
