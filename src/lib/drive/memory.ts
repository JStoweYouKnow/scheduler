import type { DriveFile, DrivePort } from "./port";

export class MemoryDrive implements DrivePort {
  files: DriveFile[] = [];

  seed(files: DriveFile[]): void {
    this.files = [...files];
  }

  async search(query: string, limit = 5): Promise<DriveFile[]> {
    const needle = query.toLowerCase();
    return this.files
      .filter(
        (file) =>
          file.name.toLowerCase().includes(needle) ||
          (file.snippet ?? "").toLowerCase().includes(needle),
      )
      .slice(0, limit);
  }
}
