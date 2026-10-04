import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';

export default function MatureGateModal({ isOpen, onAcknowledge }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      await api.me.matureAck();
      onAcknowledge();
    } catch (err) {
      setError(err.message || 'Failed to record mature content acknowledgement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 text-stone-900">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
            Age Verification & Content Warning
          </span>
          <h2 className="font-heading text-2xl font-black">Mature Content (18+)</h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            This story has been marked by the author as containing mature themes, explicit language, violence, or sensitive situations intended for adult audiences.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 space-y-1">
          <p className="font-bold text-stone-800">Please confirm:</p>
          <p>You are at least 18 years of age and consent to viewing mature literary content.</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            Go Back
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={loading}
            className="shadow-sm"
          >
            {loading ? 'Confirming...' : 'I am 18+ — Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
