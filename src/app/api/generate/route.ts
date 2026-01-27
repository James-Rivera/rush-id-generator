export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import crypto from 'crypto';
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync, spawnSync } from "child_process";
import sharp from "sharp";

// Helper: Convert a Blob/File to a Buffer
async function fileToBuffer(file: File | Blob): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Try to remove background using rembg (local Python tool).
// Returns { buffer: PNG Buffer, error: error details } or null on failure.
// This is REQUIRED for the 2x2 ID photo pipeline.
async function removeBackgroundWithRembg(inputBuffer: Buffer): Promise<{ buffer: Buffer; error?: string } | null> {
  const tmp = os.tmpdir();
  const inPath = path.join(tmp, `rembg-in-${Date.now()}.png`);
  const outPath = path.join(tmp, `rembg-out-${Date.now()}.png`);
  try {
    await fs.promises.writeFile(inPath, inputBuffer);

    const runRembg = (cmd: string, args: string[]): { ok: boolean; stdout: string; stderr: string; cmd: string } => {
      const isWindows = process.platform === 'win32';
      const fullCmd = `${cmd} ${args.join(' ')}`;
      
      // Use spawnSync for better error capture, especially on Windows
      const result = spawnSync(cmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'], // stdin ignored, capture stdout/stderr
        encoding: 'utf8',
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        shell: isWindows && cmd === 'py' // Windows py launcher may need shell
      });
      
      const stdout = (result.stdout || '').toString().trim();
      const stderr = (result.stderr || '').toString().trim();
      const exitCode = result.status;
      const error = result.error;
      
      if (error) {
        // Process spawn error (command not found, etc.)
        return {
          ok: false,
          stdout: stdout,
          stderr: `Spawn error: ${error.message || String(error)} | Exit code: ${exitCode || 'N/A'}`,
          cmd: fullCmd
        };
      }
      
      if (exitCode !== 0) {
        // Command executed but returned non-zero exit code
        const errorParts = [
          stderr || stdout || 'Command failed',
          exitCode !== null ? `Exit code: ${exitCode}` : '',
          result.signal ? `Signal: ${result.signal}` : ''
        ].filter(Boolean);
        
        return {
          ok: false,
          stdout: stdout,
          stderr: errorParts.join(' | '),
          cmd: fullCmd
        };
      }
      
      // Success
      return {
        ok: true,
        stdout: stdout,
        stderr: '',
        cmd: fullCmd
      };
    };

    // Try common invocations. On Windows prefer `py -3 -m rembg` first.
    const attempts: Array<{ ok: boolean; stdout: string; stderr: string; cmd: string }> = [];
    
    // Try py -3 -m rembg (Windows Python Launcher)
    attempts.push(runRembg('py', ['-3', '-m', 'rembg', 'i', inPath, outPath]));
    
    // Try python -m rembg
    if (!attempts[attempts.length - 1].ok) {
      attempts.push(runRembg(process.env.PYTHON || 'python', ['-m', 'rembg', 'i', inPath, outPath]));
    }
    
    // Try python3 -m rembg
    if (!attempts[attempts.length - 1].ok) {
      attempts.push(runRembg('python3', ['-m', 'rembg', 'i', inPath, outPath]));
    }
    
    // Try rembg CLI directly (if installed globally)
    if (!attempts[attempts.length - 1].ok) {
      attempts.push(runRembg('rembg', ['i', inPath, outPath]));
    }

    const lastAttempt = attempts[attempts.length - 1];
    const allErrors = attempts.filter(a => !a.ok).map(a => `${a.cmd}: ${a.stderr || a.stdout || 'no output'}`).join('; ');

    // If output was produced, read it; otherwise log attempt info for debugging
    let outBuf: Buffer | null = null;
    try {
      const st = await fs.promises.stat(outPath).catch(() => null);
      if (st && st.size > 0) {
        outBuf = await fs.promises.readFile(outPath);
      } else {
        const rembgAllErrors = attempts.filter(a => !a.ok).map(a => a.stderr).join(' ');
        console.error('rembg did not produce output file or file empty', { 
          inPath, 
          outPath, 
          attempts: attempts.map(a => ({ cmd: a.cmd, ok: a.ok, stderr: a.stderr.substring(0, 200) })),
          allErrors: rembgAllErrors
        });
        // Return error details for better user feedback
        return { buffer: null as any, error: rembgAllErrors };
      }
    } catch (e) {
      const rembgAllErrors = attempts.filter(a => !a.ok).map(a => a.stderr).join(' ');
      console.error('Error reading rembg output file', e, { 
        inPath, 
        outPath, 
        lastAttempt: lastAttempt.cmd,
        stderr: lastAttempt.stderr,
        allErrors: rembgAllErrors
      });
      return { buffer: null as any, error: rembgAllErrors };
    }

    // cleanup inPath/outPath
    await fs.promises.unlink(inPath).catch(() => {});
    await fs.promises.unlink(outPath).catch(() => {});
    if (!outBuf) {
      const rembgAllErrors = attempts.filter(a => !a.ok).map(a => a.stderr).join(' ');
      return { buffer: null as any, error: rembgAllErrors };
    }
    return { buffer: outBuf };
  } catch (err) {
    try { await fs.promises.unlink(inPath).catch(() => {}); } catch {}
    try { await fs.promises.unlink(outPath).catch(() => {}); } catch {}
    console.error('rembg function error:', err);
    return { buffer: null as any, error: err instanceof Error ? err.message : String(err) };
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
  // Mask tuning parameters (optional form fields)
  const innerThresholdField = formData.get('innerThreshold');
  const featherPxField = formData.get('featherPx');
  const transparentField = formData.get('transparent');
  const reqUrl = new URL(request.url);
  const parsedInnerThreshold = innerThresholdField ? parseInt(String(innerThresholdField), 10) : undefined;
  const parsedFeatherPx = featherPxField ? parseInt(String(featherPxField), 10) : undefined;
  const wantTransparentFromForm = transparentField === '1' || transparentField === 'true';
  const wantTransparentFromQuery = reqUrl.searchParams.get('transparent') === '1';
  const wantTransparent = wantTransparentFromForm || wantTransparentFromQuery;

  // Some runtimes return a Blob-like object here; avoid fragile `instanceof File` checks.
  if (!file || typeof mode !== "string" || typeof (file as any).arrayBuffer !== 'function') {
    return NextResponse.json({ error: "Missing file or mode" }, { status: 400 });
  }

  const imageBuffer = await fileToBuffer(file as unknown as Blob);

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
    // White background: rembg only, preserve user's manual crop
    const rembgResult = await removeBackgroundWithRembg(imageBuffer);
    if (!rembgResult || !rembgResult.buffer) {
      const errorDetails = rembgResult?.error || 'Unknown error';
      return NextResponse.json({ error: 'Background removal failed. rembg could not process the image.', details: errorDetails }, { status: 500 });
    }
    // Flatten to white and resize to 600x600 (2x2) or passport size if needed
    processedBuffer = await sharp(rembgResult.buffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 95 })
      .toBuffer();
  }

  // If caller asked for raw image (useful for direct download), return image/jpeg bytes
  const url = new URL(request.url);
  const wantRaw = url.searchParams.get('raw') === '1';
  const debug = process.env.DEBUG_REMBG === '1';
  
  if (wantRaw) {
    if (!processedBuffer) {
      return NextResponse.json({ error: 'No image produced' }, { status: 500 });
    }

    // Compute SHA256 of the final buffer for verification
    // Note: cropJson is only available in the white background path, so we compute SHA256 here
    const sha256 = crypto.createHash('sha256').update(processedBuffer).digest('hex');

    if (debug) {
      const tmpOut = path.join(os.tmpdir(), `rembg_debug_final_${Date.now()}`);
      try {
        // write with appropriate extension for easier inspection
        const isPng = processedBuffer[0] === 0x89 && processedBuffer[1] === 0x50;
        const ext = isPng ? '.png' : '.jpg';
        const tmpOutPath = tmpOut + ext;
        await fs.promises.writeFile(tmpOutPath, processedBuffer);
        console.log('WROTE DEBUG FINAL:', tmpOutPath, processedBuffer.length, 'sha256:', sha256);
        try {
          // Also write into workspace ./tmp for easier inspection
          const repoTmpDir = path.join(process.cwd(), 'tmp');
          await fs.promises.mkdir(repoTmpDir, { recursive: true }).catch(()=>{});
          const repoOut = path.join(repoTmpDir, `rembg_final_${Date.now()}${ext}`);
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
    const isPng = processedBuffer[0] === 0x89 && processedBuffer[1] === 0x50;
    const contentType = isPng ? 'image/png' : 'image/jpeg';
    const filename = isPng ? 'rush-id-2x2.png' : 'rush-id-2x2.jpg';

    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Length': String(processedBuffer.length),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-SHA256': sha256,
    });

    return new Response(uint8, { status: 200, headers });
  }

  if (!processedBuffer) {
    return NextResponse.json({ error: 'No image produced' }, { status: 500 });
  }
  const base64 = processedBuffer.toString('base64');
  const isPng = processedBuffer[0] === 0x89 && processedBuffer[1] === 0x50;
  const mime = isPng ? 'image/png' : 'image/jpeg';
  return NextResponse.json({ message: '2x2 ID generated!', image: `data:${mime};base64,${base64}` });
}
