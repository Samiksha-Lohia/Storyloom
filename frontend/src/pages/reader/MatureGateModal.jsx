import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70">
      <div className="bg-paper rounded max-w-md w-full p-6 space-y-6 border border-rule text-ink">
        <div className="flex items-center gap-2 text-danger">
          <ShieldAlert className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Age Verification &amp; Content Warning
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold">Mature Content (18+)</h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed font-body">
            This story has been marked by the author as containing mature themes, explicit language, violence, or sensitive situations intended for adult audiences.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-paper border border-danger rounded text-xs text-danger">
            {error}
          </div>
        )}

        <div className="p-3 bg-paper rounded border border-rule text-xs text-muted space-y-1">
          <p className="font-bold text-ink">Please confirm:</p>
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
          >
            {loading ? 'Confirming...' : 'I am 18+ — Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
