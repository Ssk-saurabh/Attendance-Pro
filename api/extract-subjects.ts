import { parseFileToText } from '../server/parser';
import { processWithGemini } from '../server/geminiService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    let fileBuffer: Buffer | null = null;
    let mimeType = 'application/octet-stream';
    let fileName = 'subjects.pdf';

    if (req.file) {
      fileBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
      fileName = req.file.originalname;
    } else if (req.body?.fileBase64) {
      fileBuffer = Buffer.from(req.body.fileBase64, 'base64');
      mimeType = req.body.fileMime || 'application/pdf';
      fileName = req.body.fileName || 'subjects.pdf';
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const extractedText = await parseFileToText(fileBuffer, mimeType, fileName);
    const result = await processWithGemini(fileBuffer, mimeType, extractedText);

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error in /api/extract-subjects:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
