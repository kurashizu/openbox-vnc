"use client";
import { useEffect, useRef, useState } from "react";

const SAMPLE_RATE = 22050;
const CHANNELS = 1;

export default function AudioPlayer() {
    const [active, setActive] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const nextTimeRef = useRef(0);

    const start = () => {
        const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioCtxRef.current = audioCtx;
        nextTimeRef.current = audioCtx.currentTime + 0.1;

        const ws = new WebSocket("wss://openbox-vnc.022025.xyz/audio");
        ws.binaryType = "arraybuffer";

        ws.onmessage = (e) => {
            const pcm = new Int16Array(e.data);
            const frames = pcm.length / CHANNELS;
            const buffer = audioCtx.createBuffer(CHANNELS, frames, SAMPLE_RATE);
            const channel = buffer.getChannelData(0);
            let sum = 0;
            for (let i = 0; i < frames; i++) {
                channel[i] = pcm[i] / 32768;
                sum += Math.abs(pcm[i]);
            }
            const avg = sum / frames / 32768;
            window.dispatchEvent(new CustomEvent("audio-level", { detail: avg }));

            const source = audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtx.destination);
            const now = audioCtx.currentTime;
            if (nextTimeRef.current < now) {
                nextTimeRef.current = now + 0.05;
            }
            source.start(nextTimeRef.current);
            nextTimeRef.current += buffer.duration;
        };

        ws.onclose = () => setActive(false);
        wsRef.current = ws;
        setActive(true);
    };

    const stop = () => {
        wsRef.current?.close();
        audioCtxRef.current?.close();
        wsRef.current = null;
        audioCtxRef.current = null;
        setActive(false);
    };

    useEffect(() => {
        return () => {
            wsRef.current?.close();
            audioCtxRef.current?.close();
        };
    }, []);

    return (
        <button
            onClick={active ? stop : start}
            className={`px-3 py-1 text-xs rounded text-white transition-all ${
                active
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-600 hover:bg-gray-700"
            }`}
        >
            {active ? "🔊 Audio On" : "🔇 Audio Off"}
        </button>
    );
}
