import React, { useState } from 'react';
import { api } from '../services/api';
import { MessageSquare, Send, AlertCircle } from 'lucide-react';
import { APP_NAME } from '../constants/app';

export default function AskQuestionsTab({ documentId, source, options = {} }) {
  const resolvedSource = source || (documentId ? { kind: 'document', id: documentId } : null);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || loading || !resolvedSource?.id) return;

    const currentQuestion = question.trim();
    setQuestion('');
    setError(null);
    setLoading(true);

    // Append user question to history
    setHistory((prev) => [...prev, { role: 'user', content: currentQuestion }]);

    try {
      const response = await api.analysis.ask(resolvedSource, currentQuestion, options);
      const answer = response?.data?.answer || response?.answer || 'No response returned.';
      setHistory((prev) => [
        ...prev,
        { role: 'assistant', content: answer },
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to get an answer. Please try again.');
      setHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: Could not retrieve answer.', isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-ink" />
          Ask Questions
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Ask questions about characters, plot points, dialogue, or events. Answers are computed contextually based on the story analysis.
        </p>
      </div>

      <div className="bg-paper border border-rule rounded flex flex-col h-[500px]">
        {/* Chat History Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted space-y-2">
              <MessageSquare className="w-6 h-6 text-muted" />
              <p className="text-sm font-semibold">No questions asked yet</p>
              <p className="text-xs max-w-xs">Ask anything about the story, like &ldquo;Who is Mira?&rdquo; or &ldquo;What happens under the park lamp?&rdquo;</p>
            </div>
          ) : (
            history.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-ink text-paper'
                      : msg.isError
                      ? 'bg-paper border border-danger text-danger'
                      : 'bg-paper text-ink border border-rule'
                  }`}
                >
                  {msg.role === 'assistant' && !msg.isError && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold tracking-wider text-muted uppercase">
                      {APP_NAME} AI
                    </div>
                  )}
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-paper border border-rule text-muted rounded p-3 text-sm">
                Loading…
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="border-t border-rule p-4 bg-paper rounded-b">
          {error && (
            <div className="mb-3 p-3 bg-paper border border-danger text-danger rounded text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the manuscript..."
              className="flex-1 px-4 py-2 bg-paper border border-rule rounded text-sm focus:outline-hidden focus:ring-1 focus:ring-ink"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="px-4 py-2 bg-ink text-paper hover:bg-accent disabled:opacity-40 rounded flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
