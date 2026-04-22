import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LocalDataColumn } from '@/components/data/DynamicDataTable';

export type FilterOperator = 'contains' | 'equals' | 'notEquals' | 'gt' | 'gte' | 'lt' | 'lte';

export interface ColumnFilter {
  id: string;
  columnKey: string;
  operator: FilterOperator;
  value: string;
}

interface DataFiltersProps {
  columns: LocalDataColumn[];
  filters: ColumnFilter[];
  onChange: (filters: ColumnFilter[]) => void;
}

// Keep in sync with DataManager meta columns
const META_COLUMN_KEYS: string[] = [
  'inner_id',
  'task_state',
  'annotation_completed_at',
  'annotations',
  'cancelled',
  'predictions',
  'ground_truth',
  'annotators',
  'annotation_results',
  'annotation_ids',
  'agreement',
  'agreement_selected',
  'reviewers',
  'reviewed',
  'reviews_accepted',
  'reviews_rejected',
  'comment_texts',
  'comments',
  'unresolved_comments',
  'comment_authors',
  'commented_at',
  'review_time',
  'allow_skip',
  'prediction_score',
  'prediction_model_versions',
  'prediction_results',
  'upload_filename',
  'storage_filename',
  'created_at',
  'updated_at',
  'updated_by',
  'lead_time',
  'drafts',
];

const metaKeySet = new Set(META_COLUMN_KEYS);

export function DataFilters({ columns, filters, onChange }: DataFiltersProps) {
  const dataColumns = columns.filter((col) => !metaKeySet.has(col.key));
  const metaColumns = columns.filter((col) => metaKeySet.has(col.key));
  const orderedColumns = [...dataColumns, ...metaColumns];

  const ensureAtLeastOneFilter = () => {
    if (filters.length > 0 || orderedColumns.length === 0) return;
    const first = orderedColumns[0];
    onChange([
      {
        id: crypto.randomUUID ? crypto.randomUUID() : `filter-${Date.now()}`,
        columnKey: first.key,
        operator: 'contains',
        value: '',
      },
    ]);
  };

  // Initialize first filter row when opened
  ensureAtLeastOneFilter();

  const handleAddFilter = () => {
    if (orderedColumns.length === 0) return;
    const first = orderedColumns[0];
    onChange([
      ...filters,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : `filter-${Date.now()}-${filters.length}`,
        columnKey: first.key,
        operator: 'contains',
        value: '',
      },
    ]);
  };

  const handleUpdateFilter = (id: string, patch: Partial<ColumnFilter>) => {
    onChange(
      filters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  };

  const handleRemoveFilter = (id: string) => {
    const next = filters.filter((f) => f.id !== id);
    onChange(next);
  };

  const prettyColumnLabel = (column: LocalDataColumn) => {
    const isData = !metaKeySet.has(column.key);
    return `${column.name}${isData ? ' (data)' : ''}`;
  };

  return (
    <div className="border-b border-border bg-muted/40 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Filters
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2"
          onClick={handleAddFilter}
          disabled={orderedColumns.length === 0}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Filter
        </Button>
      </div>

      {filters.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No filters applied. Add a filter to narrow down tasks.
        </p>
      ) : (
        <div className="space-y-2">
          {filters.map((filter, index) => (
            <div
              key={filter.id}
              className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 bg-background border border-border rounded-md px-2 py-2"
            >
              <div className="text-[11px] text-muted-foreground w-12 shrink-0">
                {index === 0 ? 'Where' : 'And'}
              </div>

              <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                <Select
                  value={filter.columnKey}
                  onValueChange={(value) =>
                    handleUpdateFilter(filter.id, { columnKey: value })
                  }
                >
                  <SelectTrigger className="h-8 w-full md:w-48 text-xs">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {orderedColumns.map((col) => (
                      <SelectItem key={col.id} value={col.key} className="text-xs">
                        {prettyColumnLabel(col)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filter.operator}
                  onValueChange={(value) =>
                    handleUpdateFilter(filter.id, {
                      operator: value as FilterOperator,
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-full md:w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains" className="text-xs">contains</SelectItem>
                    <SelectItem value="equals" className="text-xs">=</SelectItem>
                    <SelectItem value="notEquals" className="text-xs">≠</SelectItem>
                    <SelectItem value="gt" className="text-xs">&gt;</SelectItem>
                    <SelectItem value="gte" className="text-xs">≥</SelectItem>
                    <SelectItem value="lt" className="text-xs">&lt;</SelectItem>
                    <SelectItem value="lte" className="text-xs">≤</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  className="h-8 text-xs"
                  placeholder="Value"
                  value={filter.value}
                  onChange={(e) =>
                    handleUpdateFilter(filter.id, { value: e.target.value })
                  }
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemoveFilter(filter.id)}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

