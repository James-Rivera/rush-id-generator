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
        const allErrors = attempts.filter(a => !a.ok).map(a => a.stderr).join(' ');
        console.error('rembg did not produce output file or file empty', { 
          inPath, 
          outPath, 
          attempts: attempts.map(a => ({ cmd: a.cmd, ok: a.ok, stderr: a.stderr.substring(0, 200) })),
          allErrors
        });
        // Return error details for better user feedback
        const allErrors = attempts.filter(a => !a.ok).map(a => a.stderr).join(' ');
        return { buffer: null as any, error: allErrors };
      }
    } catch (e) {
      const allErrors = attempts.filter(a => !a.ok).map(a => a.stderr).join(' ');
      console.error('Error reading rembg output file', e, { 
        inPath, 
        outPath, 
        lastAttempt: lastAttempt.cmd,
        stderr: lastAttempt.stderr,
        allErrors
      });
      return { buffer: null as any, error: allErrors };
    }

    // cleanup inPath/outPath
    await fs.promises.unlink(inPath).catch(() => {});
    await fs.promises.unlink(outPath).catch(() => {});
    if (!outBuf) {
      const allErrors = attempts.filter(a => !a.ok).map(a => a.stderr).join(' ');
      return { buffer: null as any, error: allErrors };
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
    // White background: REQUIRED pipeline = rembg → MediaPipe crop script
    // This is essential for proper 2x2 ID photo generation with correct framing.
    const rembgResult = await removeBackgroundWithRembg(imageBuffer);
    
    if (!rembgResult || !rembgResult.buffer) {
      // rembg is REQUIRED - fail fast with clear error
      const errorDetails = rembgResult?.error || 'Unknown error';
      const hasOnnxError = errorDetails.toLowerCase().includes('onnxruntime') || errorDetails.toLowerCase().includes('no onnxruntime');
      
      if (hasOnnxError) {
        return NextResponse.json({ 
          error: 'rembg requires onnxruntime backend, but it is not available for your Python version.',
          details: 'Python 3.14 is too new - onnxruntime (required by rembg) only supports Python 3.8-3.12. You need to use Python 3.12 or earlier.',
          solution: [
            '1. Install Python 3.12 from https://www.python.org/downloads/',
            '2. Install rembg with CPU support: py -3.12 -m pip install "rembg[cpu]"',
            '3. Update your code to use Python 3.12, or set PYTHON environment variable: $env:PYTHON = "C:\\Path\\To\\Python312\\python.exe"'
          ],
          currentPython: 'Python 3.14.2 (onnxruntime not available)',
          requiredPython: 'Python 3.8-3.12',
          rawError: errorDetails.substring(0, 500)
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Background removal failed. rembg could not process the image.',
        details: 'The ID photo generator requires rembg for background removal. Check the server console (terminal where you ran npm run dev) for detailed error messages.',
        troubleshooting: [
          '1. Check server console logs - they show which Python command failed and why',
          '2. Verify Python works: Open PowerShell and run: py -3 --version',
          '3. Verify rembg is installed: py -3 -m pip show rembg',
          '4. Test rembg manually: py -3 -m rembg i test-input.jpg test-output.png',
          '5. If Python is not found, add Python to your system PATH or set PYTHON environment variable',
          '6. If you see "onnxruntime" errors, you may need Python 3.12 or earlier'
        ],
        rawError: errorDetails.substring(0, 500)
      }, { status: 500 });
    }
    
    const removed = rembgResult.buffer;

    // rembg succeeded - now REQUIRED to call MediaPipe crop script for proper 2x2 ID framing
    try {
      const debug = process.env.DEBUG_REMBG === '1';
      const innerThreshold = parsedInnerThreshold ?? 200;
      const featherPx = parsedFeatherPx ?? 2;

      // Prepare the rembg output for the crop script
      const alphaPng = await sharp(removed).ensureAlpha().extractChannel(3).png().toBuffer();
      const maskInner = await sharp(alphaPng).threshold(innerThreshold).png().toBuffer();
      const maskFeather = await sharp(maskInner).blur(featherPx).png().toBuffer();
      const rgbPng = await sharp(removed).removeAlpha().png().toBuffer();
      const recomposed = await sharp(rgbPng).joinChannel(maskFeather).png().toBuffer();
      
      const tmpIn = path.join(os.tmpdir(), `rembg_for_crop_in_${Date.now()}.png`);
      const tmpOut = path.join(os.tmpdir(), `rembg_for_crop_out_${Date.now()}.jpg`);
      
      // Flatten over white for the crop script (MediaPipe needs opaque input)
      const flattenedForCrop = await sharp(recomposed).flatten({ background: { r: 255, g: 255, b: 255 } }).png().toBuffer();
      await fs.promises.writeFile(tmpIn, flattenedForCrop);
      if (debug) console.log('WROTE REMBG FOR CROP:', tmpIn);

      // REQUIRED: Call MediaPipe crop script - this is essential for proper 2x2 ID framing
      let cropRan = false;
      let cropJson: any = null;
      let cropOutPath: string | null = null;
      let lastError: string = '';

      // Try 'py -3' first (Windows)
      try {
        const pyCmd = 'py';
        const args = ['-3', path.join(process.cwd(), 'scripts', 'crop_rush_id.py'), tmpIn, tmpOut, '--size', '600'];
        if (wantTransparent) args.push('--preserve-alpha');
        const res = execFileSync(pyCmd, args, { stdio: 'pipe', timeout: 30000 });
        const resStr = String(res);
        if (debug) console.log('crop CLI (py -3) stdout:', resStr);
        const jsonMatch = resStr.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          cropJson = JSON.parse(jsonMatch[0]);
          cropOutPath = cropJson.outPath;
          processedBuffer = await fs.promises.readFile(cropOutPath);
          cropRan = true;
        }
      } catch (e: any) {
        lastError = e?.stderr ? String(e.stderr) : (e?.message || String(e));
        if (debug) console.error('crop CLI (py -3) failed:', lastError);
        
        // Try 'python' as fallback
        try {
          const py2 = process.env.PYTHON || 'python';
          const args2 = [path.join(process.cwd(), 'scripts', 'crop_rush_id.py'), tmpIn, tmpOut, '--size', '600'];
          if (wantTransparent) args2.push('--preserve-alpha');
          const res2 = execFileSync(py2, args2, { stdio: 'pipe', timeout: 30000 });
          const resStr2 = String(res2);
          if (debug) console.log('crop CLI (python) stdout:', resStr2);
          const jsonMatch2 = resStr2.match(/\{[\s\S]*?\}/);
          if (jsonMatch2) {
            cropJson = JSON.parse(jsonMatch2[0]);
            cropOutPath = cropJson.outPath;
            processedBuffer = await fs.promises.readFile(cropOutPath);
            cropRan = true;
          }
        } catch (e2: any) {
          lastError = e2?.stderr ? String(e2.stderr) : (e2?.message || String(e2));
          if (debug) console.error('crop CLI (python) also failed:', lastError);
        }
      }

      // Cleanup temp files
      try { await fs.promises.unlink(tmpIn).catch(()=>{}); } catch {}
      try { await fs.promises.unlink(tmpOut).catch(()=>{}); } catch {}
      if (cropOutPath) { try { await fs.promises.unlink(cropOutPath).catch(()=>{}); } catch {} }

      if (!cropRan) {
        // MediaPipe crop script is REQUIRED - fail with clear error
        return NextResponse.json({ 
          error: 'MediaPipe crop script failed. Required for proper 2x2 ID photo framing.',
          details: `The crop_rush_id.py script (which uses MediaPipe for face detection) failed to run. Error: ${lastError || 'Unknown error'}. Please ensure Python dependencies are installed: py -3 -m pip install opencv-python mediapipe numpy`,
          installCommand: 'py -3 -m pip install opencv-python mediapipe numpy'
        }, { status: 500 });
      }

      if (debug) console.log('MediaPipe crop script succeeded, using cropped output');
      // cropJson is now available for SHA256 in raw response
      
    } catch (err: any) {
      console.error('Pipeline error after rembg:', err);
      return NextResponse.json({ 
        error: 'Image processing pipeline failed',
        details: err?.message || String(err)
      }, { status: 500 });
    }
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
