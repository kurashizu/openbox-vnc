"use client";
import { useEffect, useRef } from "react";

export default function VNCViewer() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let rfb: any;
        let cancelled = false;
        let resizeObserver: ResizeObserver | null = null;

        (async () => {
            const RFB = await new Promise<any>((resolve, reject) => {
                if ((globalThis as any).__novnc_RFB__) {
                    resolve((globalThis as any).__novnc_RFB__);
                    return;
                }
                const s = document.createElement("script");
                s.type = "module";
                s.src = "/novnc-bridge.js";
                globalThis.addEventListener(
                    "__novnc_ready__",
                    () => {
                        resolve((globalThis as any).__novnc_RFB__);
                    },
                    { once: true },
                );
                s.onerror = reject;
                document.head.appendChild(s);
            });

            if (cancelled || !containerRef.current) return;

            const el = containerRef.current;
            rfb = new RFB(el, "wss://openbox-vnc.022025.xyz/vnc");
            rfb.scaleViewport = true;
            rfb.resizeSession = false;
            rfb.clipViewport = true;
            rfb.clipboardUp = true;

            rfb.addEventListener("connect", () => {
                el.querySelectorAll("div").forEach((div) => {
                    div.style.background = "transparent";
                    div.style.backgroundColor = "transparent";
                });
                window.dispatchEvent(new CustomEvent("vnc-connect"));
            });

            rfb.addEventListener("disconnect", () => {
                window.dispatchEvent(new CustomEvent("vnc-disconnect"));
            });

            resizeObserver = new ResizeObserver(() => {
                if (rfb) rfb.scaleViewport = true;
            });
            resizeObserver.observe(el);
        })();

        return () => {
            cancelled = true;
            resizeObserver?.disconnect();
            rfb?.disconnect();
        };
    }, []);

    return (
        <div className="w-full h-full overflow-hidden">
            <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
    );
}
