import { google } from "googleapis";
import { authForEmail } from "../google/auth";
import { sharedInboxEmail } from "../email/gmail";
import type { DriveFile, DrivePort } from "./port";

export function createGoogleDrivePort(): DrivePort {
  return {
    async search(query: string, limit = 5): Promise<DriveFile[]> {
      const { client } = await authForEmail(sharedInboxEmail());
      const drive = google.drive({ version: "v3", auth: client });
      const escaped = query.replace(/'/g, "\\'");
      const listed = await drive.files.list({
        q: `fullText contains '${escaped}' and trashed = false`,
        pageSize: limit,
        fields: "files(id,name,mimeType,webViewLink,description)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      return (listed.data.files ?? []).flatMap((file) => {
        if (!file.id || !file.name) return [];
        return [
          {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType ?? "application/octet-stream",
            webViewLink: file.webViewLink ?? undefined,
            snippet: file.description ?? undefined,
          },
        ];
      });
    },
  };
}
