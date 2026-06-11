"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import AudioPlayer from "./AudioPlayer";
import MailboxModal from "./MailboxModal";

export default function Navbar() {
    const [status, setStatus] = useState<"online" | "offline" | "unknown">(
        "unknown",
    );
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uptime, setUptime] = useState<string>("");
    const [clipboardFeedback, setClipboardFeedback] = useState<
        "copy" | "paste" | null
    >(null);
    const [clipboardContent, setClipboardContent] = useState<string | null>(null);
    const [mailboxOpen, setMailboxOpen] = useState(false);
    const [showCopyTooltip, setShowCopyTooltip] = useState(false);
    const [showPasteTooltip, setShowPasteTooltip] = useState(false);
    const connectedRef = useRef(false);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch("/api/status");
            const data = (await res.json()) as {
                status?: string;
                started_at?: string;
            };
            const newStatus = data.status === "online" ? "online" : "offline";
            setStatus((prev) => {
                if (
                    prev !== "unknown" &&
                    prev === "offline" &&
                    newStatus === "online"
                ) {
                    window.dispatchEvent(new CustomEvent("vnc-reconnect"));
                }
                return newStatus;
            });
            setUptime(
                newStatus === "online" && data.started_at
                    ? `(${data.started_at})`
                    : "",
            );
            if (newStatus === "online" && !connectedRef.current) {
                window.dispatchEvent(new CustomEvent("vnc-reconnect"));
            }
        } catch {
            setStatus("offline");
            setUptime("");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        setLoading(true);
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    useEffect(() => {
        const handleVncConnect = () => {
            connectedRef.current = true;
            setConnected(true);
        };
        const handleVncDisconnect = () => {
            connectedRef.current = false;
            setConnected(false);
        };
        window.addEventListener("vnc-connect", handleVncConnect);
        window.addEventListener("vnc-disconnect", handleVncDisconnect);
        return () => {
            window.removeEventListener("vnc-connect", handleVncConnect);
            window.removeEventListener("vnc-disconnect", handleVncDisconnect);
        };
    }, []);

    const handleControl = async (action: "start" | "stop") => {
        if (loading) return;
        setLoading(true);
        connectedRef.current = false;
        setConnected(false);
        try {
            await fetch(`/api/${action}`, { method: "POST" });
        } catch (e) {
            console.error(e);
        }
    };

    const handleCopy = async () => {
        try {
            const res = await fetch("/api/clipboard");
            const data = (await res.json()) as { clipboard?: string };
            if (data.clipboard) {
                await navigator.clipboard.writeText(data.clipboard);
                setClipboardContent(data.clipboard);
                setClipboardFeedback("copy");
                setShowCopyTooltip(true);
                setTimeout(() => {
                    setClipboardFeedback(null);
                    setShowCopyTooltip(false);
                    setClipboardContent(null);
                }, 2000);
            }
        } catch (e) {
            console.error("Copy failed:", e);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            await fetch("/api/clipboard", {
                method: "POST",
                body: text,
                headers: { "Content-Type": "text/plain" },
            });
            setClipboardContent(text);
            setClipboardFeedback("paste");
            setShowPasteTooltip(true);
            setTimeout(() => {
                setClipboardFeedback(null);
                setShowPasteTooltip(false);
                setClipboardContent(null);
            }, 2000);
        } catch (e) {
            console.error("Paste failed:", e);
        }
    };

    const formatClipboard = (text: string) => {
        if (text.length <= 20) return text;
        return text.slice(0, 10) + "..." + text.slice(-10);
    };

    const handleFullScreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    };

    return (
        <>
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
            <nav className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 relative">
                <div className="flex items-center gap-3">
                    <span
                        className="text-xl font-bold tracking-wide"
                        style={{
                            background:
                                "linear-gradient(90deg, #1e3a8a, #3b82f6, #1e3a8a, #60a5fa, #1e3a8a)",
                            backgroundSize: "200% 100%",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            animation: "shimmer 3s ease-in-out infinite",
                        }}
                    >
                        Kurashizu Openbox
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <button
                            onClick={handleCopy}
                            disabled={loading}
                            className="px-3 py-1 text-xs rounded text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            {clipboardFeedback === "copy" ? "✓ Copied!" : "📄 Copy"}
                        </button>
                        {showCopyTooltip && clipboardContent && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-2 z-50">
                                <p className="text-xs text-gray-400 truncate">{formatClipboard(clipboardContent)}</p>
                            </div>
                        )}
                    </div>
                    <div className="relative group">
                        <button
                            onClick={handlePaste}
                            disabled={loading}
                            className="px-3 py-1 text-xs rounded text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            {clipboardFeedback === "paste" ? "✓ Pasted!" : "📋 Paste"}
                        </button>
                        {showPasteTooltip && clipboardContent && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-2 z-50">
                                <p className="text-xs text-gray-400 truncate">{formatClipboard(clipboardContent)}</p>
                            </div>
                        )}
