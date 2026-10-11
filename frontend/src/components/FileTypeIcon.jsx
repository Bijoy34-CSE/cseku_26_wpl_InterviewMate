import React from 'react';
import { FileText } from 'lucide-react';

/**
 * Small colored file-type badge (PDF/DOCX/PPTX), used anywhere a document
 * name is shown so it's recognizable at a glance rather than a generic
 * grey file icon. Falls back to a plain FileText icon for other types.
 */
export default function FileTypeIcon({ filename = '', className = 'w-5 h-5' }) {
  const ext = (filename.split('.').pop() || '').toLowerCase();

  if (ext === 'pdf') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#F04438" />
        <path d="M14 2v6h6" fill="#FCA5A5" />
        <text x="12" y="17.5" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">PDF</text>
      </svg>
    );
  }

  if (ext === 'docx' || ext === 'doc') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#2B579A" />
        <path d="M14 2v6h6" fill="#8FB3E4" />
        <text x="12" y="17.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">DOC</text>
      </svg>
    );
  }

  if (ext === 'pptx' || ext === 'ppt') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#D24726" />
        <path d="M14 2v6h6" fill="#F3A98C" />
        <text x="12" y="17.5" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff" fontFamily="Arial, sans-serif">PPT</text>
      </svg>
    );
  }

  return <FileText className={className} />;
}
