import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataToolbar } from '@/components/datamanager/DataToolbar';
import { DynamicDataTable, type LocalDataColumn } from '@/components/data/DynamicDataTable';
import { ColumnConfigDrawer } from '@/components/data/ColumnConfigDrawer';
import { BulkLabelModal } from '@/components/datamanager/BulkLabelModal';
import { AssignAnnotatorDialog } from '@/components/datamanager/AssignAnnotatorDialog';
import { Button } from '@/components/ui/button';
import { DataFilters, type ColumnFilter } from '@/components/datamanager/DataFilters';
import { api } from '@/lib/api';
import type { Task } from '@/types';
import { useGeocoding, hasGeoData } from '@/hooks/useGeocoding';
import { useProjectTabs } from '@/contexts/ProjectTabContext';
import { useUsers } from '@/store';

interface BackendDataColumn {
  id: string;
  name: string;
  displayName: string;
  type: string;
  visible: boolean;
  order: number;
}

interface BackendTask {
  id: string;
  projectId: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo: string | null;
  assignedUser: { id: string; name: string; email: string } | null;
  annotationLabel: string | null;
  annotationReasoning: string[] | null;
  annotationComment: string | null;
  annotatedAt: string | null;
  annotatorName: string | null;
  annotatorEmail: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface BackendPaginatedTasks {
  tasks: BackendTask[];
  columns: BackendDataColumn[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

// Adapt a backend DataColumn to a LocalDataColumn for DynamicDataTable
function adaptColumn(col: BackendDataColumn, hiddenColumns: Set<string>): LocalDataColumn {
  return {
    id: col.id,
    name: col.displayName,
    key: col.name,
    type: col.type,
    visible: col.visible && !hiddenColumns.has(col.name),
    order: col.order,
  };
}

// Adapt a backend task to the shape DynamicDataTable expects
function adaptTask(task: BackendTask): Task {
  return {
    id: task.id,
    projectId: task.projectId,
    status: task.status,
    annotationLabel: task.annotationLabel,
    completedCount: task.status === 'completed' ? 1 : 0,
    cancelledCount: 0,
    predictionsCount: 0,
    isStarred: false,
    createdAt: task.createdAt,
    data: {
      ...task.data,
      inner_id: task.id,
      task_state: task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Pending',
      annotation_label: task.annotationLabel ?? '—',
      total_annotations: task.status === 'completed' ? 1 : 0,
      skipped_annotations: 0,
      total_predictions: 0,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
      annotators: task.assignedUser?.name ?? null,
    },
  };
}

const META_COLUMNS: LocalDataColumn[] = [
  { id: 'meta-inner_id', name: 'Inner ID', key: 'inner_id', type: 'string', visible: true, order: -7 },
  { id: 'meta-task_state', name: 'Status', key: 'task_state', type: 'string', visible: true, order: -6 },
  { id: 'meta-annotation_label', name: 'Label', key: 'annotation_label', type: 'string', visible: true, order: -5 },
  { id: 'meta-annotators', name: 'Annotators', key: 'annotators', type: 'string', visible: false, order: -4 },
  { id: 'meta-total_annotations', name: 'Annotations', key: 'total_annotations', type: 'number', visible: false, order: -3 },
  { id: 'meta-skipped_annotations', name: 'Skipped', key: 'skipped_annotations', type: 'number', visible: false, order: -2 },
  { id: 'meta-total_predictions', name: 'Predictions', key: 'total_predictions', type: 'number', visible: false, order: -1 },
  { id: 'meta-created_at', name: 'Created At', key: 'created_at', type: 'date', visible: true, order: 0 },
];

export default function DataManager() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const { activeAnnotatorId } = useProjectTabs();
  const users = useUsers();

  // Resolve the display name of the active annotator (for filtering by assignedUser name)
  const activeAnnotatorName = useMemo(() => {
    if (!activeAnnotatorId) return null;
    return users.find((u) => u.id === activeAnnotatorId)?.name ?? null;
  }, [activeAnnotatorId, users]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [columnDrawerOpen, setColumnDrawerOpen] = useState<boolean>(false);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [bulkLabelOpen, setBulkLabelOpen] = useState<boolean>(false);
  const [assignOpen, setAssignOpen] = useState<boolean>(false);

  const pageSize = 50;

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', projectId, currentPage, pageSize],
    queryFn: () =>
      api.get<BackendPaginatedTasks>(`/api/projects/${projectId}/tasks?page=${currentPage}&pageSize=${pageSize}`),
    enabled: !!projectId,
  });

  const adaptedTasks = useMemo(() => {
    return (tasksData?.tasks ?? []).map(adaptTask);
  }, [tasksData]);

  // Reverse-geocode lat/lon fields into a "Location" column when present
  const locationMap = useGeocoding(adaptedTasks);
  const geoAvailable = useMemo(() => hasGeoData(adaptedTasks), [adaptedTasks]);

  const LOCATION_COLUMN: LocalDataColumn = {
    id: 'meta-location',
    name: 'Location',
    key: 'location',
    type: 'string',
    visible: true,
    order: 999,
  };

  const geocodedTasks = useMemo(() => {
    if (!geoAvailable) return adaptedTasks;
    return adaptedTasks.map((task) => ({
      ...task,
      data: {
        ...task.data,
        location: locationMap.get(task.id) ?? '…',
      },
    }));
  }, [adaptedTasks, locationMap, geoAvailable]);

  const columns = useMemo<LocalDataColumn[]>(() => {
    const backendCols = (tasksData?.columns ?? [])
      .map((col) => adaptColumn(col, hiddenColumns))
      .sort((a, b) => a.order - b.order);

    const metaCols = META_COLUMNS.map((col) => ({
      ...col,
      visible: !hiddenColumns.has(col.key),
    }));

    const locationCols = geoAvailable
      ? [{ ...LOCATION_COLUMN, visible: !hiddenColumns.has('location') }]
      : [];

    return [...metaCols, ...backendCols, ...locationCols];
  }, [tasksData, hiddenColumns, geoAvailable]);

  const allColumns = useMemo<LocalDataColumn[]>(() => {
    // All columns for filter/sort UI (no hidden filter applied)
    const backendCols = (tasksData?.columns ?? [])
      .map((col) => ({ ...adaptColumn(col, new Set()), visible: true }))
      .sort((a, b) => a.order - b.order);
    const locationCols = geoAvailable ? [LOCATION_COLUMN] : [];
    return [...META_COLUMNS, ...backendCols, ...locationCols];
  }, [tasksData, geoAvailable]);

  // Apply annotator tab filter first, then user-defined column filters
  const tabFilteredTasks = useMemo(() => {
    if (!activeAnnotatorName) return geocodedTasks;
    return geocodedTasks.filter(
      (task) => String(task.data.annotators ?? '') === activeAnnotatorName,
    );
  }, [geocodedTasks, activeAnnotatorName]);

  const filteredTasks = useMemo(() => {
    if (filters.length === 0) return tabFilteredTasks;
    return tabFilteredTasks.filter((task) =>
      filters.every((filter) => {
        if (!filter.value) return true;
        const raw = task.data[filter.columnKey];
        if (raw === null || raw === undefined) return false;
        const value = String(raw).toLowerCase();
        const target = filter.value.toLowerCase();
        switch (filter.operator) {
          case 'equals': return value === target;
          case 'notEquals': return value !== target;
          case 'gt': return parseFloat(String(raw)) > parseFloat(filter.value);
          case 'gte': return parseFloat(String(raw)) >= parseFloat(filter.value);
          case 'lt': return parseFloat(String(raw)) < parseFloat(filter.value);
          case 'lte': return parseFloat(String(raw)) <= parseFloat(filter.value);
          case 'contains':
          default: return value.includes(target);
        }
      }),
    );
  }, [tabFilteredTasks, filters]);

  const sortedTasks = useMemo(() => {
    if (!sortColumn) return filteredTasks;
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return [...filteredTasks].sort((a, b) => {
      const va = a.data[sortColumn];
      const vb = b.data[sortColumn];
      if (va === null || va === undefined) return 1 * multiplier;
      if (vb === null || vb === undefined) return -1 * multiplier;
      const sa = String(va);
      const sb = String(vb);
      return sa.localeCompare(sb) * multiplier;
    });
  }, [filteredTasks, sortColumn, sortDirection]);

  const pagination = useMemo(() => {
    return tasksData?.pagination ?? { page: 1, pageSize, total: 0, totalPages: 1 };
  }, [tasksData, pageSize]);

  const handleToggleSelect = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = sortedTasks.length > 0 && sortedTasks.every((t) => prev.has(t.id));
      return allSelected ? new Set() : new Set(sortedTasks.map((t) => t.id));
    });
  }, [sortedTasks]);

  const handleUploadComplete = useCallback(
    async (files: File[]) => {
      if (!projectId) return;
      for (const file of files) {
        try {
          const fileContent = await file.text();
          const fileType = file.name.split('.').pop()?.toLowerCase() ?? 'txt';
          await api.post(`/api/projects/${projectId}/upload`, {
            fileContent,
            fileType,
            fileName: file.name,
          });
        } catch (err) {
          console.error('Failed to upload file:', file.name, err);
        }
      }
      setUploadModalOpen(false);
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    [projectId, queryClient],
  );

  const handleSaveColumns = useCallback((updatedColumns: LocalDataColumn[]) => {
    const hidden = new Set<string>();
    updatedColumns.forEach((col) => {
      if (!col.visible) hidden.add(col.key);
    });
    setHiddenColumns(hidden);
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
    console.log('Delete task:', taskId);
  }, []);

  const handleExport = useCallback(async () => {
    const all = await api.get<BackendPaginatedTasks>(
      `/api/projects/${projectId}/tasks?page=1&pageSize=10000`
    );
    const tasks = all.tasks;
    if (tasks.length === 0) return;

    // Collect all data field keys across all tasks
    const dataKeys = Array.from(new Set(tasks.flatMap((t) => Object.keys(t.data))));

    const metaCols = [
      'task_id', 'status', 'created_at', 'updated_at',
      'assigned_to', 'annotation_label', 'annotation_reasoning',
      'annotation_comment', 'annotated_at', 'annotator_name', 'annotator_email',
    ];
    const headers = [...metaCols, ...dataKeys];

    const escape = (v: unknown) => {
      const s = v == null ? '' : Array.isArray(v) ? v.join(' | ') : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = tasks.map((t) => [
      escape(t.id),
      escape(t.status),
      escape(t.createdAt),
      escape(t.updatedAt),
      escape(t.assignedUser?.email ?? t.assignedTo ?? ''),
      escape(t.annotationLabel ?? ''),
      escape(t.annotationReasoning ?? ''),
      escape(t.annotationComment ?? ''),
      escape(t.annotatedAt ?? ''),
      escape(t.annotatorName ?? ''),
      escape(t.annotatorEmail ?? ''),
      ...dataKeys.map((k) => escape(t.data[k])),
    ]);

    const csv = [headers.map(escape), ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectId]);

  return (
    <div className="flex flex-col h-full">
      <DataToolbar
        projectId={projectId ?? ''}
        selectedCount={selectedIds.size}
        filtersCount={filters.length}
        sortColumnKey={sortColumn}
        sortDirection={sortDirection}
        sortableColumns={allColumns}
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenColumns={() => setColumnDrawerOpen(true)}
        onOpenFilters={() => setFiltersOpen((prev) => !prev)}
        onChangeOrderBy={(columnKey, direction) => {
          setSortColumn(columnKey);
          setSortDirection(direction);
          setCurrentPage(1);
        }}
        onBulkLabel={() => setBulkLabelOpen(true)}
        onAssignAnnotator={() => setAssignOpen(true)}
        onExport={handleExport}
      />

      {filtersOpen && (
        <DataFilters
          columns={allColumns}
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setCurrentPage(1);
          }}
        />
      )}

      <DynamicDataTable
        tasks={sortedTasks}
        columns={columns}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onDeleteTask={handleDeleteTask}
        projectId={projectId ?? ''}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
      />

      {/* Footer with pagination */}
      {pagination.total > 0 && (
        <div className="border-t border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} tasks
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sortedTasks.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="mb-4">
            <svg
              className="h-12 w-12 text-muted-foreground/50 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">No tasks yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a CSV, TSV, or JSON file to add tasks to this project
          </p>
          <Button onClick={() => setUploadModalOpen(true)}>Import Data</Button>
        </div>
      )}

      <FileUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      <ColumnConfigDrawer
        open={columnDrawerOpen}
        onClose={() => setColumnDrawerOpen(false)}
        columns={columns}
        onSave={handleSaveColumns}
      />

      <BulkLabelModal
        open={bulkLabelOpen}
        onClose={() => setBulkLabelOpen(false)}
        projectId={projectId ?? ''}
        selectedTaskIds={Array.from(selectedIds)}
        onSuccess={() => setSelectedIds(new Set())}
      />

      <AssignAnnotatorDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        projectId={projectId ?? ''}
        selectedTaskIds={Array.from(selectedIds)}
        onSuccess={() => setSelectedIds(new Set())}
      />
    </div>
  );
}

