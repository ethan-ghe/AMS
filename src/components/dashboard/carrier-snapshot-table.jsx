import React, { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Building2, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { DBContext } from "@/contextproviders/DashboardContext";

export function CarrierSnapshotTable() {
  const { rawData } = DBContext();
  const navigate = useNavigate();

const generatedData = useMemo(() => {
  if (!rawData?.salesByCarrier) {
    return [];
  }

  const carriers = rawData.salesByCarrier.map(carrier => ({
    carrier: carrier.carrier,
    topContract: carrier.topContract || null,
    saleCount: carrier.saleCount || 0
  }));


  const totalSales = carriers.reduce((sum, carrier) => sum + carrier.saleCount, 0);

  return carriers
    .map(carrier => ({
      ...carrier,
      percentOfTotal: totalSales > 0 ? (carrier.saleCount / totalSales) * 100 : 0
    }))
    .sort((a, b) => b.saleCount - a.saleCount);
}, [rawData]);

  const [columnFilters, setColumnFilters] = useState([]);

const columns = useMemo(() => [
  {
    accessorKey: "carrier",
    header: "Carrier Name",
    size: 40,
    maxSize: 40,
    cell: ({ row }) => (
      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <span>{row.getValue("carrier")}</span>
      </div>
    ),
    enableSorting: true,
    filterFn: "includesString",
  },
  {
    accessorKey: "topContract",
    header: "Top Contract",
    size: 23,
    maxSize: 23,
    cell: ({ row }) => (
      <div className="text-center" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <span>{row.getValue("topContract") || "-"}</span>
      </div>
    ),
    enableSorting: true,
    sortingFn: "basic",
  },
  {
    accessorKey: "saleCount",
    header: "Sales",
    size: 15,
    maxSize: 15,
    cell: ({ row }) => (
      <div className="text-right">
        <span>{row.getValue("saleCount")}</span>
      </div>
    ),
    enableSorting: true,
    sortingFn: "basic",
  },
  {
    accessorKey: "percentOfTotal",
    header: "% of Total",
    size: 12,
    maxSize: 12,
    cell: ({ row }) => (
      <div className="text-right">
        <span>{row.getValue("percentOfTotal").toFixed(1)}%</span>
      </div>
    ),
    enableSorting: true,
    sortingFn: "basic",
  },
  {
    id: "actions",
    size: 10,
    maxSize: 10,
    cell: ({ row }) => {
      const carrier = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigate(`/carrier-profile/${encodeURIComponent(carrier.carrier)}`)}
              className="cursor-pointer"
            >
              <Building2 className="mr-2 h-4 w-4" />
              View carrier profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
  },
], [navigate]);

  const data = generatedData || [];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    state: {
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  return (
    <TooltipProvider>
      <div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Carrier Snapshot</CardTitle>
              <CardDescription>Overview of sales performance by carrier</CardDescription>
            </div>
            <div className="flex items-center py-4">
              <Input
                placeholder="Search by carrier name..."
                value={table.getColumn("carrier")?.getFilterValue() ?? ""}
                onChange={(event) =>
                  table.getColumn("carrier")?.setFilterValue(event.target.value)
                }
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="px-0 m-0">
            <div
              style={{
                width: "95%",
                margin: "0 auto",
                overflowX: "auto",
              }}
              className="rounded-md border"
            >
              <Table style={{ width: "100%", tableLayout: "fixed" }}>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        header.id !== "actions" ? (
                          <Tooltip key={header.id}>
                            <TooltipTrigger asChild>
                              <TableHead
                                style={{
                                  width: `${header.column.columnDef.size}%`,
                                  maxWidth: `${header.column.columnDef.maxSize}%`,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <div
                                  className={`flex items-center ${
                                    header.column.getCanSort() ? "cursor-pointer select-none" : ""
                                  }`}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  {header.column.getCanSort() && (
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                  )}
                                  {{
                                    asc: " 🔼",
                                    desc: " 🔽",
                                  }[header.column.getIsSorted()] ?? null}
                                </div>
                              </TableHead>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="center">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <TableHead
                            key={header.id}
                            style={{
                              width: `${header.column.columnDef.size}%`,
                              maxWidth: `${header.column.columnDef.maxSize}%`,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <div className="flex items-center">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </div>
                          </TableHead>
                        )
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          cell.column.id !== "actions" ? (
                            <Tooltip key={cell.id}>
                              <TooltipTrigger asChild>
                                <TableCell
                                  style={{
                                    width: `${cell.column.columnDef.size}%`,
                                    maxWidth: `${cell.column.columnDef.maxSize}%`,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center">
                                <span>{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <TableCell
                              key={cell.id}
                              style={{
                                width: `${cell.column.columnDef.size}%`,
                                maxWidth: `${cell.column.columnDef.maxSize}%`,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          )
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-4 px-2 lg:px-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select
                  value={table.getState().pagination.pageSize.toString()}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 30].map((pageSize) => (
                      <SelectItem key={pageSize} value={pageSize.toString()}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}