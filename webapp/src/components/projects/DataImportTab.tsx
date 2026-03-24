import { useState } from 'react';
import { FileUploadZone } from './FileUploadZone';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface ProjectFormData {
  workspaceId: string;
  name: string;
  description: string;
  importFiles: File[];
  importUrls: string[];
  labelConfig: string;
  templateId?: string;
}

interface DataImportTabProps {
  formData: ProjectFormData;
  updateFormData: (updates: Partial<ProjectFormData>) => void;
}

export function DataImportTab({ formData, updateFormData }: DataImportTabProps) {
  const [urlInput, setUrlInput] = useState<string>('');

  function handleFilesSelected(files: File[]) {
    updateFormData({ importFiles: [...formData.importFiles, ...files] });
  }

  function handleRemoveFile(index: number) {
    const newFiles = formData.importFiles.filter((_, i) => i !== index);
    updateFormData({ importFiles: newFiles });
  }

  function handleAddUrl() {
    if (urlInput.trim()) {
      updateFormData({ importUrls: [...formData.importUrls, urlInput.trim()] });
      setUrlInput('');
    }
  }

  function handleRemoveUrl(index: number) {
    const newUrls = formData.importUrls.filter((_, i) => i !== index);
    updateFormData({ importUrls: newUrls });
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Import Data</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Upload files or add URLs to import data into your project. You can skip this step
            and add data later.
          </p>
        </div>

        {/* File Upload Zone */}
        <div className="space-y-4">
          <FileUploadZone onFilesSelected={handleFilesSelected} />

          {/* Uploaded Files List */}
          {formData.importFiles.length > 0 ? (
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium mb-3">
                Uploaded Files ({formData.importFiles.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.importFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                  >
                    <span className="truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* URL Import */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Import from URL</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Add URLs to import data from external sources
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/data.json"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add URL
            </Button>
          </div>

          {/* URL List */}
          {formData.importUrls.length > 0 ? (
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium mb-3">
                URLs ({formData.importUrls.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.importUrls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                  >
                    <span className="truncate">{url}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleRemoveUrl(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Supported Formats Info */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="text-sm font-medium mb-3">Supported File Types</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Images:</span> JPG, PNG, GIF, BMP,
              SVG, WEBP
            </div>
            <div>
              <span className="font-medium text-foreground">Audio:</span> MP3, WAV, FLAC, OGG
            </div>
            <div>
              <span className="font-medium text-foreground">Video:</span> MP4, AVI, MOV, WEBM
            </div>
            <div>
              <span className="font-medium text-foreground">Text:</span> TXT, CSV, TSV, JSON
            </div>
            <div>
              <span className="font-medium text-foreground">HTML:</span> HTML, HTM
            </div>
            <div>
              <span className="font-medium text-foreground">Data:</span> XML, YAML, JSON
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
