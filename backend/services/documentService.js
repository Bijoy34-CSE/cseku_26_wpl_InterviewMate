/**
 * Document extraction service.
 *
 * Turns an uploaded resume/syllabus file (PDF, DOCX, or PPTX) into plain
 * text so the AI provider can ground generated interview questions in the
 * candidate's actual document instead of asking something generic.
 *
 * This is pure text extraction - no AI calls happen here. Every extractor
 * is a plain JS library (no shelling out to LibreOffice/poppler/etc), so
 * this works the same on any machine without extra system dependencies.
 */

// pdf-parse pulls in an OPTIONAL native canvas binding for rendering
// support; on some platforms/containers that binding fails to load, which
// otherwise throws at require-time and would take down the entire backend
// (this module is required from interviewController.js, which is required
// by index.js). Load it defensively so a broken PDF dependency only affects
// PDF uploads specifically - auth, DOCX, PPTX, and everything else keeps
// working.
let PDFParse = null;
let pdfParseLoadError = null;
try {
  ({ PDFParse } = require('pdf-parse'));
} catch (err) {
  pdfParseLoadError = err;
  console.error('[documentService] pdf-parse failed to load - PDF uploads will be unavailable:', err.message);
}

const mammoth = require('mammoth');
const JSZip = require('jszip');

// Keep the stored/prompted document text to a sane size - long enough to
// capture real content, short enough to not bloat Mongo documents or blow
// past model context/prompt limits.
const MAX_CHARS = 12000;

function truncate(text) {
  const trimmed = text.trim();
  return trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS) : trimmed;
}

async function extractFromPdf(buffer) {
  if (!PDFParse) {
    throw new Error(
      'PDF processing is currently unavailable on this server (a required dependency failed to load). ' +
        'Please try a DOCX or PPTX file instead, or contact the site administrator.'
    );
  }
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    // pdf-parse v2 inserts "-- N of M --" page separator lines - strip them,
    // we just want the plain text content.
    return result.text.replace(/^--\s*\d+\s*of\s*\d+\s*--$/gm, '');
  } finally {
    await parser.destroy();
  }
}

async function extractFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function extractFromPptx(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
      return na - nb;
    });

  const slideTexts = [];
  for (const fileName of slideFiles) {
    const xml = await zip.files[fileName].async('string');
    // PPTX text runs live in <a:t>...</a:t> tags inside each slide's XML.
    const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g) || [];
    const slideText = matches.map((m) => m.replace(/<a:t>|<\/a:t>/g, '')).join(' ');
    if (slideText.trim()) slideTexts.push(slideText.trim());
  }

  return slideTexts.join('\n\n');
}

/**
 * @param {{ buffer: Buffer, originalname: string, mimetype: string }} file
 * @returns {Promise<string>} extracted, truncated plain text (may be '' if
 *   the document has no meaningful text - e.g. an image-only slide)
 * @throws only if the file type is unsupported/unreadable (corrupt file,
 *   wrong extension, etc.) - not for merely having no text
 */
async function extractText(file) {
  const { buffer, originalname = '', mimetype = '' } = file;
  const ext = (originalname.split('.').pop() || '').toLowerCase();

  let rawText;
  if (ext === 'pdf' || mimetype === 'application/pdf') {
    rawText = await extractFromPdf(buffer);
  } else if (
    ext === 'docx' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    rawText = await extractFromDocx(buffer);
  } else if (
    ext === 'pptx' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    rawText = await extractFromPptx(buffer);
  } else if (ext === 'doc' || ext === 'ppt') {
    throw new Error('Legacy .doc/.ppt files are not supported - please upload .docx or .pptx instead.');
  } else if (ext === 'txt') {
    rawText = buffer.toString('utf-8');
  } else {
    throw new Error('Unsupported file type. Please upload a PDF, DOCX, or PPTX file.');
  }

  const cleaned = (rawText || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  // No throw here for empty text - a slide/page that's mostly a diagram or
  // chart with little/no text is still useful content once its images are
  // extracted by buildDocumentParts(); the caller decides whether having
  // neither text nor images means the upload should be rejected.
  return truncate(cleaned);
}

/**
 * Gemini can read PDFs natively (text + diagrams + charts on the page), so we
 * forward the original PDF bytes alongside the extracted text. DOCX/PPTX
 * aren't supported as inline *documents* by the API, but they're just zip
 * archives with any embedded pictures/diagrams/charts sitting as plain image
 * files under word/media or ppt/media - so those are pulled out individually
 * and sent as inline images instead.
 *
 * @returns {Promise<Array<{mimeType: string, data: string}>>} inline parts for Gemini
 */
const MAX_INLINE_BYTES = 6 * 1024 * 1024; // keep request payloads sane
const MAX_IMAGE_PARTS = 6; // cap how many embedded images we forward per document
const IMAGE_EXT_TO_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

async function extractEmbeddedImages(buffer, mediaPathPrefix) {
  const zip = await JSZip.loadAsync(buffer);
  const mediaFiles = Object.keys(zip.files).filter((name) => name.startsWith(mediaPathPrefix));

  const parts = [];
  for (const fileName of mediaFiles) {
    if (parts.length >= MAX_IMAGE_PARTS) break;
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const mimeType = IMAGE_EXT_TO_MIME[ext];
    if (!mimeType) continue; // skip vector/EMF/WMF art we can't hand to Gemini as an image

    const data = await zip.files[fileName].async('nodebuffer');
    if (data.length > MAX_INLINE_BYTES) continue;
    parts.push({ mimeType, data: data.toString('base64') });
  }
  return parts;
}

async function buildDocumentParts(file) {
  if (!file || !file.buffer) return [];

  const ext = (file.originalname || '').split('.').pop().toLowerCase();
  const isPdf = ext === 'pdf' || file.mimetype === 'application/pdf';
  const isDocx = ext === 'docx' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isPptx = ext === 'pptx' || file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  if (isPdf) {
    if (file.buffer.length > MAX_INLINE_BYTES) return [];
    return [{ mimeType: 'application/pdf', data: file.buffer.toString('base64') }];
  }

  if (isDocx) {
    return extractEmbeddedImages(file.buffer, 'word/media/').catch(() => []);
  }

  if (isPptx) {
    return extractEmbeddedImages(file.buffer, 'ppt/media/').catch(() => []);
  }

  return [];
}

module.exports = { extractText, buildDocumentParts, MAX_CHARS, MAX_INLINE_BYTES };
