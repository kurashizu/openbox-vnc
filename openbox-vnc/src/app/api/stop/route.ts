import { NextResponse } from "next/server";

const API_BASE = "https://openbox-vnc.022025.xyz/api";

export async function POST() {
    try {
        const res = await fetch(`${API_BASE}/stop`, {
            method: "POST",
            headers: {
                "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID || "",
                "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET || "",
            },
        });
        return NextResponse.json(await res.json());
    } catch {
        return NextResponse.json({ status: "error" }, { status: 500 });
    }
}