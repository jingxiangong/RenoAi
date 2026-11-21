import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { RepairApiError } from "@/server/http/repair-error";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof RepairApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Check the repair details and attachment limits, then try again." }, { status: 400 });
  }
  console.error(fallback, error instanceof Error ? error.name : "unknown error");
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function repairPost<Schema extends z.ZodTypeAny>(
  schema: Schema,
  run: (input: z.output<Schema>, email: string) => Promise<unknown>,
  fallback: string,
) {
  return auth(async function POST(request) {
    const email = request.auth?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    try {
      const input = schema.parse(await request.json());
      return NextResponse.json(await run(input, email));
    } catch (error) {
      return errorResponse(error, fallback);
    }
  });
}
