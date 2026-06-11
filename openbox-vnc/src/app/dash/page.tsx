"use client";
import { useState, useEffect, useRef } from "react";
import VNCViewer from "../../components/openbox";
import Navbar from "../../components/Navbar";

export default function Home() {
    const [reconnectKey, setReconnectKey] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);
    const levelRef = useRef(0);

    useEffect(() => {
        const handleReconnect = () => setReconnectKey(k => k + 1);
        window.addEventListener("vnc-reconnect", handleReconnect);

        const handleAudioLevel = (e: Event) => {
            const customEvent = e as CustomEvent<number>;
            levelRef.current = customEvent.detail * 0.7 + levelRef.current * 0.3;
            setAudioLevel(levelRef.current);
        };

        window.addEventListener("audio-level", handleAudioLevel);

        return () => {
            window.removeEventListener("vnc-reconnect", handleReconnect);
            window.removeEventListener("audio-level", handleAudioLevel);
        };
    }, []);

    const hue = 220 + audioLevel * 60;
    const saturation = 40 + audioLevel * 50;
    const lightness = 6 + audioLevel * 8;
    const glowOpacity = 0.15 + audioLevel * 0.5;

    return (
        <div className="h-screen flex flex-col">
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.8; }
                }
            `}</style>
            <div
                className="fixed inset-0 -z-10 transition-all duration-150"
                style={{
                    background: `radial-gradient(ellipse at 50% 50%, hsl(${hue}, ${saturation}%, ${lightness + 4}%) 0%, hsl(${hue + 30}, ${saturation - 20}%, ${lightness}%) 40%, rgb(3 7 18) 100%)`,
                }}
            />
            {audioLevel > 0.02 && (
                <div
                    className="fixed inset-0 -z-10"
                    style={{
                        background: `radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(59, 130, 246, ${glowOpacity * 0.7}) 100%)`,
                        animation: "pulse-glow 0.4s ease-in-out infinite",
                    }}
                />
            )}
            <Navbar />

            <section className="flex flex-col px-6 py-6 flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                    <VNCViewer key={reconnectKey} />
                </div>
            </section>
        </div>
    );
}