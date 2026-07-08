import { NextResponse } from "next/server";
import { z } from "zod";
import { setSourceEnabled } from "@/server/application/topic-discovery-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  enabled: z.boolean(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await params;

  let parsedBody: z.infer<typeof bodySchema>;

  try {
    parsedBody = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Body must be JSON with a boolean \"enabled\" field." },
      { status: 400 },
    );
  }

  try {
    await setSourceEnabled(sourceId, parsedBody.enabled);
    return NextResponse.json({ ok: true, enabled: parsedBody.enabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update source.";
    const status = message === "Source not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
