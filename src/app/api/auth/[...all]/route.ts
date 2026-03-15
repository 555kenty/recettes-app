import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

export async function GET(req: NextRequest, ctx: unknown) {
  try {
    return await handler.GET(req, ctx as never);
  } catch (err) {
    console.error("[BetterAuth] GET error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: unknown) {
  try {
    return await handler.POST(req, ctx as never);
  } catch (err) {
    console.error("[BetterAuth] POST error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
