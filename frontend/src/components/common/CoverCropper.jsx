import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, ZoomIn, ZoomOut, RotateCcw, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';

export default function CoverCropper({ initialFile = null, onCropComplete, onCancel }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [originalFilename, setOriginalFilename] = useState('cover.jpg');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewUrl, setPreviewUrl] = useState(null);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const VIEWPORT_W = 240;
  const VIEWPORT_H = 360;

  const exportCrop = useCallback((img, currentZoom, currentOffset, filename) => {
    if (!img) return;

    const exportW = 600;
    const exportH = 900;
    const exportScale = exportW / VIEWPORT_W;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportW;
    exportCanvas.height = exportH;
    const exportCtx = exportCanvas.getContext('2d');

    exportCtx.fillStyle = '#1C1917';
    exportCtx.fillRect(0, 0, exportW, exportH);

    exportCtx.drawImage(
      img,
      currentOffset.x * exportScale,
      currentOffset.y * exportScale,
      img.width * currentZoom * exportScale,
      img.height * currentZoom * exportScale
    );

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], filename || 'cover.jpg', { type: 'image/jpeg' });
      const localUrl = URL.createObjectURL(blob);
      setPreviewUrl(localUrl);

      if (onCropComplete) {
        onCropComplete(file, localUrl);
      }
    }, 'image/jpeg', 0.92);
  }, [onCropComplete]);

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const croppedFilename = file.name.replace(/\.[^/.]+$/, '') + '-cropped.jpg';
    setOriginalFilename(croppedFilename);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        const scaleX = VIEWPORT_W / img.width;
        const scaleY = VIEWPORT_H / img.height;
        const baseZoom = Math.max(scaleX, scaleY);
        const initOffset = {
          x: (VIEWPORT_W - img.width * baseZoom) / 2,
          y: (VIEWPORT_H - img.height * baseZoom) / 2,
        };
        setZoom(baseZoom);
        setOffset(initOffset);
        setImageSrc(e.target.result);

        exportCrop(img, baseZoom, initOffset, croppedFilename);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, [exportCrop]);

  useEffect(() => {
    if (initialFile && !imageSrc) {
      loadFile(initialFile);
    }
  }, [initialFile, imageSrc, loadFile]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);

    ctx.fillStyle = '#1C1917';
    ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H);

    const drawW = img.width * zoom;
    const drawH = img.height * zoom;
    ctx.drawImage(img, offset.x, offset.y, drawW, drawH);
  }, [zoom, offset]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleZoomChange = (newZoom) => {
    const img = imageRef.current;
    if (!img) return;

    const centerX = VIEWPORT_W / 2;
    const centerY = VIEWPORT_H / 2;

    const currentImgX = (centerX - offset.x) / zoom;
    const currentImgY = (centerY - offset.y) / zoom;

    const newOffsetX = centerX - currentImgX * newZoom;
    const newOffsetY = centerY - currentImgY * newZoom;

    setZoom(newZoom);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newZoom = Math.min(Math.max(zoom + delta, 0.2), 3);
    handleZoomChange(newZoom);
  };

  const handleReset = () => {
    const img = imageRef.current;
    if (!img) return;
    const scaleX = VIEWPORT_W / img.width;
    const scaleY = VIEWPORT_H / img.height;
    const baseZoom = Math.max(scaleX, scaleY);
    const resetOffset = {
      x: (VIEWPORT_W - img.width * baseZoom) / 2,
      y: (VIEWPORT_H - img.height * baseZoom) / 2,
    };
    setZoom(baseZoom);
    setOffset(resetOffset);
    exportCrop(img, baseZoom, resetOffset, originalFilename);
  };

  const handleConfirmCrop = () => {
    const img = imageRef.current;
    if (!img) return;
    exportCrop(img, zoom, offset, originalFilename);
  };

  return (
    <div className="bg-paper rounded border border-rule p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base text-ink">Book Cover (2:3 Aspect Ratio)</h3>
          <p className="text-xs text-muted font-body">
            Upload and position your cover artwork. Drag to position, zoom to fit.
          </p>
        </div>
        {imageSrc && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Position
          </button>
        )}
      </div>

      {!imageSrc ? (
        <label className="border border-dashed border-rule hover:border-ink bg-paper rounded p-8 flex flex-col items-center justify-center cursor-pointer min-h-[260px]">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) loadFile(e.target.files[0]);
            }}
          />
          <div className="w-10 h-10 rounded border border-rule flex items-center justify-center text-muted mb-3">
            <Upload className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs text-ink mb-1">
            Choose cover artwork or drag here
          </span>
          <span className="text-xs text-muted font-body">JPEG, PNG, or WebP up to 10 MB</span>
          <span className="mt-3 px-2 py-0.5 border border-rule rounded text-[11px] font-bold uppercase tracking-wider text-muted">
            Standard 2:3 Ratio
          </span>
        </label>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative shrink-0">
            <div
              className="relative overflow-hidden rounded border border-rule bg-ink cursor-move"
              style={{ width: `${VIEWPORT_W}px`, height: `${VIEWPORT_H}px` }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              onWheel={handleWheel}
            >
              <canvas
                ref={canvasRef}
                width={VIEWPORT_W}
                height={VIEWPORT_H}
                className="w-full h-full block select-none"
              />

              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-ink text-paper text-[10px] px-2 py-0.5 rounded border border-rule pointer-events-none">
                Drag to frame
              </div>
            </div>
          </div>

          <div className="flex-1 w-full space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-ink mb-1.5">
                <span className="flex items-center gap-1.5">
                  <ZoomIn className="w-4 h-4 text-muted" />
                  Scale / Zoom
                </span>
                <span className="text-muted font-mono">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <ZoomOut className="w-4 h-4 text-muted" />
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.02"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-rule rounded appearance-none cursor-pointer accent-accent"
                />
                <ZoomIn className="w-4 h-4 text-muted" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded border border-rule hover:bg-rule/40 text-xs font-semibold text-ink cursor-pointer">
                <ImageIcon className="w-4 h-4" />
                Change Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) loadFile(e.target.files[0]);
                  }}
                />
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleConfirmCrop}
                className="flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirm 2:3 Cover
              </Button>
              {onCancel && (
                <Button type="button" variant="ghost" size="md" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>

            {previewUrl && (
              <p className="text-xs text-success font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Cover cropped (600 × 900 px)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
