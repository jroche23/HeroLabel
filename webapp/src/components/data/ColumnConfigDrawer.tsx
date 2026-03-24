import { useState, useEffect } from 'react';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { LocalDataColumn } from './DynamicDataTable';

interface ColumnConfigDrawerProps {
  open: boolean;
  onClose: () => void;
  columns: LocalDataColumn[];
  onSave: (columns: LocalDataColumn[]) => void;
}

export function ColumnConfigDrawer({
  open,
  onClose,
  columns,
  onSave,
}: ColumnConfigDrawerProps) {
  const [localColumns, setLocalColumns] = useState<LocalDataColumn[]>([]);

  useEffect(() => {
    // Sort columns by order when opening
    setLocalColumns([...columns].sort((a, b) => a.order - b.order));
  }, [columns, open]);

  const handleToggleVisible = (columnId: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setLocalColumns((prev) => {
      const newColumns = [...prev];
      [newColumns[index - 1], newColumns[index]] = [
        newColumns[index],
        newColumns[index - 1],
      ];
      return newColumns.map((col, idx) => ({ ...col, order: idx }));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === localColumns.length - 1) return;
    setLocalColumns((prev) => {
      const newColumns = [...prev];
      [newColumns[index], newColumns[index + 1]] = [
        newColumns[index + 1],
        newColumns[index],
      ];
      return newColumns.map((col, idx) => ({ ...col, order: idx }));
    });
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const getColumnTypeColor = (type: string) => {
    switch (type) {
      case 'text':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'number':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'boolean':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'date':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'json':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Configure Columns</SheetTitle>
          <SheetDescription>
            Show, hide, and reorder columns in the data table.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2 flex-1 overflow-y-auto pr-2">
          {localColumns.map((column, index) => (
            <div
              key={column.id}
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  <GripVertical className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === localColumns.length - 1}
                >
                  <GripVertical className="h-3 w-3" />
                </Button>
              </div>

              <Checkbox
                checked={column.visible}
                onCheckedChange={() => handleToggleVisible(column.id)}
                id={`column-${column.id}`}
              />

              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`column-${column.id}`}
                  className="text-sm font-medium cursor-pointer block truncate"
                >
                  {column.name}
                </label>
                <p className="text-xs text-muted-foreground truncate">
                  {column.key}
                </p>
              </div>

              <Badge
                variant="secondary"
                className={`text-xs ${getColumnTypeColor(column.type)}`}
              >
                {column.type}
              </Badge>

              {column.visible ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
