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

        // Build the mask-sharpened recomposed image (apply inner threshold + feather)
        // then write that as the input to the crop CLI. If the caller requested
        // transparent output we keep the alpha channel; otherwise we flatten to white.
        const innerThreshold = parsedInnerThreshold ?? 200;
        const featherPx = parsedFeatherPx ?? 2;

        const alphaPng = await sharp(removed).ensureAlpha().extractChannel(3).png().toBuffer();
        if (debug) {
          await fs.promises.writeFile(path.join(os.tmpdir(), `rembg_debug_alpha_${Date.now()}.png`), alphaPng).catch(()=>{});
        }
        const maskInner = await sharp(alphaPng).threshold(innerThreshold).png().toBuffer();
        const maskFeather = await sharp(maskInner).blur(featherPx).png().toBuffer();
        if (debug) {
          await fs.promises.writeFile(path.join(os.tmpdir(), `rembg_debug_mask_feather_${Date.now()}.png`), maskFeather).catch(()=>{});
        }

        const rgbPng = await sharp(removed).removeAlpha().png().toBuffer();
        const recomposed = await sharp(rgbPng).joinChannel(maskFeather).png().toBuffer();
        const tmpIn = path.join(os.tmpdir(), `rembg_for_crop_in_${Date.now()}.png`);
        const tmpOut = path.join(os.tmpdir(), `rembg_for_crop_out_${Date.now()}.jpg`);
        if (wantTransparent) {
          // keep alpha
          await fs.promises.writeFile(tmpIn, recomposed).catch(()=>{});
          if (debug) console.log('WROTE REMBG FOR CROP (recomposed with alpha):', tmpIn);
        } else {
          // Flatten over white so the CLI receives a fully opaque white-background PNG
          const flattenedForCrop = await sharp(recomposed).flatten({ background: { r: 255, g: 255, b: 255 } }).png().toBuffer();
          await fs.promises.writeFile(tmpIn, flattenedForCrop).catch(()=>{});
          if (debug) console.log('WROTE REMBG FOR CROP (flattened recomposed):', tmpIn);
        }

        // Try to run the Python crop CLI (prefer 'py -3' on Windows)
        let cropRan = false;
        let cropJson = null, cropSha = null, cropOutPath = null;
        try {
          const pyCmd = 'py';
          const args = ['-3', path.join(process.cwd(), 'scripts', 'crop_rush_id.py'), tmpIn, tmpOut, '--size', '600'];
          if (wantTransparent) args.push('--preserve-alpha');
          const res = execFileSync(pyCmd, args, { stdio: 'pipe', timeout: 20000 });
          const resStr = String(res);
          if (debug) console.log('crop CLI stdout:', resStr);
          const jsonMatch = resStr.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            cropJson = JSON.parse(jsonMatch[0]);
            cropSha = cropJson.sha256;
            cropOutPath = cropJson.outPath;
            processedBuffer = await fs.promises.readFile(cropOutPath);
            cropRan = true;
          }
        } catch (e: any) {
          if (debug) console.error('crop CLI (py) failed, trying python', e && e.message ? e.message : e);
          try {
            const py2 = process.env.PYTHON || 'python';
            const args2 = ['scripts/crop_rush_id.py', tmpIn, tmpOut, '--size', '600'];
            if (wantTransparent) args2.push('--preserve-alpha');
            const res2 = execFileSync(py2, args2, { stdio: 'pipe', timeout: 20000 });
            const resStr2 = String(res2);
            if (debug) console.log('crop CLI (python) stdout:', resStr2);
            const jsonMatch2 = resStr2.match(/\{[\s\S]*?\}/);
            if (jsonMatch2) {
              cropJson = JSON.parse(jsonMatch2[0]);
              cropSha = cropJson.sha256;
              cropOutPath = cropJson.outPath;
              processedBuffer = await fs.promises.readFile(cropOutPath);
              cropRan = true;
            }
          } catch (e2: any) {
            if (debug) console.error('crop CLI (python) also failed', e2 && e2.message ? e2.message : e2);
          }
        }

        // Cleanup temp files for the crop attempt
        try { await fs.promises.unlink(tmpIn).catch(()=>{}); } catch {}
        try { await fs.promises.unlink(tmpOut).catch(()=>{}); } catch {}
        if (cropOutPath) { try { await fs.promises.unlink(cropOutPath).catch(()=>{}); } catch {} }

        if (cropRan) {
          if (debug) console.log('Crop CLI produced output; using it');
        } else {
          if (debug) console.log('Crop CLI did not produce output; falling back to mask-based recomposition');

          if (debug) {
            const tmpRaw = path.join(os.tmpdir(), `rembg_debug_raw_${Date.now()}.png`);
            await fs.promises.writeFile(tmpRaw, removed).catch(()=>{});
            console.log('WROTE REMBG RAW:', tmpRaw);
          }

          // Parameters chosen: inner threshold & feather (can be overridden)
          const innerThreshold = parsedInnerThreshold ?? 200;
          const featherPx = parsedFeatherPx ?? 2;

          // Extract alpha channel as PNG
          const alphaPng = await sharp(removed).ensureAlpha().extractChannel(3).png().toBuffer();
          if (debug) {
            await fs.promises.writeFile(path.join(os.tmpdir(), `rembg_debug_alpha_${Date.now()}.png`), alphaPng).catch(()=>{});
          }

          // Hard interior mask and a softly feathered version
          const maskInner = await sharp(alphaPng).threshold(innerThreshold).png().toBuffer();
          if (debug) {
            await fs.promises.writeFile(path.join(os.tmpdir(), `rembg_debug_mask_inner_${Date.now()}.png`), maskInner).catch(()=>{});
          }

          const maskFeather = await sharp(maskInner).blur(featherPx).png().toBuffer();
          if (debug) {
            await fs.promises.writeFile(path.join(os.tmpdir(), `rembg_debug_mask_feather_${Date.now()}.png`), maskFeather).catch(()=>{});
          }

          // Recompose RGB with the feathered alpha and flatten
          const rgbPng = await sharp(removed).removeAlpha().png().toBuffer();
          const recomposed = await sharp(rgbPng).joinChannel(maskFeather).png().toBuffer();
          if (debug) {
            await fs.promises.writeFile(path.join(os.tmpdir(), `rembg_debug_recomposed_${Date.now()}.png`), recomposed).catch(()=>{});
          }

          processedBuffer = await sharp(recomposed)
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .resize(600, 600, { fit: 'cover' })
            .jpeg({ quality: 95 })
            .toBuffer();
        }
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
  const debug = process.env.DEBUG_REMBG === '1';
  let cropJson: any = null; // Ensure cropJson is always defined
  if (wantRaw) {
    if (!processedBuffer) {
      return NextResponse.json({ error: 'No image produced' }, { status: 500 });
    }

    // Compute SHA256 of the final buffer for verification
    // Use SHA256 from Python if available
    let sha256 = null;
    if (typeof cropJson?.sha256 === 'string' && cropJson.sha256.length === 64) {
      sha256 = cropJson.sha256;
    } else {
      sha256 = crypto.createHash('sha256').update(processedBuffer).digest('hex');
    }

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
  return NextResponse.json({ message: '2x2 ID generated!', image: `data:image/jpeg;base64,${base64}` });
}
