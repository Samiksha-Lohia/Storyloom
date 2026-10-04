import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Workspace from '../../components/Workspace';

export function DevWorkspacePage() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs font-mono text-amber-900 flex items-center justify-between">
        <span>🔧 DEV ANALYSIS WORKSPACE: Document #{documentId}</span>
        <button
          onClick={handleBack}
          className="underline font-bold hover:text-amber-950 cursor-pointer"
        >
          &larr; Exit Dev Mode
        </button>
      </div>
      <Workspace documentId={documentId} onBack={handleBack} />
    </div>
  );
}
