
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface TableColumn {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: any, record: any) => React.ReactNode;
}

interface DataTableProps {
  title: string;
  columns: TableColumn[];
  data: any[];
  onRowClick?: (record: any) => void;
}

const DataTable: React.FC<DataTableProps> = ({ 
  title, 
  columns, 
  data,
  onRowClick 
}) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };
  
  // Filter data based on search term
  const filteredData = data.filter(item => {
    return Object.values(item).some(value => 
      value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Sort data based on sort key and order
  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue > bValue ? 1 : -1;
        return sortOrder === 'asc' ? comparison : -comparison;
      })
    : filteredData;
  
  return (
    <div className="dashboard-card">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h3 className="font-medium text-lg">{title}</h3>
        <div className="relative w-full md:w-auto min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className={column.sortable ? 'cursor-pointer select-none' : ''}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && sortKey === column.key && (
                      sortOrder === 'asc' ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length > 0 ? (
              sortedData.map((record, index) => (
                <tr 
                  key={index}
                  onClick={() => onRowClick && onRowClick(record)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map((column) => (
                    <td key={`${index}-${column.key}`}>
                      {column.render 
                        ? column.render(record[column.key], record)
                        : record[column.key]}
                    </td>
                  ))}
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View details</DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-4 text-muted-foreground">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
