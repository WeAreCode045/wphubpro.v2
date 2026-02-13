import React from 'react';

// In React 19 ontvangen we 'ref' direct als prop, forwardRef is niet meer nodig.
const Table = ({ className, ref, ...props }: React.HTMLAttributes<HTMLTableElement> & { ref?: React.Ref<HTMLTableElement> }) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} className={`w-full caption-bottom text-sm ${className}`} {...props} />
  </div>
);

const TableHeader = ({ className, ref, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { ref?: React.Ref<HTMLTableSectionElement> }) => (
  <thead ref={ref} className={`[&_tr]:border-b ${className}`} {...props} />
);

const TableBody = ({ className, ref, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { ref?: React.Ref<HTMLTableSectionElement> }) => (
  <tbody ref={ref} className={`[&_tr:last-child]:border-0 ${className}`} {...props} />
);

const TableRow = ({ className, ref, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { ref?: React.Ref<HTMLTableRowElement> }) => (
  <tr
    ref={ref}
    className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${className}`}
    {...props}
  />
);

const TableHead = ({ className, ref, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { ref?: React.Ref<HTMLTableCellElement> }) => (
  <th
    ref={ref}
    className={`h-12 px-6 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`}
    {...props}
  />
);

const TableCell = ({ className, ref, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { ref?: React.Ref<HTMLTableCellElement> }) => (
  <td
    ref={ref}
    className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}
    {...props}
  />
);

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
};