function FileUploadModal({
  open,
  onClose,
  onUploadComplete,
}: {
  open: boolean;
  onClose: () => void;
  onUploadComplete: (files: File[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => {
      const ext = file.name.toLowerCase().split('.').pop();
      return ['csv', 'tsv', 'json'].includes(ext ?? '');
    });
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter((file) => {
        const ext = file.name.toLowerCase().split('.').pop();
        return ['csv', 'tsv', 'json'].includes(ext ?? '');
      });
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;
    setUploading(true);
    await onUploadComplete(files);
    setFiles([]);
    setUploading(false);
  }, [files, onUploadComplete]);

  const handleClose = useCallback(() => {
    setFiles([]);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md p-6 z-10">
        <h2 className="text-lg font-semibold mb-4">Import Data</h2>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".csv,.tsv,.json"
            multiple
            className="hidden"
            id="file-upload"
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="text-muted-foreground">
              <p className="mb-2">Drag and drop files here, or click to browse</p>
              <p className="text-xs">Supports CSV, TSV, JSON</p>
            </div>
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Selected files ({files.length})</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-sm bg-muted rounded px-3 py-1.5">
                  <span className="truncate">{file.name}</span>
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="text-muted-foreground hover:text-foreground ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
            {uploading ? 'Uploading...' : `Import${files.length > 0 ? ` (${files.length} files)` : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
