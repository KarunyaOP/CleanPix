import React from "react";
import { UploadCloud } from "lucide-react";

export interface DropzoneProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  isDragging,
  fileInputRef,
}) => {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={`relative w-full rounded-panel border-2 border-dashed transition-all duration-200 cursor-pointer p-8 sm:p-10 flex flex-col items-center justify-center text-center select-none group ${
        isDragging
          ? "border-primary bg-primary/10 shadow-[0_0_32px_rgba(79,124,255,0.4)] scale-[1.01]"
          : "border-primary/35 bg-primary/[0.04] hover:border-primary/70 hover:bg-primary/[0.08] hover:shadow-[0_0_24px_rgba(79,124,255,0.2)]"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={onFileSelect}
        className="hidden"
      />

      {/* Cloud Icon in Glowing Chip */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
          isDragging
            ? "bg-primary/30 text-white shadow-[0_0_24px_rgba(79,124,255,0.8)] scale-110"
            : "bg-primary/15 border border-primary/30 text-accent group-hover:scale-105 group-hover:bg-primary/25 group-hover:shadow-[0_0_20px_rgba(79,124,255,0.4)]"
        }`}
      >
        <UploadCloud size={28} className={isDragging ? "animate-bounce" : ""} />
      </div>

      {/* Primary Label */}
      <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-1.5 group-hover:text-white transition-colors">
        {isDragging ? "Drop your image right here..." : "Drop your image here or click to browse"}
      </h3>

      {/* Helper Caption */}
      <p className="text-xs text-text-muted font-medium tracking-wide">
        Supports JPG, PNG, WEBP <span className="mx-1">•</span> Max 10MB
      </p>
    </div>
  );
};
