import fs from 'fs';
import path from 'path';

export function getAllAttachments() {
  const folderPath = path.join('attachments');

  if (!fs.existsSync(folderPath)) {
    return [];
  }

  return fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.pdf'))
    .map(f => ({
      name: f,
      path: path.resolve(folderPath, f)
    }));
}
