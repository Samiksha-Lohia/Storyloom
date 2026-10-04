import React, { useState } from 'react';
import { api } from '../services/api';
import { MessageSquare, Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';

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
        <h2 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-slate-800" />
          Ask Questions
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Ask questions about characters, plot points, dialogue, or events. Answers are computed contextually based on the story analysis.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col h-[500px]">
        {/* Chat History Panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <Sparkles className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-semibold">No questions asked yet</p>
              <p className="text-xs max-w-xs">Ask anything about the story, like "Who is Mira?" or "What happens under the park lamp?"</p>
            </div>
          ) : (
            history.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-sm font-serif leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-950 text-white rounded-br-xs'
                      : msg.isError
                      ? 'bg-red-50 border border-red-100 text-red-700 rounded-bl-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/50'
                  }`}
                >
                  {msg.role === 'assistant' && !msg.isError && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold tracking-wider text-purple-600 uppercase font-mono">
                      <Sparkles className="w-3.5 h-3.5" />
                      SceneCraft AI
                    </div>
                  )}
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 border border-slate-200/50 text-slate-500 rounded-2xl rounded-bl-xs p-4 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="border-t border-slate-100 p-4 bg-slate-50/50 rounded-b-2xl">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the manuscript..."
              className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent font-serif"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="px-4 py-3 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-200 text-white rounded-xl flex items-center justify-center transition-colors disabled:text-slate-400"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
