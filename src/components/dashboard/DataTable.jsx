
import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ChevronDown, ChevronUp, SortAsc, SortDesc } from 'lucide-react';
import { cn } from '@/lib/utils';

const DataTable = ({ 
  title, 
  columns, 
  data, 
  onRowClick,
  className
}) => {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const sortedData = React.useMemo(() => {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
      if (a[sortField] < b[sortField]) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (a[sortField] > b[sortField]) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortField, sortDirection]);
  
  return (
    <div className={cn("chart-container", className)}>
      {title && <h3 className="font-medium text-lg mb-4">{title}</h3>}
      
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={column.sortable ? 'cursor-pointer' : ''}
                  onClick={column.sortable ? () => handleSort(column.key) : undefined}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.sortable && sortField === column.key && (
                      sortDirection === 'asc' 
                        ? <ChevronUp className="h-4 w-4" /> 
                        : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-6 text-muted-foreground">
                  No data to display
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row, rowIndex) => (
                <TableRow 
                  key={rowIndex}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/60' : ''}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((column) => (
                    <TableCell key={`${rowIndex}-${column.key}`}>
                      {column.render 
                        ? column.render(row[column.key], row) 
                        : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DataTable;
