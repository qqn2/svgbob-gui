export interface DrawingBackupEntry {
  name: string | null;
  ascii: string;
}

export interface DrawingBackup {
  version: 1;
  exportedAt: string;
  drawings: DrawingBackupEntry[];
}

const MAX_BACKUP_DRAWINGS = 500;
const MAX_BACKUP_ASCII_CHARS = 2_000_000;

export function serializeDrawingBackup(drawings: DrawingBackupEntry[]): string {
  const backup: DrawingBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    drawings,
  };
  return JSON.stringify(backup, null, 2);
}

export function parseDrawingBackup(value: string): DrawingBackup {
  const parsed = JSON.parse(value) as Partial<DrawingBackup>;
  if (parsed.version !== 1 || !Array.isArray(parsed.drawings)) {
    throw new Error("Unsupported backup format");
  }
  if (parsed.drawings.length > MAX_BACKUP_DRAWINGS) {
    throw new Error("Backup contains too many drawings");
  }
  let totalChars = 0;
  const drawings = parsed.drawings.map((drawing) => {
    if (
      !drawing ||
      !(drawing.name === null || typeof drawing.name === "string") ||
      typeof drawing.ascii !== "string"
    ) {
      throw new Error("Invalid drawing in backup");
    }
    totalChars += drawing.ascii.length;
    if (totalChars > MAX_BACKUP_ASCII_CHARS) {
      throw new Error("Backup contents are too large");
    }
    return { name: drawing.name, ascii: drawing.ascii };
  });
  return {
    version: 1,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    drawings,
  };
}
