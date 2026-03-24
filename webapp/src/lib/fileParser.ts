import type { Task, TaskData } from '@/types';

/**
 * Parse a CSV string into an array of objects
 */
export function parseCSV(content: string): TaskData[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const data: TaskData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: TaskData = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() ?? '';
    });
    data.push(row);
  }

  return data;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Parse a TSV string into an array of objects
 */
export function parseTSV(content: string): TaskData[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t').map(h => h.trim());

  const data: TaskData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    if (values.length === 0) continue;

    const row: TaskData = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? '';
    });
    data.push(row);
  }

  return data;
}

/**
 * Parse a JSON string into an array of objects
 */
export function parseJSON(content: string): TaskData[] {
  const parsed = JSON.parse(content);

  // Handle array of objects
  if (Array.isArray(parsed)) {
    return parsed.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return item as TaskData;
      }
      // Wrap primitives
      return { value: item } as TaskData;
    });
  }

  // Handle single object
  if (typeof parsed === 'object' && parsed !== null) {
    return [parsed as TaskData];
  }

  return [];
}

/**
 * Parse file content based on file extension
 */
export function parseFileContent(content: string, filename: string): TaskData[] {
  const ext = filename.toLowerCase().split('.').pop() ?? '';

  switch (ext) {
    case 'csv':
      return parseCSV(content);
    case 'tsv':
      return parseTSV(content);
    case 'json':
      return parseJSON(content);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Read a file and parse its contents
 */
export function readAndParseFile(file: File): Promise<TaskData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = parseFileContent(content, file.name);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsText(file);
  });
}

/**
 * Convert TaskData array to Task array
 */
export function createTasksFromData(projectId: string, dataArray: TaskData[]): Task[] {
  const now = new Date().toISOString();

  return dataArray.map((data, index) => ({
    id: `task-${projectId}-${Date.now()}-${index}`,
    projectId,
    data,
    completedCount: 0,
    cancelledCount: 0,
    predictionsCount: 0,
    isStarred: false,
    createdAt: now,
  }));
}

/**
 * Parse all files and return tasks
 */
export async function parseFilesToTasks(projectId: string, files: File[]): Promise<Task[]> {
  const allTasks: Task[] = [];

  for (const file of files) {
    const ext = file.name.toLowerCase().split('.').pop() ?? '';

    // Only process text-based data files
    if (['csv', 'tsv', 'json'].includes(ext)) {
      try {
        const data = await readAndParseFile(file);
        const tasks = createTasksFromData(projectId, data);
        allTasks.push(...tasks);
      } catch (error) {
        console.error(`Failed to parse file ${file.name}:`, error);
      }
    }
  }

  return allTasks;
}
