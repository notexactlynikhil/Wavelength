import React, { useState, useEffect } from 'react';
import { AIPipelineResponse, AIHealthResponse } from '../../types';
import { 
  Bot, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Sparkles, 
  Tag, 
  CheckSquare, 
  Calendar, 
  Clock, 
  Cpu 
} from 'lucide-react';

interface AIPipelineTesterProps {
  onResult?: (response: AIPipelineResponse) => void;
}

export const AIPipelineTester: React.FC<AIPipelineTesterProps> = ({ onResult }) => {
  const [health, setHealth] = useState<AIHealthResponse | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<AIPipelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkAIHealth = async () => {
    setCheckingHealth(true);
    setError(null);
    try {
      if (window.ai?.checkHealth) {
        const res = await window.ai.checkHealth();
        setHealth(res);
      } else {
        setHealth({ status: 'offline', error: 'window.ai bridge is not available (running in browser mode)' });
      }
    } catch (err: any) {
      setHealth({ status: 'offline', error: err?.message || 'Failed to connect to AI bridge' });
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkAIHealth();
  }, []);

  const handleProcessSampleCall = async () => {
    setLoading(true);
    setError(null);
    try {
      if (window.ai?.processSampleCall) {
        const res = await window.ai.processSampleCall();
        if (res.status === 'SUCCESS') {
          setResponse(res);
          onResult?.(res);
        } else {
          setError(res.metadata?.errors?.join(', ') || `AI Pipeline returned status: ${res.status}`);
          setResponse(res);
          onResult?.(res);
        }
      } else {
        setError('window.ai bridge unavailable. Launch Wavelength inside Electron desktop client to run local AI processing.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error processing sample call');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-theme-successMuted text-theme-success border border-theme-successMuted">Positive</span>;
      case 'negative':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-theme-dangerMuted text-theme-danger border border-theme-dangerMuted">Negative</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-theme-surfaceHover text-theme-textMuted border border-theme-border">Neutral</span>;
    }
  };


  return (
    <div className="p-6 bg-theme-surface border border-theme-border rounded-2xl space-y-5 shadow-xs">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-theme-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-theme-accentMuted text-theme-accent border border-theme-accent/20 rounded-xl">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-theme-text flex items-center gap-2 font-display">
              Phase 1 Local AI Pipeline Bridge
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-theme-base border border-theme-border text-theme-textMuted">
                Whisper + LLaMA 3.2
              </span>
            </h3>
            <p className="text-xs text-theme-textMuted mt-0.5">
              Processes audio recordings using local Python service on 127.0.0.1:8000
            </p>
          </div>
        </div>

        {/* Health Status & Run Button */}
        <div className="flex items-center gap-3">
          {/* Health Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-surface border border-theme-border rounded-xl text-xs shadow-xs">
            <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-theme-success' : 'bg-theme-accentLime animate-pulse'}`} />
            <span className="font-semibold text-theme-text">
              {checkingHealth ? 'Checking AI Server...' : health?.status === 'ok' ? `AI Ready (${health.llm_model})` : 'Checking AI Server...'}
            </span>
          </div>

          <button
            onClick={handleProcessSampleCall}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-theme-accent hover:bg-theme-accentHover active:scale-95 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition duration-150 shadow-xs disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processing Audio & Analyzing...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Process Sample Call</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-theme-dangerMuted border border-theme-dangerMuted rounded-xl text-theme-danger text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">AI Pipeline Issue</div>
            <div className="mt-0.5 opacity-90">{error}</div>
          </div>
        </div>
      )}

      {/* Results View */}
      {response && response.status === 'SUCCESS' && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-theme-base border border-theme-border rounded-xl">
              <div className="flex items-center gap-1.5 text-theme-textMuted text-[11px] font-semibold">
                <Clock className="w-3.5 h-3.5 text-theme-accent" />
                <span>Audio Duration</span>
              </div>
              <div className="text-sm font-bold text-theme-text mt-1 font-mono">
                {response.metadata?.audio_duration_seconds}s
              </div>
            </div>

            <div className="p-3 bg-theme-base border border-theme-border rounded-xl">
              <div className="flex items-center gap-1.5 text-theme-textMuted text-[11px] font-semibold">
                <Cpu className="w-3.5 h-3.5 text-theme-accent" />
                <span>Processing Latency</span>
              </div>
              <div className="text-sm font-bold text-theme-text mt-1 font-mono">
                {response.metadata?.processing_time_seconds}s
              </div>
            </div>

            <div className="p-3 bg-theme-base border border-theme-border rounded-xl">
              <div className="flex items-center gap-1.5 text-theme-textMuted text-[11px] font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-theme-accent" />
                <span>Whisper Model</span>
              </div>
              <div className="text-sm font-bold text-theme-text mt-1 uppercase">
                {response.metadata?.transcription_model}
              </div>
            </div>

            <div className="p-3 bg-theme-base border border-theme-border rounded-xl">
              <div className="flex items-center gap-1.5 text-theme-textMuted text-[11px] font-semibold">
                <Bot className="w-3.5 h-3.5 text-theme-accent" />
                <span>Local LLM</span>
              </div>
              <div className="text-sm font-bold text-theme-text mt-1 font-mono truncate">
                {response.metadata?.llm_model}
              </div>
            </div>
          </div>

          {/* Transcript Box */}
          <div className="p-4 bg-theme-base border border-theme-border rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-theme-textMuted uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-theme-accent" />
              Speech-to-Text Transcript
            </h4>
            <div className="p-3 bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-text leading-relaxed max-h-48 overflow-y-auto">
              {response.transcript}
            </div>
          </div>

          {/* Structured Call Report */}
          <div className="p-5 bg-theme-surface border border-theme-border rounded-2xl space-y-4 shadow-xs">
            <h4 className="text-xs font-bold text-theme-textMuted uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-theme-accent" />
              Structured Call Report
            </h4>

            {/* Badges & Key Metadata */}
            <div className="flex items-center gap-4 flex-wrap pb-3 border-b border-theme-border">
              <div className="flex items-center gap-2">
                <span className="text-xs text-theme-textMuted font-medium">Sentiment:</span>
                {getSentimentBadge(response.analysis?.sentiment)}
              </div>
            </div>

            {/* Summary */}
            <div>
              <div className="text-xs font-semibold text-theme-textMuted">Executive Summary:</div>
              <p className="text-xs text-theme-text mt-1 leading-relaxed">
                {response.analysis?.summary}
              </p>
            </div>

            {/* Customer Intent */}
            {response.analysis?.customer_intent && (
              <div>
                <div className="text-xs font-semibold text-theme-textMuted">Customer Intent:</div>
                <p className="text-xs text-theme-text mt-1 leading-relaxed">
                  {response.analysis?.customer_intent}
                </p>
              </div>
            )}

            {/* Products Discussed */}
            {response.analysis?.products_discussed && response.analysis.products_discussed.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-theme-textMuted mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-theme-accent" />
                  Properties / Listings Discussed:
                </div>
                <div className="flex flex-wrap gap-2">
                  {response.analysis.products_discussed.map((product, idx) => (
                    <span key={idx} className="px-2.5 py-1 text-xs bg-theme-base border border-theme-border text-theme-text rounded-md font-medium">
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {response.analysis?.action_items && response.analysis.action_items.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-theme-textMuted mb-2 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-theme-accent" />
                  Action Items:
                </div>
                <div className="space-y-1.5">
                  {response.analysis.action_items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-theme-text p-2 bg-theme-base border border-theme-border rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-theme-success shrink-0 mt-0.5" />
                      <div>
                        <span>{item.description}</span>
                        {item.due_date && (
                          <span className="ml-2 text-[10px] text-theme-textMuted bg-theme-surface border border-theme-border px-1.5 py-0.5 rounded font-mono">
                            Due: {item.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow Up */}
            {response.analysis?.follow_up && (
              <div className="p-3 bg-theme-base border border-theme-border rounded-xl flex items-start gap-2.5 text-xs text-theme-text">
                <Calendar className="w-4 h-4 text-theme-accent shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-theme-text">Follow Up Required: </span>
                  <span className={response.analysis.follow_up.required ? "text-theme-accentLime font-bold" : "text-theme-textMuted"}>
                    {response.analysis.follow_up.required ? "Yes" : "No"}
                  </span>
                  {response.analysis.follow_up.reason && (
                    <div className="text-theme-textMuted mt-0.5">
                      {response.analysis.follow_up.reason}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

