import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Copy, Check, AlertCircle, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { generateCitation, CitationResult, SourceType, CitationMetadata, CitationModelId } from './services/gemini';

export default function App() {
  const [input, setInput] = useState('');
  const [typeHint, setTypeHint] = useState('Auto');
  const [loading, setLoading] = useState(false);
  const [modelId, setModelId] = useState<CitationModelId>('gemini-2.5-flash');
  const [result, setResult] = useState<CitationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualApiKey, setManualApiKey] = useState('');
  
  // Editable state for metadata
  const [editableMetadata, setEditableMetadata] = useState<CitationMetadata>({});
  const [editableCitation, setEditableCitation] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('citation_manual_gemini_api_key');
    if (saved) setManualApiKey(saved);
  }, []);

  const handleApiKeyChange = (value: string) => {
    setManualApiKey(value);
    if (value.trim()) {
      localStorage.setItem('citation_manual_gemini_api_key', value.trim());
    } else {
      localStorage.removeItem('citation_manual_gemini_api_key');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await generateCitation(input, typeHint, manualApiKey.trim() || undefined, modelId);
      setResult(res);
      setEditableMetadata(res.metadata || {});
      setEditableCitation(res.citation || '');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the citation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableCitation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMetadataChange = (field: keyof CitationMetadata, value: string) => {
    setEditableMetadata(prev => ({ ...prev, [field]: value }));
  };

  // Simple local generator for when fields are edited
  const regenerateLocalCitation = () => {
    if (!result) return;
    const type = result.sourceType;
    const meta = editableMetadata;
    let newCitation = '';

    if (type === 'court_case') {
      const caseName = meta.caseName ? `${meta.caseName}, ` : '';
      const docket = meta.docketNumber ? `${meta.docketNumber} ` : '';
      const courtYear = (meta.court || meta.year) ? `(${[meta.court, meta.year].filter(Boolean).join(' ')})` : '';
      newCitation = `${caseName}${docket}${courtYear}.`.trim().replace(/\s+/g, ' ');
    } else if (type === 'enforcement_action') {
      const agency = meta.agencyName ? `${meta.agencyName}, ` : '';
      const title = meta.title ? `${meta.title} ` : '';
      const date = meta.date ? `(${meta.date}), ` : '';
      const url = meta.url ? meta.url : '';
      newCitation = `${agency}${title}${date}${url}`.trim().replace(/,\s*$/, '.');
    } else if (type === 'guidance_page') {
      const agency = meta.agencyName ? `${meta.agencyName}, ` : '';
      const title = meta.title ? `${meta.title}, ` : '';
      const url = meta.url ? `${meta.url} ` : '';
      const visited = meta.lastVisited ? `(last visited ${meta.lastVisited})` : '';
      newCitation = `${agency}${title}${url}${visited}.`.trim().replace(/\s+/g, ' ');
    }

    setEditableCitation(newCitation);
  };

  const getSourceTypeLabel = (type: SourceType) => {
    switch (type) {
      case 'court_case': return 'Court Case / Litigation';
      case 'enforcement_action': return 'Enforcement Action / Settlement';
      case 'guidance_page': return 'Guidance / Webpage';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-2">Rose Citation Assistant</h1>
          <p className="text-zinc-500">Bluebook Citation App POC for legal research sources</p>
          <div className="mt-4 mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Demo only — outputs can contain errors or hallucinations. Always verify sources and citations before use.
          </div>
        </header>

        {/* Input Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 mb-8"
        >
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="input" className="block text-sm font-medium text-zinc-700 mb-2">
                Describe the source you want to cite
              </label>
              <textarea
                id="input"
                rows={3}
                className="w-full rounded-xl border-zinc-300 border p-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all resize-none"
                placeholder="e.g., NY AG v. Allstate data breach..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-zinc-700 mb-2">
                Google Gemini API Key (manual override)
              </label>
              <input
                id="apiKey"
                type="password"
                className="w-full rounded-xl border-zinc-300 border p-3 text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                placeholder="AIza... (saved locally in this browser)"
                value={manualApiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
              />
              <p className="text-xs text-zinc-500 mt-2">
                Optional: leave blank to use environment config. This key is stored in localStorage on this device only.
              </p>
              <p className="text-xs text-zinc-600 mt-2">
                Active model: <span className="font-mono">{modelId}</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between w-full">
              <div className="hidden" aria-hidden="true">
                <label htmlFor="modelId" className="sr-only">Model</label>
                <select
                  id="modelId"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value as CitationModelId)}
                >
                  <option value="gemini-3.1-pro-preview-customtools">Gemini 3.1 Pro (Tools)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                  <option value="gemini-3-flash-preview">Gemini 3.0 Flash</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </select>
              </div>

              <div className="w-full sm:w-64">
                <label htmlFor="typeHint" className="sr-only">Source Type Hint</label>
                <select
                  id="typeHint"
                  className="w-full rounded-lg border-zinc-300 border px-3 py-2 text-sm text-zinc-700 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none bg-white"
                  value={typeHint}
                  onChange={(e) => setTypeHint(e.target.value)}
                >
                  <option value="Auto">Auto-detect Source Type</option>
                  <option value="Court Case">Court Case</option>
                  <option value="Enforcement Action">Enforcement Action</option>
                  <option value="Guidance Page">Guidance Page</option>
                </select>
              </div>
              
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Finding Source...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find and Cite
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 text-red-800 rounded-xl p-4 mb-8 flex items-start border border-red-100"
          >
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {/* Results Section */}
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Citation Output */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-zinc-900">Final Citation</h2>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                >
                  {copied ? (
                    <><Check className="w-4 h-4 mr-1.5 text-emerald-600" /> Copied</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-1.5" /> Copy Citation</>
                  )}
                </button>
              </div>
              
              <textarea
                value={editableCitation}
                onChange={(e) => setEditableCitation(e.target.value)}
                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl font-serif text-lg text-zinc-900 resize-y min-h-[100px] focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none"
              />
            </div>

            {/* Source Info & Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Source Info */}
              <div className="md:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
                  <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">Source Info</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs text-zinc-500 mb-1">Detected Type</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
                        {getSourceTypeLabel(result.sourceType)}
                      </span>
                    </div>
                    
                    <div>
                      <span className="block text-xs text-zinc-500 mb-1">Confidence</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.confidence === 'high' ? 'bg-emerald-100 text-emerald-800' :
                        result.confidence === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)}
                      </span>
                    </div>

                    {result.sourceUrl && (
                      <div>
                        <span className="block text-xs text-zinc-500 mb-1">Source Link</span>
                        <a 
                          href={result.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                        >
                          View Source <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-100 rounded-2xl p-5 border border-zinc-200">
                  <div className="flex items-start">
                    <Info className="w-4 h-4 text-zinc-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {result.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Metadata Editor */}
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Extracted Fields</h3>
                  <button 
                    onClick={regenerateLocalCitation}
                    className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
                  >
                    Update Citation from Fields
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.sourceType === 'court_case' && (
                    <>
                      <FieldInput label="Case Name" value={editableMetadata.caseName} onChange={(v) => handleMetadataChange('caseName', v)} />
                      <FieldInput label="Docket Number" value={editableMetadata.docketNumber} onChange={(v) => handleMetadataChange('docketNumber', v)} />
                      <FieldInput label="Court" value={editableMetadata.court} onChange={(v) => handleMetadataChange('court', v)} />
                      <FieldInput label="Year" value={editableMetadata.year} onChange={(v) => handleMetadataChange('year', v)} />
                    </>
                  )}
                  
                  {result.sourceType === 'enforcement_action' && (
                    <>
                      <FieldInput label="Agency Name" value={editableMetadata.agencyName} onChange={(v) => handleMetadataChange('agencyName', v)} />
                      <FieldInput label="Title" value={editableMetadata.title} onChange={(v) => handleMetadataChange('title', v)} />
                      <FieldInput label="Date" value={editableMetadata.date} onChange={(v) => handleMetadataChange('date', v)} />
                      <FieldInput label="URL" value={editableMetadata.url} onChange={(v) => handleMetadataChange('url', v)} />
                    </>
                  )}
                  
                  {result.sourceType === 'guidance_page' && (
                    <>
                      <FieldInput label="Agency Name" value={editableMetadata.agencyName} onChange={(v) => handleMetadataChange('agencyName', v)} />
                      <FieldInput label="Page Title" value={editableMetadata.title} onChange={(v) => handleMetadataChange('title', v)} />
                      <FieldInput label="URL" value={editableMetadata.url} onChange={(v) => handleMetadataChange('url', v)} />
                      <FieldInput label="Last Visited" value={editableMetadata.lastVisited} onChange={(v) => handleMetadataChange('lastVisited', v)} />
                    </>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function FieldInput({ label, value, onChange }: { label: string, value?: string, onChange: (val: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-zinc-200 border px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </div>
  );
}

