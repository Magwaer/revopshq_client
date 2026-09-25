import Link from "next/link"
import { Badge, DataTable, EmptyState, PageHeader, SourceError, formatDate } from "@/components/portal/ui"
import { requireUser } from "@/lib/auth/session"
import { organizationName } from "@/lib/auth/users"
import { isRevProjectsConfigured, listDocuments, type DocumentList } from "@/lib/revprojects"
import { UploadForm } from "./upload-form"

export const metadata = {
  title: "Documents",
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DocumentsPage() {
  const user = await requireUser()
  const header = <PageHeader title="Documents" subtitle={organizationName(user)} code="FILES" />

  if (!isRevProjectsConfigured()) {
    return (
      <div>
        {header}
        <EmptyState title="Documents are not connected yet" description="Shared files will appear here soon." />
      </div>
    )
  }

  let data: DocumentList
  try {
    data = await listDocuments(user)
  } catch (error) {
    console.error("[documents] RevProjects read failed", error)
    return (
      <div>
        {header}
        <SourceError source="RevProjects" />
      </div>
    )
  }

  return (
    <div>
      {header}

      {data.canUpload && <UploadForm projects={data.projects} />}

      {data.documents.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Files the RevOps HQ team shares with you, and files you upload, will appear here."
        />
      ) : (
        <DataTable headers={["NAME", "PROJECT", "SHARED BY", "ADDED", "SIZE"]}>
          {data.documents.map((doc) => (
            <tr key={doc.id} className="border-b border-border/50 last:border-0">
              <td className="max-w-[320px] px-3 py-2">
                <Link
                  href={`/documents/${doc.id}/download`}
                  prefetch={false}
                  target={doc.isExternal ? "_blank" : undefined}
                  rel={doc.isExternal ? "noopener noreferrer" : undefined}
                  className="hover-slide block truncate text-primary"
                  title={doc.filename}
                >
                  {doc.filename}
                </Link>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {doc.project ? (
                  <Link href={`/projects/${doc.project.id}`} className="hover:text-primary">
                    {doc.project.name}
                  </Link>
                ) : (
                  "General"
                )}
              </td>
              <td className="px-3 py-2">
                {doc.uploadedByClient ? (
                  <span className="text-muted-foreground">{doc.uploadedBy === user.email ? "You" : doc.uploadedBy}</span>
                ) : (
                  <Badge tone="positive">RevOps HQ</Badge>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{formatDate(doc.createdAt)}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {doc.isExternal ? "LINK" : formatSize(doc.sizeBytes)}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  )
}
