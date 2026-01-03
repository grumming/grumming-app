import { useRef, useState, useCallback } from 'react';
import { Upload, X, Image, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DragDropAttachmentsProps {
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
}

export const DragDropAttachments = ({
  attachments,
  onAttachmentsChange,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
}: DragDropAttachmentsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

  const generatePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => ({
          ...prev,
          [file.name]: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateAndAddFiles = useCallback((files: FileList | File[]) => {
    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: Only images and PDFs are allowed`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: File size must be less than ${maxSize / 1024 / 1024}MB`);
        continue;
      }
      if (attachments.length + validFiles.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} attachments allowed`);
        break;
      }
      validFiles.push(file);
      generatePreview(file);
    }

    if (validFiles.length > 0) {
      onAttachmentsChange([...attachments, ...validFiles]);
    }
  }, [attachments, maxFiles, maxSize, onAttachmentsChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  }, [validateAndAddFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAddFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    const file = attachments[index];
    setPreviews((prev) => {
      const updated = { ...prev };
      delete updated[file.name];
      return updated;
    });
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          attachments.length >= maxFiles && 'opacity-50 pointer-events-none'
        )}
      >
        <Upload className={cn('h-8 w-8 mx-auto mb-2', isDragging ? 'text-primary' : 'text-muted-foreground')} />
        <p className="text-sm font-medium">
          {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Images and PDFs, max {maxSize / 1024 / 1024}MB each, up to {maxFiles} files
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {attachments.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative group border rounded-lg overflow-hidden bg-muted/50"
            >
              {/* Preview */}
              {previews[file.name] ? (
                <div className="aspect-square">
                  <img
                    src={previews[file.name]}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center p-2">
                  <FileText className="h-8 w-8 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground truncate w-full text-center px-1">
                    {file.name}
                  </p>
                </div>
              )}

              {/* File Info Overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-xs text-white truncate">{file.name}</p>
                <p className="text-xs text-white/70">{formatFileSize(file.size)}</p>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAttachment(index);
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
