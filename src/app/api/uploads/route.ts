import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prepareEvidenceUpload, signEvidenceRead } from "@/server/storage/evidence";
import { ownerIdForEmail } from "@/server/supabase";

export const POST = auth(async function POST(request) {
  const email = request.auth?.user?.email;
  if (!email) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const body = await request.json() as { requestId?: string; fileName?: string; contentType?: string };
    if (typeof body?.requestId !== "string" || !body.requestId || typeof body.fileName !== "string" || !body.fileName
      || typeof body.contentType !== "string" || !/^(image|video)\//.test(body.contentType)) {
      return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
    }
    return NextResponse.json(await prepareEvidenceUpload(ownerIdForEmail(email), {
      requestId: body.requestId, fileName: body.fileName, contentType: body.contentType,
    }));
  } catch (error) {
    console.error("Supabase signed upload failed", error);
    return NextResponse.json({ error: "Unable to prepare upload" }, { status: 500 });
  }
});

export const PATCH = auth(async function PATCH(request) {
  const email = request.auth?.user?.email;
  if (!email) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const body = await request.json() as { path?: string };
    const ownerId = ownerIdForEmail(email);
    if (typeof body?.path !== "string" || !body.path.startsWith(`${ownerId}/`)) {
      return NextResponse.json({ error: "Invalid media path" }, { status: 400 });
    }
    return NextResponse.json(await signEvidenceRead(ownerId, body.path));
  } catch (error) {
    console.error("Supabase signed media URL failed", error);
    return NextResponse.json({ error: "Unable to load uploaded media" }, { status: 500 });
  }
});
