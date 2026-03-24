import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export function FileUploadZone({ onFilesSelected }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFilesSelected(Array.from(files));
      }
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    },
    [onFilesSelected]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-lg p-12 transition-colors cursor-pointer',
        'hover:border-primary/50 hover:bg-muted/30',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 bg-background'
      )}
    >
      <input
        type="file"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Upload files"
      />

      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div
          className={cn(
            'h-16 w-16 rounded-full flex items-center justify-center transition-colors',
            isDragging ? 'bg-primary/20' : 'bg-primary/10'
          )}
        >
          <Upload
            className={cn(
              'h-8 w-8 transition-colors',
              isDragging ? 'text-primary' : 'text-primary/70'
            )}
          />
        </div>

        <div>
          <h4 className="text-base font-medium mb-2">
            {isDragging ? 'Drop files here' : 'Drop files here or click to browse'}
          </h4>
          <p className="text-sm text-muted-foreground">
            Select one or multiple files from your computer
          </p>
        </div>
      </div>
    </div>
  );
}
