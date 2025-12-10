// src/components/UploadCard.tsx
import { useState } from "react";
import type React from "react";
import type { UploadedFile } from "../types";

type UploadCardProps = {
  title: string;
  hint: React.ReactNode;
  accept: string;
  multiple?: boolean;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  dragLabel?: string;
};

export function UploadCard({
  title,
  hint,
  accept,
  multiple = true,
  files,
  onFilesChange,
  dragLabel,
}: UploadCardProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const mapFiles = (fileList: FileList | null): UploadedFile[] => {
    if (!fileList) return [];
    return Array.from(fileList).map((file) => ({
      file,
      name: file.name,
      size: file.size,
    }));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = mapFiles(event.target.files);
    if (uploaded.length === 0) return;
    onFilesChange(uploaded);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    const uploaded = mapFiles(event.dataTransfer.files);
    if (uploaded.length === 0) return;
    onFilesChange(uploaded);
  };

  const handleRemove = (fileName: string) => {
    const filtered = files.filter((f) => f.name !== fileName);
    onFilesChange(filtered);
  };

  return (
    <div
      className={`upload-card ${isDragActive ? "drag-active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <h2>{title}</h2>
      <p className="upload-hint">
        {hint}
        {dragLabel && (
          <>
            <br />
            <span>{dragLabel}</span>
          </>
        )}
      </p>

      <input
        type="file"
        multiple={multiple}
        onChange={handleChange}
        accept={accept}
      />

      {files.length > 0 && (
        <div className="file-list">
          <h3>Arquivos carregados:</h3>
          <ul>
            {files.map((file) => (
              <li key={file.name} className="file-item">
                <span className="file-name">{file.name}</span>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => handleRemove(file.name)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
