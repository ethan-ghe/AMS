import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useAuth } from "@/contextproviders/AuthContext";
import { useConfig } from "@/contextproviders/ConfigContext";
import { DBContext } from "@/contextproviders/DashboardContext"; 
import useApi from "../../hooks/useApi";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

export function VendorBreakdown() {
    const { loading } = useAuth();
    const { configData } = useConfig();
    const { vendorData } = DBContext();

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filterText, setFilterText] = useState('');



    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <ArrowUpDown className="ml-2 h-4 w-4" />;
        }
        return sortConfig.direction === 'asc' 
            ? <ArrowUp className="ml-2 h-4 w-4" />
            : <ArrowDown className="ml-2 h-4 w-4" />;
    };

const processedData = useMemo(() => {
    // Add safety check for vendorData
    if (!vendorData || !Array.isArray(vendorData) || vendorData.length === 0) {
        return [];
    }

    const totalsRow = vendorData.find(row => row.is_total === 1);
    let filteredVendor = vendorData.filter(row => row.is_total === 0);

    if (filterText) {
        filteredVendor = filteredVendor.filter(row =>
            row.friendlyname?.toLowerCase().includes(filterText.toLowerCase())
        );
    }

    if (sortConfig.key) {
        filteredVendor = [...filteredVendor].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];

            if (aVal === bVal) return 0;

            if (sortConfig.direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    return totalsRow ? [...filteredVendor, totalsRow] : filteredVendor;
}, [vendorData, sortConfig, filterText]);

    return (
        <TooltipProvider>
            <div>
                <Card className="gap-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Vendor Performance Report</CardTitle>
                            <CardDescription>Today's vendor performance breakdown</CardDescription>
                        </div>
                        <div className="flex items-center py-4">
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter by vendor name..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-0 m-0">
                        <div
                            style={{
                                width: "98%",
                                margin: "0 auto",
                                overflowX: "auto",
                            }}
                            className="rounded-md border"
                        >
                            <Table style={{ width: "100%", tableLayout: "auto" }}>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="sticky left-0 bg-background z-10" rowSpan={2}>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('friendlyname')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                Vendor
                                                {getSortIcon('friendlyname')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-center bg-muted/30" colSpan={5}>Calls</TableHead>
                                        <TableHead className="text-center bg-blue-50/50" colSpan={4}>Leads</TableHead>
                                        <TableHead className="text-center bg-green-50/50" colSpan={4}>Drops</TableHead>
                                        <TableHead className="text-center" rowSpan={2}>
                                            <Button variant="ghost" onClick={() => handleSort('total_sale_count')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Total Sales{getSortIcon('total_sale_count')}
                                            </Button>
                                        </TableHead>
                                    </TableRow>
                                    <TableRow>
                                        {/* Calls columns */}
                                        <TableHead className="text-right bg-muted/30">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('total_calls')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        Total{getSortIcon('total_calls')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Total Calls</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead className="text-right bg-muted/30">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('billable_calls')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        Billable{getSortIcon('billable_calls')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Billable Calls</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead className="text-right bg-muted/30">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('call_cost')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        Cost{getSortIcon('call_cost')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Call Cost</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead className="text-right bg-muted/30">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('call_sale_count')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        Sales{getSortIcon('call_sale_count')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Call Sales</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead className="text-right bg-muted/30">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('call_sale_cpa')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        CPA{getSortIcon('call_sale_cpa')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Call CPA</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        {/* Leads columns */}
                                        <TableHead className="text-right bg-blue-50/50">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('total_leads')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        Total{getSortIcon('total_leads')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Total Leads</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead className="text-right bg-blue-50/50">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('lead_cost')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        Cost{getSortIcon('lead_cost')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Lead Cost</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead className="text-right bg-blue-50/50">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('lead_sale_count')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        Sales{getSortIcon('lead_sale_count')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Lead Sales</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead className="text-right bg-blue-50/50">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('lead_sale_cpa')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        CPA{getSortIcon('lead_sale_cpa')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Lead CPA</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        {/* Drops columns */}
                                        <TableHead className="text-right bg-green-50/50">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('total_drops')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        Total{getSortIcon('total_drops')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Total Drops</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead className="text-right bg-green-50/50">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('drop_cost')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        Cost{getSortIcon('drop_cost')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Drop Cost</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead className="text-right bg-green-50/50">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('drop_sale_count')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        Sales{getSortIcon('drop_sale_count')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Drop Sales</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead className="text-right bg-green-50/50">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" onClick={() => handleSort('drop_sale_cpa')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                        CPA{getSortIcon('drop_sale_cpa')}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Drop CPA</TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedData.length > 0 ? (
                                        processedData.map((row, index) => (
                                            <TableRow 
                                                key={index}
                                                className={row.is_total === 1 ? "font-bold bg-muted/50" : ""}
                                            >
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="sticky left-0 bg-background">{row.friendlyname}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{row.friendlyname}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-muted/10">{row.total_calls}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{row.total_calls}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-muted/10">{row.billable_calls}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{row.billable_calls}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-muted/10">{formatCurrency(row.call_cost)}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{formatCurrency(row.call_cost)}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-muted/10">{row.call_sale_count}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{row.call_sale_count}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-muted/10">{formatCurrency(row.call_sale_cpa)}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{formatCurrency(row.call_sale_cpa)}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-blue-50/30">{row.total_leads}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{row.total_leads}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-blue-50/30">{formatCurrency(row.lead_cost)}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{formatCurrency(row.lead_cost)}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-blue-50/30">{row.lead_sale_count}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{row.lead_sale_count}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-blue-50/30">{formatCurrency(row.lead_sale_cpa)}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{formatCurrency(row.lead_sale_cpa)}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-green-50/30">{row.total_drops}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{row.total_drops}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-green-50/30">{formatCurrency(row.drop_cost)}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{formatCurrency(row.drop_cost)}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-green-50/30">{row.drop_sale_count}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{row.drop_sale_count}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right bg-green-50/30">{formatCurrency(row.drop_sale_cpa)}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{formatCurrency(row.drop_sale_cpa)}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <TableCell className="text-right font-semibold">{row.total_sale_count}</TableCell>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{row.total_sale_count}</TooltipContent>
                                                </Tooltip>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={15} className="text-center text-muted-foreground">
                                                {filterText ? `No vendors found matching "${filterText}"` : 'No data available'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}