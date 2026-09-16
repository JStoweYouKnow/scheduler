export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  snippet?: string;
}

export interface DrivePort {
  search(query: string, limit?: number): Promise<DriveFile[]>;
}
