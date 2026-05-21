import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [contrast, setContrast] = useState(() => localStorage.getItem('acc-contrast') === 'true');
  const [grayscale, setGrayscale] = useState(() => localStorage.getItem('acc-grayscale') === 'true');
  const [dyslexic, setDyslexic] = useState(() => localStorage.getItem('acc-dyslexic') === 'true');
  const [largeCursor, setLargeCursor] = useState(() => localStorage.getItem('acc-large-cursor') === 'true');
  const [largeText, setLargeText] = useState(() => localStorage.getItem('acc-large-text') === 'true');
  const [readingGuide, setReadingGuide] = useState(() => localStorage.getItem('acc-reading-guide') === 'true');
  const [mouseY, setMouseY] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Monitora o movimento do mouse para a régua de leitura
  useEffect(() => {
    if (!readingGuide) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [readingGuide]);

  // Aplica as classes correspondentes no body e salva no localStorage
  useEffect(() => {
    const body = document.body;

    if (contrast) {
      body.classList.add('acc-contrast');
    } else {
      body.classList.remove('acc-contrast');
    }
    localStorage.setItem('acc-contrast', String(contrast));
  }, [contrast]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    if (grayscale) {
      root.classList.add('acc-grayscale');
    } else {
      root.classList.remove('acc-grayscale');
    }
    localStorage.setItem('acc-grayscale', String(grayscale));
  }, [grayscale]);

  useEffect(() => {
    const body = document.body;
    if (dyslexic) {
      body.classList.add('acc-dyslexic');
    } else {
      body.classList.remove('acc-dyslexic');
    }
    localStorage.setItem('acc-dyslexic', String(dyslexic));
  }, [dyslexic]);

  useEffect(() => {
    const body = document.body;
    if (largeCursor) {
      body.classList.add('acc-large-cursor');
    } else {
      body.classList.remove('acc-large-cursor');
    }
    localStorage.setItem('acc-large-cursor', String(largeCursor));
  }, [largeCursor]);

  useEffect(() => {
    const body = document.body;
    if (largeText) {
      body.classList.add('acc-large-text');
    } else {
      body.classList.remove('acc-large-text');
    }
    localStorage.setItem('acc-large-text', String(largeText));
  }, [largeText]);

  useEffect(() => {
    localStorage.setItem('acc-reading-guide', String(readingGuide));
  }, [readingGuide]);

  const resetAll = () => {
    setContrast(false);
    setGrayscale(false);
    setDyslexic(false);
    setLargeCursor(false);
    setLargeText(false);
    setReadingGuide(false);
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Régua de Leitura */}
      {readingGuide && (
        <div
          className="acc-reading-guide active"
          style={{ top: `${mouseY}px` }}
        />
      )}

      {/* Widget flutuante */}
      <div className="fixed bottom-6 left-6 z-50 acc-exclude font-sans">
        {/* Botão de Abertura */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Opções de Acessibilidade"
          className="w-14 height-14 h-14 bg-navy hover:bg-orange-primary text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-orange-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="5" r="1" />
            <path d="m9 20 3-6 3 6" />
            <path d="m6 8 6 2 6-2" />
            <path d="M12 10v4" />
          </svg>
        </button>

        {/* Painel de Opções */}
        {isOpen && (
          <div className="absolute bottom-16 left-0 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-lg text-navy flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-orange-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8" />
                  <path d="M8 12h8" />
                </svg>
                Acessibilidade
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                aria-label="Fechar painel"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Alto Contraste */}
              <button
                onClick={() => setContrast(!contrast)}
                className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                  contrast
                    ? 'bg-navy text-white border-navy'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2v20a10 10 0 0 0 0-20z" />
                  </svg>
                  Alto Contraste
                </span>
                <span className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 ${contrast ? 'bg-orange-primary' : 'bg-slate-300'}`}>
                  <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${contrast ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
              </button>

              {/* Escala de Cinza */}
              <button
                onClick={() => setGrayscale(!grayscale)}
                className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                  grayscale
                    ? 'bg-navy text-white border-navy'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 18a6 6 0 1 0 0-12v12z" />
                  </svg>
                  Escala de Cinza
                </span>
                <span className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 ${grayscale ? 'bg-orange-primary' : 'bg-slate-300'}`}>
                  <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${grayscale ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
              </button>

              {/* Fonte para Dislexia */}
              <button
                onClick={() => setDyslexic(!dyslexic)}
                className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                  dyslexic
                    ? 'bg-navy text-white border-navy'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                  </svg>
                  Fonte P/ Dislexia
                </span>
                <span className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 ${dyslexic ? 'bg-orange-primary' : 'bg-slate-300'}`}>
                  <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${dyslexic ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
              </button>

              {/* Cursor Ampliado */}
              <button
                onClick={() => setLargeCursor(!largeCursor)}
                className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                  largeCursor
                    ? 'bg-navy text-white border-navy'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m4 4 7.07 16.97 2.51-6.67 6.67-2.51L4 4z" />
                  </svg>
                  Cursor Ampliado
                </span>
                <span className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 ${largeCursor ? 'bg-orange-primary' : 'bg-slate-300'}`}>
                  <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${largeCursor ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
              </button>

              {/* Régua de Leitura */}
              <button
                onClick={() => setReadingGuide(!readingGuide)}
                className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                  readingGuide
                    ? 'bg-navy text-white border-navy'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 3h14c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2z" />
                    <path d="M3 12h18" />
                  </svg>
                  Guia de Leitura
                </span>
                <span className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 ${readingGuide ? 'bg-orange-primary' : 'bg-slate-300'}`}>
                  <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${readingGuide ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
              </button>

              {/* Zoom de Texto */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium">
                <span className="flex items-center gap-3 text-slate-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
                    <path d="M10 7v6M7 10h6" />
                  </svg>
                  Tamanho do Texto
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLargeText(false)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base transition-colors ${
                      !largeText ? 'bg-navy text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                    title="Texto Normal"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setLargeText(true)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base transition-colors ${
                      largeText ? 'bg-navy text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                    title="Texto Ampliado"
                  >
                    A+
                  </button>
                </div>
              </div>
            </div>

            {/* Resetar Tudo */}
            <button
              onClick={resetAll}
              className="w-full mt-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Redefinir Opções
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
