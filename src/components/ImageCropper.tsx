
import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';


// selectedSize: '2x2' | 'passport'
export default function ImageCropper({ imageSrc, onCropComplete, selectedSize, onResetOriginal }) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({ width: 400, height: 400 });

  // Set aspect ratio and output size based on selectedSize
  let aspect = 1; // default 2x2
  let outputWidth = 600, outputHeight = 600;
  if (selectedSize === 'passport') {
    aspect = 35 / 45;
    outputWidth = 413; // 35mm at 300dpi
    outputHeight = 531; // 45mm at 300dpi
  }

  // Center crop on image load
  function getDefaultCrop(displayWidth: number, displayHeight: number) {
    // Use pixel units for react-image-crop, based on displayed size
    const width = Math.round(displayWidth * 0.8);
    const height = Math.round(width / aspect);
    return centerCrop(
      makeAspectCrop(
        {
          unit: 'px',
          width,
        },
        aspect,
        displayWidth,
        displayHeight
      ),
      displayWidth,
      displayHeight
    );
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    // Calculate display size to fit max 400x400
    let dWidth = 400, dHeight = 400;
    if (naturalWidth > naturalHeight) {
      dHeight = Math.round((naturalHeight / naturalWidth) * 400);
    } else {
      dWidth = Math.round((naturalWidth / naturalHeight) * 400);
    }
    setDisplaySize({ width: dWidth, height: dHeight });
    setCrop(getDefaultCrop(dWidth, dHeight));
  }

  function handleResetCrop() {
    if (onResetOriginal) {
      onResetOriginal();
    }
  }

  useEffect(() => {
    if (completedCrop && onCropComplete && naturalSize) {
      // Map crop from display size to natural size
      const scaleX = naturalSize.width / displaySize.width;
      const scaleY = naturalSize.height / displaySize.height;
      onCropComplete(
        {
          x: Math.round(completedCrop.x * scaleX),
          y: Math.round(completedCrop.y * scaleY),
          width: Math.round(completedCrop.width * scaleX),
          height: Math.round(completedCrop.height * scaleY),
        },
        { width: outputWidth, height: outputHeight }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCrop, naturalSize, displaySize]);

  return (
    <div style={{ position: 'relative', width: 420, height: 420, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <ReactCrop
        crop={crop}
        onChange={c => setCrop(c)}
        aspect={aspect}
        onComplete={c => setCompletedCrop(c)}
        minWidth={40}
        minHeight={40}
        keepSelection
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: displaySize.width, height: displaySize.height, background: '#f8f8f8' }}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Crop"
          style={{ width: displaySize.width, height: displaySize.height, objectFit: 'contain', display: 'block', margin: '0 auto' }}
          onLoad={onImageLoad}
        />
      </ReactCrop>
      <button
        type="button"
        style={{ marginTop: 16, background: '#eee', border: 'none', borderRadius: 8, padding: '6px 18px', fontWeight: 600, cursor: 'pointer' }}
        onClick={handleResetCrop}
      >
        Reset to Original
      </button>
    </div>
  );
}
