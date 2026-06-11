import { NextResponse } from "next/server";

const API_BASE = "https://openbox-vnc.022025.xyz/api";

export async function GET() {
    try {
        const res = await fetch(`${API_BASE}/status`, {
            headers: {
                "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID || "",
                "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET || "",
            },
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ status: "offline", started_at: null }, { status: 500 });
    }
}