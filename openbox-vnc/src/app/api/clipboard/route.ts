import { NextResponse } from "next/server";

const API_BASE = "https://openbox-vnc.022025.xyz/api";

export async function GET() {
    try {
        const res = await fetch(`${API_BASE}/clipboard`, {
            headers: {
                "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID || "",
                "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET || "",
            },
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ clipboard: "" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const text = await request.text();
        const res = await fetch(`${API_BASE}/clipboard`, {
            method: "POST",
            body: text,
            headers: {
                "Content-Type": "text/plain",
                "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID || "",
                "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET || "",
            },
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ status: "error" }, { status: 500 });
    }
}