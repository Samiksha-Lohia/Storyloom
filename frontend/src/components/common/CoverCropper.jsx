import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, ZoomIn, ZoomOut, RotateCcw, Check, Image as ImageIcon } from 'lucide-react';
import { Button } from './Button';

/**
 * CoverCropper
 * A zero-dependency 2:3 aspect-ratio canvas image cropper.
 * Perfect for Wattpad-style 2:3 book covers (e.g. 600x900).
 * Supports pan via dragging, zoom slider/wheel, and live 2:3 viewport framing.
 *
 * @param {Object} props
 * @param {File|null} props.initialFile
 * @param {Function} props.onCropComplete - Callback receiving (croppedBlobOrFile, previewUrl)
 * @param {Function} props.onCancel
 */
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

  // Viewport display dimensions: 240px wide by 360px tall (exact 2:3 ratio)
  const VIEWPORT_W = 240;
  const VIEWPORT_H = 360;

  // Load image from file
  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setOriginalFilename(file.name.replace(/\.[^/.]+$/, '') + '-cropped.jpg');
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageSrc(e.target.result);
        // Calculate initial cover-fit scale
        const scaleW = VIEWPORT_W / img.width;
        const scaleH = VIEWPORT_H / img.height;
        const initialScale = Math.max(scaleW, scaleH);
        setZoom(initialScale);
        // Center offset
        setOffset({
          x: (VIEWPORT_W - img.width * initialScale) / 2,
          y: (VIEWPORT_H - img.height * initialScale) / 2,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  useEffect(() => {
    if (initialFile) {
      loadFile(initialFile);
    }
  }, [initialFile, loadFile]);

  // Redraw canvas on changes
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, VIEWPORT_W, VIEWPORT_H);

    // Save and draw scaled/offset image
    ctx.save();
    ctx.drawImage(img, offset.x, offset.y, img.width * zoom, img.height * zoom);
    ctx.restore();
  }, [offset, zoom]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pan handlers
  const handleMouseDown = (e) => {
    if (!imageSrc) return;
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

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (!imageSrc || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - offset.x,
      y: e.touches[0].clientY - offset.y,
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  // Zoom handlers
  const handleZoomChange = (newZoom) => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    // Zoom toward center
    const centerBefore = {
      x: (VIEWPORT_W / 2 - offset.x) / zoom,
      y: (VIEWPORT_H / 2 - offset.y) / zoom,
    };
    const nextZoom = Math.max(0.1, Math.min(3, newZoom));
    const nextOffset = {
      x: VIEWPORT_W / 2 - centerBefore.x * nextZoom,
      y: VIEWPORT_H / 2 - centerBefore.y * nextZoom,
    };
    setZoom(nextZoom);
    setOffset(nextOffset);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    handleZoomChange(zoom * factor);
  };

  // Export 2:3 high-res image (600x900)
  const handleConfirmCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 600;
    exportCanvas.height = 900;
    const ctx = exportCanvas.getContext('2d');

    // Scale from preview viewport (240x360) to export (600x900)
    const exportScale = 600 / VIEWPORT_W;

    ctx.drawImage(
      img,
      offset.x * exportScale,
      offset.y * exportScale,
      img.width * zoom * exportScale,
      img.height * zoom * exportScale
    );

    exportCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], originalFilename, { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        if (onCropComplete) {
          onCropComplete(file, url);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleReset = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;
    const scaleW = VIEWPORT_W / img.width;
    const scaleH = VIEWPORT_H / img.height;
    const initialScale = Math.max(scaleW, scaleH);
    setZoom(initialScale);
    setOffset({
      x: (VIEWPORT_W - img.width * initialScale) / 2,
      y: (VIEWPORT_H - img.height * initialScale) / 2,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-stone-900">Book Cover (2:3 Aspect Ratio)</h3>
          <p className="text-xs text-stone-500">
            Upload and position your cover artwork. Drag to position, zoom to fit.
          </p>
        </div>
        {imageSrc && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-[#FF500A] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Position
          </button>
        )}
      </div>

      {!imageSrc ? (
        /* Upload Drag-and-Drop Area */
        <label className="border-2 border-dashed border-stone-200 hover:border-[#FF500A] bg-stone-50 hover:bg-[#FFF0E8]/20 transition-all rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer group min-h-[300px]">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) loadFile(e.target.files[0]);
            }}
          />
          <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 group-hover:border-[#FF500A] shadow-xs flex items-center justify-center text-stone-400 group-hover:text-[#FF500A] transition mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm text-stone-800 mb-1">
            Choose cover artwork or drag here
          </span>
          <span className="text-xs text-stone-500">JPEG, PNG, or WebP up to 10 MB</span>
          <span className="mt-3 px-3 py-1 bg-stone-200/60 rounded-full text-[11px] font-bold uppercase tracking-wider text-stone-600">
            Standard 2:3 Ratio
          </span>
        </label>
      ) : (
        /* Interactive Cropper Viewport */
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Viewport Frame */}
          <div className="relative group shrink-0">
            <div
              className="relative overflow-hidden rounded-xl border-2 border-[#FF500A] bg-stone-900 cursor-move shadow-md"
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

              {/* Viewport Grid Lines for Framing */}
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

              {/* Helper pill */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-full pointer-events-none">
                Drag to frame
              </div>
            </div>
          </div>

          {/* Controls & Previews */}
          <div className="flex-1 w-full space-y-4">
            {/* Zoom Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-stone-500" />
                  Scale / Zoom
                </span>
                <span className="text-stone-500">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-stone-400" />
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.02"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#FF500A]"
                />
                <ZoomIn className="w-4 h-4 text-stone-400" />
              </div>
            </div>

            {/* Change Image Button */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 cursor-pointer transition">
                <ImageIcon className="w-3.5 h-3.5" />
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

            {/* Actions */}
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
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Cover cropped and ready for upload (600 × 900 px)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
