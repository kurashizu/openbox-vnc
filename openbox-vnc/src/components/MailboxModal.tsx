"use client";
import { useState, useEffect, useRef } from "react";

interface Email {
  id: string;
  created_at: string;
  from: string;
  subject: string;
  html: string;
  text: string | null;
  to: string;
  cc: string;
  bcc: string;
  reply_to: string;
  message_id: string;
  attachments: string;
}

interface MailboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "mailbox_last_email";
const DOMAIN = "@email.022025.xyz";

export default function MailboxModal({ isOpen, onClose }: MailboxModalProps) {
  const [prefix, setPrefix] = useState("");
  const [lastSearched, setLastSearched] = useState("");
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<Record<string, "html" | "text">>({});
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const fullEmail = saved.includes(DOMAIN) ? saved : saved + DOMAIN;
      setPrefix(fullEmail.replace(DOMAIN, ""));
      setLastSearched(fullEmail);
    }
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = async () => {
    const fullEmail = prefix + DOMAIN;
    if (!prefix.trim()) return;
    setLoading(true);
    setExpandedId(null);
    localStorage.setItem(STORAGE_KEY, fullEmail);
    setLastSearched(fullEmail);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: fullEmail }),
      });
      const data = await res.json() as { emails?: Email[] };
      setEmails(data.emails || []);
    } catch (e) {
      console.error("Search failed:", e);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleView = (id: string, mode: "html" | "text") => {
    setViewMode((prev) => ({ ...prev, [id]: mode }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[80vh] mx-4 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            📧 Mailbox
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onMouseEnter={() => setShowHelp(true)}
                onMouseLeave={() => setShowHelp(false)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors text-sm font-bold"
              >
                ?
              </button>
              {showHelp && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900 border border-gray-600 rounded-lg shadow-xl p-3 z-50">
                  <h3 className="text-xs font-semibold text-white mb-2">Mailbox Help</h3>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>1. Enter email prefix (xxx part)</p>
                    <p>2. Click Search or press Enter</p>
                    <p>3. Only keeps 20 most recent emails</p>
                    <p>4. Click email to expand/collapse</p>
                    <p>5. Click HTML/Text to switch view</p>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-gray-900 border border-gray-600 rounded-lg px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="xxx"
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
              />
              <span className="text-gray-500 text-sm">@email.022025.xyz</span>
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? "..." : "Search"}
            </button>
          </div>
          {lastSearched && (
            <p className="mt-2 text-xs text-gray-500">
              Last searched: {lastSearched}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {emails.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">
              {lastSearched ? "No emails found for this address" : "Enter email above to search"}
            </p>
          ) : (
            <div className="space-y-2">
              {emails.map((item) => {
                const isExpanded = expandedId === item.id;
                const mode = viewMode[item.id] || "html";
                const attachments = JSON.parse(item.attachments || "[]");
                const date = new Date(item.created_at).toLocaleString("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-gray-750 transition-colors"
                    >
                      <span className="text-lg">📬</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{date}</span>
                        </div>
                        <p className="text-sm text-gray-300 truncate">
                          <span className="text-gray-500">From:</span> {item.from}
                        </p>
                        <p className="text-sm text-white font-medium truncate">
                          {item.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {mode === "html" ? "HTML" : "Text"}
                          </span>
                          <span className="text-xs text-gray-600">•</span>
                          <span className="text-xs text-gray-500">
                            Attachments: {attachments.length}
                          </span>
                        </div>
                      </div>
                      <span className={`text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                        ▶
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-700 pt-3">
                        <div className="flex items-center gap-2 mb-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleView(item.id, "html"); }}
                            className={`px-3 py-1 text-xs rounded ${mode === "html" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                          >
                            HTML
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleView(item.id, "text"); }}
                            className={`px-3 py-1 text-xs rounded ${mode === "text" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                          >
                            Text
                          </button>
                        </div>

                        {mode === "html" ? (
                          <div
                            className="prose prose-sm prose-invert max-w-none text-sm text-gray-300 mb-3 overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: item.html }}
                          />
                        ) : (
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap mb-3">{item.text || "(no text content)"}</pre>
                        )}

                        <div className="text-xs text-gray-500 space-y-1 border-t border-gray-700 pt-3">
                          <p><span className="text-gray-400">From:</span> {item.from}</p>
                          <p><span className="text-gray-400">To:</span> {item.to}</p>
                          <p><span className="text-gray-400">Message-ID:</span> {item.message_id}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}