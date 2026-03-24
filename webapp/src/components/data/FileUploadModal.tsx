import { useState, useCallback } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { dataApi } from '@/lib/dataApi';
import type { FileUploadResponse } from '../../../../backend/src/types';

interface FileUploadModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onUploadComplete: (response: FileUploadResponse) => void;
}

export function FileUploadModal({
  open,
  onClose,
  projectId,
  onUploadComplete,
}: FileUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FileUploadResponse | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    const validTypes = ['text/csv', 'text/tab-separated-values', 'application/json'];
    const validExtensions = ['.csv', '.tsv', '.json'];

    const hasValidType = validTypes.includes(selectedFile.type) ||
      validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

    if (!hasValidType) {
      setError('Invalid file type. Please upload a CSV, TSV, or JSON file.');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await dataApi.uploadDataFile(projectId, file);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setPreview(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onUploadComplete(preview);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setIsDragging(false);
    setIsUploading(false);
    setUploadProgress(0);
    setError(null);
    setPreview(null);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Upload a CSV, TSV, or JSON file to import tasks into your project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {!file && !preview ? (
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Drop your file here</h3>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <input
                type="file"
                accept=".csv,.tsv,.json"
                onChange={handleFileInputChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>Select File</span>
                </Button>
              </label>
            </div>
          ) : null}

          {file && !preview ? (
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-8 w-8 text-primary mt-1" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {!isUploading ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>

              {isUploading ? (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Uploading and processing... {uploadProgress}%
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {preview ? (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Upload Complete</h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {preview.taskCount} tasks
                  </span>
                  <span className="text-muted-foreground">
                    {preview.columnCount} columns
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Detected Columns:</h4>
                <div className="flex flex-wrap gap-2">
                  {preview.columns.map((col) => (
                    <div
                      key={col.id}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-secondary rounded-full text-sm"
                    >
                      <span className="font-medium">{col.displayName}</span>
                      <span className="text-muted-foreground text-xs">
                        ({col.type})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {preview.sampleData && preview.sampleData.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Sample Data (first 3 rows):
                  </h4>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {preview.columns.map((col) => (
                            <th
                              key={col.id}
                              className="px-3 py-2 text-left font-medium"
                            >
                              {col.displayName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleData.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            {preview.columns.map((col) => (
                              <td key={col.id} className="px-3 py-2">
                                {typeof row[col.name] === 'object'
                                  ? JSON.stringify(row[col.name])
                                  : String(row[col.name] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {!preview && file ? (
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          ) : null}
          {preview ? (
            <Button onClick={handleConfirm}>Confirm Import</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
