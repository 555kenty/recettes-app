import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Lazy load auth handler
const handler = toNextJsHandler(auth);

export const GET = handler.GET;
export const POST = handler.POST;
