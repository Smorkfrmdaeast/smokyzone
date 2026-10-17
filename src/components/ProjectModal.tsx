import React, { useEffect, useState } from 'react';
import { X, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PortfolioProject } from '../data';

interface ProjectModalProps {
  project: PortfolioProject | null;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setHasError(false);
  }, [project]);

  useEffect(() => {
    if (project) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [project, onClose]);

  if (!project) return null;

  const rawImg = hasError && project.fallbackImage ? project.fallbackImage : project.image;
  const currentImage = rawImg && rawImg.trim() !== '' ? rawImg : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040A]/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0F1D38] border border-[#1E90FF]/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white hover:rotate-90 transition-all p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Project Image */}
        <div className="relative overflow-hidden rounded-xl border border-white/10 mb-6 bg-[#050811] aspect-video">
          {currentImage ? (
            <img
              src={currentImage}
              alt={project.title}
              onError={() => {
                if (project.fallbackImage && !hasError) {
                  setHasError(true);
                }
              }}
              className="w-full h-full object-cover photo-natural"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-mono">
              Image preview unavailable
            </div>
          )}
        </div>

        {/* Disclaimer / Note if Conceptual Example */}
        {project.isExampleConcept && (
          <div className="mb-4 p-3 rounded-lg bg-blue-950/60 border border-blue-500/30 flex items-start gap-2.5 text-xs text-blue-200">
            <AlertCircle className="w-4 h-4 text-[#1E90FF] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Note on Project Scope: </strong>
              {project.note}
            </div>
          </div>
        )}

        {/* Category & Title */}
        <div className="flex items-center gap-2 mb-2 text-xs font-mono text-[#1E90FF]">
          <span>{project.role}</span>
        </div>

        <h3
          id="modal-title"
          className="text-2xl sm:text-3xl font-extrabold text-white mb-3 font-['Outfit',sans-serif]"
        >
          {project.title}
        </h3>

        {/* Description */}
        <p className="text-slate-300 leading-relaxed text-sm sm:text-base mb-6">
          {project.description}
        </p>

        {/* Key Features if available */}
        {project.features && project.features.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-black/40 border border-white/10">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#1E90FF] mb-2.5">
              Key Architecture & Deliverables
            </h4>
            <div className="space-y-2">
              {project.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E90FF] flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technologies used */}
        <div className="mb-6">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Technologies & Disciplines
          </h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {project.technologies.map((tech) => (
              <span
                key={tech}
                className="px-2.5 py-1 rounded bg-[#050811] border border-white/10 text-slate-200 font-mono"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Action bar */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>

          <a
            href="#contact"
            onClick={onClose}
            className="px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded bg-[#1E90FF] text-white hover:bg-[#1873cc] transition-colors flex items-center gap-1.5 shadow-lg shadow-[#1E90FF]/25"
          >
            Inquire About Similar Project <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
