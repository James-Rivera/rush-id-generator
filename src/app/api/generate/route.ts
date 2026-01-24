export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import crypto from 'crypto';
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import sharp from "sharp";

// Helper: Convert a Blob/File to a Buffer
async function fileToBuffer(file: File | Blob): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Try to remove background using rembg (local Python tool).
// Returns a PNG Buffer with alpha channel, or null on failure.
async function removeBackgroundWithRembg(inputBuffer: Buffer): Promise<Buffer | null> {
  const tmp = os.tmpdir();
  const inPath = path.join(tmp, `rembg-in-${Date.now()}.png`);
  const outPath = path.join(tmp, `rembg-out-${Date.now()}.png`);
  try {
    await fs.promises.writeFile(inPath, inputBuffer);

    const runRembg = (cmd: string, args: string[]) => {
      try {
        const res = execFileSync(cmd, args, { stdio: 'pipe' });
        return { ok: true, stdout: String(res) };
      } catch (e: any) {
        const stdout = e && e.stdout ? String(e.stdout) : '';
        const stderr = e && e.stderr ? String(e.stderr) : (e && e.message ? String(e.message) : '');
        return { ok: false, stdout, stderr };
      }
    };

    // Try common invocations. On Windows prefer `py -3 -m rembg` first.
    let attemptInfo = runRembg('py', ['-3', '-m', 'rembg', 'i', inPath, outPath]);
    if (!attemptInfo.ok) attemptInfo = runRembg(process.env.PYTHON || 'python', ['-m', 'rembg', 'i', inPath, outPath]);
    if (!attemptInfo.ok) attemptInfo = runRembg('rembg', ['i', inPath, outPath]);

    // If output was produced, read it; otherwise log attempt info for debugging
    let outBuf: Buffer | null = null;
    try {
      const st = await fs.promises.stat(outPath).catch(() => null);
      if (st && st.size > 0) {
        outBuf = await fs.promises.readFile(outPath);
      } else {
        console.error('rembg did not produce output file or file empty', { inPath, outPath, attemptInfo });
      }
    } catch (e) {
      console.error('Error reading rembg output file', e, { inPath, outPath, attemptInfo });
    }

    // cleanup inPath/outPath
    await fs.promises.unlink(inPath).catch(() => {});
    await fs.promises.unlink(outPath).catch(() => {});
    return outBuf;
  } catch (err) {
    try { await fs.promises.unlink(inPath).catch(() => {}); } catch {}
    try { await fs.promises.unlink(outPath).catch(() => {}); } catch {}
    return null;
  }
}

// Helper: Call OpenAI API (DALL·E 3 or similar) - placeholder
async function callOpenAIForFormalAttire(imageBuffer: Buffer): Promise<Buffer | null> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return null;
  // For MVP keep placeholder (no extra cost). Return original buffer for now.
  return imageBuffer;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const mode = formData.get("mode");

  if (!file || typeof mode !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file or mode" }, { status: 400 });
  }

  const imageBuffer = await fileToBuffer(file);

  let processedBuffer: Buffer | null = null;

  if (mode === "formal") {
    // Placeholder for AI call (kept minimal per budget). Returns original image for now.
    processedBuffer = await callOpenAIForFormalAttire(imageBuffer);
    if (!processedBuffer) {
      return NextResponse.json({ error: "AI service unavailable or failed" }, { status: 500 });
    }
    // After AI, ensure size and white background
    try {
      processedBuffer = await sharp(processedBuffer)
        .resize(600, 600, { fit: 'cover' })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 95 })
        .toBuffer();
    } catch (err) {
      return NextResponse.json({ error: 'Image processing failed after AI' }, { status: 500 });
    }
  } else {
    // White background: attempt to remove background with rembg (open-source).
    const removed = await removeBackgroundWithRembg(imageBuffer);
    if (removed) {
      // Simplified pipeline: rembg produced a transparent PNG. Flatten it over white
      // and resize to 600x600. This avoids fragile raw-channel recomposition.
      try {
        const debug = process.env.DEBUG_REMBG === '1';
        if (debug) {
          const tmpRaw = path.join(os.tmpdir(), `rembg_debug_raw_${Date.now()}.png`);
          await fs.promises.writeFile(tmpRaw, removed).catch(()=>{});
          console.log('WROTE REMBG RAW:', tmpRaw);
        }

        processedBuffer = await sharp(removed)
          .ensureAlpha()
          .resize(600, 600, { fit: 'cover' })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 95 })
          .toBuffer();
      } catch (err) {
        console.error('SIMPLE PROCESSING ERROR after rembg removed buffer:', err);
        return NextResponse.json({ error: 'Image processing failed after background removal' }, { status: 500 });
      }
    } else {
      // Fallback: no rembg available — just resize and flatten background to white
      try {
        processedBuffer = await sharp(imageBuffer)
          .resize(600, 600, { fit: 'cover' })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 95 })
          .toBuffer();
      } catch (err) {
        return NextResponse.json({ error: 'Image processing failed' }, { status: 500 });
      }
    }
  }

  // If caller asked for raw image (useful for direct download), return image/jpeg bytes
  const url = new URL(request.url);
  const wantRaw = url.searchParams.get('raw') === '1';
  if (wantRaw) {
    if (!processedBuffer) {
      return NextResponse.json({ error: 'No image produced' }, { status: 500 });
    }
    const debug = process.env.DEBUG_REMBG === '1';

    // Compute SHA256 of the final buffer for verification
    const sha256 = crypto.createHash('sha256').update(processedBuffer).digest('hex');

    if (debug) {
      const tmpOut = path.join(os.tmpdir(), `rembg_debug_final_${Date.now()}.jpg`);
      try {
        await fs.promises.writeFile(tmpOut, processedBuffer);
        console.log('WROTE DEBUG FINAL:', tmpOut, processedBuffer.length, 'sha256:', sha256);
        try {
          // Also write into workspace ./tmp for easier inspection
          const repoTmpDir = path.join(process.cwd(), 'tmp');
          await fs.promises.mkdir(repoTmpDir, { recursive: true }).catch(()=>{});
          const repoOut = path.join(repoTmpDir, `rembg_final_${Date.now()}.jpg`);
          await fs.promises.writeFile(repoOut, processedBuffer);
          console.log('WROTE REPO FINAL:', repoOut, processedBuffer.length, 'sha256:', sha256);
        } catch (e) {
          console.error('FAILED WRITE REPO FINAL', e);
        }
      } catch (e) {
        console.error('FAILED WRITE DEBUG FINAL', e);
      }
    } else {
      console.log('FINAL IMAGE LENGTH', processedBuffer.length, 'sha256:', sha256);
    }

    // Use a Uint8Array view of the Node Buffer for a BodyInit-compatible binary body
    const uint8 = new Uint8Array(processedBuffer);

    const headers = new Headers({
      'Content-Type': 'image/jpeg',
      'Content-Length': String(processedBuffer.length),
      'Content-Disposition': 'attachment; filename="rush-id-2x2.jpg"',
      'Cache-Control': 'no-store',
      'X-SHA256': sha256,
    });

    return new Response(uint8, { status: 200, headers });
  }

  const base64 = processedBuffer.toString('base64');
  return NextResponse.json({ message: '2x2 ID generated!', image: `data:image/jpeg;base64,${base64}` });
}
