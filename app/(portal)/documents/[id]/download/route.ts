import { NextResponse, type NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth/session"
import { fetchDocumentContent, getDocument, isRevProjectsConfigured } from "@/lib/revprojects"

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_")
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

/**
 * Streams a shared document through the portal, so storage URLs never reach the browser
 * and every download is re-checked against the signed-in client's access in RevProjects.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))
  if (!isRevProjectsConfigured()) return new NextResponse("Not found", { status: 404 })

  const { id } = await params
  try {
    const doc = await getDocument(user, id)
    if (!doc) return new NextResponse("Not found", { status: 404 })

    if (doc.isExternal) {
      return /^https?:\/\//i.test(doc.url)
        ? NextResponse.redirect(doc.url)
        : new NextResponse("Not found", { status: 404 })
    }

    const upstream = await fetchDocumentContent(doc.url)
    const headers = new Headers({
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": contentDisposition(doc.filename),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    })
    const length = upstream.headers.get("content-length")
    if (length) headers.set("Content-Length", length)
    return new NextResponse(upstream.body, { headers })
  } catch (error) {
    console.error("[documents] download failed", error instanceof Error ? error.message : error)
    return new NextResponse("The document could not be downloaded right now.", { status: 502 })
  }
}