</div>
                    <div className="w-px h-6 bg-gray-700" />
                    <AudioPlayer />
                    <button
                        onClick={() => setMailboxOpen(true)}
                        className="px-3 py-1 text-xs rounded text-white bg-gray-600 hover:bg-gray-700"
                    >
                        📧 Mailbox
                    </button>
                    <button
                        onClick={handleFullScreen}
                        className="px-3 py-1 text-xs rounded text-white bg-gray-600 hover:bg-gray-700"
                    >
                        ⛶ Fullscreen
                    </button>
                    <div className="flex items-center gap-1.5">
                        <span
                            className={`w-2 h-2 rounded-full ${status === "online" ? "bg-green-500" : status === "offline" ? "bg-red-500" : "bg-gray-500 animate-pulse"}`}
                        />
                        <span
                            className={`text-xs font-medium ${status === "online" ? "text-green-400" : status === "offline" ? "text-red-400" : "text-gray-400"}`}
                        >
                            {status === "unknown"
                                ? "Checking..."
                                : status === "online"
                                  ? `Online ${uptime}`
                                  : "Offline"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span
                            className={`w-2 h-2 rounded-full ${connected ? "bg-blue-500" : "bg-gray-600"}`}
                        />
                        <span
                            className={`text-xs font-medium ${connected ? "text-blue-400" : "text-gray-500"}`}
                        >
                            {connected ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                    <div className="w-px h-6 bg-gray-700" />
                    <div className="relative group">
                        <button className="px-3 py-1 text-xs rounded text-white bg-gray-600 hover:bg-gray-700 transition-all">
                            ⚙️ Control
                        </button>
                        <div className="absolute top-full right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <button
                                onClick={() => handleControl("start")}
                                disabled={loading || status !== "offline"}
                                className="w-full px-3 py-2 text-xs rounded text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors mb-1"
                            >
                                ▶ Start
                            </button>
                            <button
                                onClick={() => handleControl("stop")}
                                disabled={loading || status !== "online"}
                                className="w-full px-3 py-2 text-xs rounded text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
                            >
                                ⏹ Stop
                            </button>
                        </div>
                    </div>
                    <div className="relative group">
                        <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors text-sm font-bold">
                            ?
                        </button>
                        <div className="absolute top-full right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                            <h3 className="text-sm font-semibold text-white mb-3">
                                How to use
                            </h3>
                            <div className="text-xs text-gray-400 space-y-1">
                                <p><span className="text-purple-400">⚙️ Control</span> — Start/Stop openbox</p>
                                <p><span className="text-cyan-600">📋 Copy</span> — Copy from clipboard</p>
                                <p><span className="text-teal-600">📄 Paste</span> — Paste to clipboard</p>
                                <p><span className="text-green-500">● Online</span> — openbox running</p>
                                <p><span className="text-blue-400">● Connected</span> — VNC connected</p>
                                <p><span className="text-gray-500">● Disconnected</span> — retrying...</p>
                                <p><span className="text-yellow-400">📧 Mailbox</span> — temp email</p>
                                <p className="pl-4">Use [user]@email.022025.xyz</p>
                                <p className="pl-4">for signup/login only</p>
                                <p className="pl-4">max 20 emails kept</p>
                                <p className="mt-2 pt-2 border-t border-gray-600"><span className="text-gray-500">v1.1.0</span> · 23 May 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            <MailboxModal isOpen={mailboxOpen} onClose={() => setMailboxOpen(false)} />
        </>
    );
}
