import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
const pdfParse = require('pdf-parse');

export async function parseFileToText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (mimeType === 'application/pdf' || ext === 'pdf') {
    try {
      const data = await pdfParse(buffer);
      return data.text || '';
    } catch (e: any) {
      console.warn('PDF parse error:', e.message);
      return '';
    }
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (e: any) {
      console.warn('DOCX parse error:', e.message);
      return '';
    }
  }

  if (mimeType === 'application/msword' || ext === 'doc') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (e: any) {
      console.warn('DOC parse error:', e.message);
      return '';
    }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ext === 'xlsx' ||
    ext === 'xls'
  ) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += `Sheet: ${sheetName}\n`;
        text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
      }
      return text;
    } catch (e: any) {
      console.warn('Excel parse error:', e.message);
      return '';
    }
  }

  if (mimeType.startsWith('text/') || ext === 'txt' || ext === 'csv') {
    return buffer.toString('utf-8');
  }

  return '';
}
