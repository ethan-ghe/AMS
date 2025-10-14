// src/components/agent-snapshot-table.jsx
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
import { MoreHorizontal, UserCircle, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
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
import { useConfig } from "../../contextproviders/ConfigContext";
import { DBContext } from "@/contextproviders/DashboardContext";

export function AgentSnapshotTable() {
  const { configData } = useConfig();
  const { rawData } = DBContext();
  const navigate = useNavigate();

  // ✅ Merge sales and calls data
  const generatedData = useMemo(() => {
    if (!rawData?.salesByAgent && !rawData?.callsByAgent) {
      return [];
    }

    // Create maps for quick lookup
    const salesMap = new Map(
      (rawData.salesByAgent || []).map(s => [s.agentId, s])
    );
    const callsMap = new Map(
      (rawData.callsByAgent || []).map(c => [c.agentId, c])
    );

    // Get all unique agent IDs
    const allAgentIds = new Set([
      ...salesMap.keys(),
      ...callsMap.keys()
    ]);

    return Array.from(allAgentIds).map(agentId => {
      const sales = salesMap.get(agentId);
      const calls = callsMap.get(agentId);

      // Find agent name from config
      const agentInfo = configData?.agentData?.find(a => a.agentid === agentId);
      const agentName = agentInfo ? `${agentInfo.fname} ${agentInfo.lname}` : agentId;

      const leadCost = calls?.totalCost || 0;
      const coreSales = sales?.saleCount || 0;
      const cpa = coreSales > 0 && leadCost > 0 ? leadCost / coreSales : 0;

      return {
        agentid: agentName,
        agentIdRaw: agentId,
        coreSales: coreSales,
        secondarySales: 0,
        callCount: calls?.callCount || 0,
        leadCost: leadCost,
        cpa: cpa
      };
    }).sort((a, b) => b.coreSales - a.coreSales); // Sort by sales descending
  }, [rawData, configData]);

  const [columnFilters, setColumnFilters] = useState([]);

  const columns = useMemo(() => [
    {
      accessorKey: "agentid",
      header: "Agent Name",
      size: 0.2467 * 100,
      maxSize: 0.2467 * 100,
      cell: ({ row }) => (
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span>{row.getValue("agentid")}</span>
        </div>
      ),
      enableSorting: true,
      filterFn: "includesString",
    },
    {
      accessorKey: "callCount",
      header: "Calls",
      size: 0.15 * 100,
      maxSize: 0.15 * 100,
      cell: ({ row }) => <span>{row.getValue("callCount")}</span>,
      enableSorting: true,
      sortingFn: "basic",
    },
    {
      accessorKey: "coreSales",
      header: "Core Sales",
      size: 0.21 * 100,
      maxSize: 0.21 * 100,
      cell: ({ row }) => <span>{row.getValue("coreSales")}</span>,
      enableSorting: true,
      sortingFn: "basic",
    },
    {
      accessorKey: "leadCost",
      header: "Lead Cost",
      size: 0.15 * 100,
      maxSize: 0.15 * 100,
      cell: ({ row }) => {
        const cost = row.getValue("leadCost");
        return <span>${cost ? (cost / 100).toFixed(2) : '0.00'}</span>;
      },
      enableSorting: true,
      sortingFn: "basic",
    },
    {
      accessorKey: "cpa",
      header: "CPA",
      size: 0.15 * 100,
      maxSize: 0.15 * 100,
      cell: ({ row }) => {
        const cpa = row.getValue("cpa");
        const coreSales = row.getValue("coreSales");
        
        if (coreSales === 0) return <span>-</span>;
        if (cpa === 0) return <span>$0.00</span>;
        
        return <span>${(cpa / 100).toFixed(2)}</span>;
      },
      enableSorting: true,
      sortingFn: "basic",
    },
    {
      id: "actions",
      size: 0.0833 * 100,
      maxSize: 0.0833 * 100,
      cell: ({ row }) => {
        const agent = row.original;
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
                onClick={() => navigate(`/agent-profile/${agent.agentIdRaw}`)}
                className="cursor-pointer"
              >
                <UserCircle className="mr-2 h-4 w-4" />
                View agent profile
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
              <CardTitle>Agent Snapshot</CardTitle>
              <CardDescription>Overview of agent sales performance</CardDescription>
            </div>
            <div className="flex items-center py-4">
              <Input
                placeholder="Search by agent name..."
                value={table.getColumn("agentid")?.getFilterValue() ?? ""}
                onChange={(event) =>
                  table.getColumn("agentid")?.setFilterValue(event.target.value)
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