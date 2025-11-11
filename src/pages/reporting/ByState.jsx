import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useAuth } from "@/contextproviders/AuthContext";
import { useConfig } from "@/contextproviders/ConfigContext";
import useApi from "../../hooks/useApi";
import { AppSidebar } from "@/components/app-sidebar"
import { SplashScreen } from "../../components/splashscreen"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbPage,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ChevronDownIcon, FileText, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Search, Download } from "lucide-react"


const PRESETS = [
    { name: 'today', label: 'Today' },
    { name: 'yesterday', label: 'Yesterday' },
    { name: 'last7', label: 'Last 7 days' },
    { name: 'last14', label: 'Last 14 days' },
    { name: 'last30', label: 'Last 30 days' },
    { name: 'thisWeek', label: 'This Week' },
    { name: 'lastWeek', label: 'Last Week' },
    { name: 'thisMonth', label: 'This Month' },
    { name: 'lastMonth', label: 'Last Month' },
    { name: 'lifetime', label: 'Lifetime' },
    { name: 'custom', label: 'Custom' }
]

// Helper function to calculate date ranges
const getPresetRange = (presetName) => {
    const preset = PRESETS.find(({ name }) => name === presetName)
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`)

    const from = new Date()
    const to = new Date()
    const first = from.getDate() - from.getDay()

    switch (preset.name) {
        case 'today':
            from.setHours(0, 0, 0, 0)
            to.setHours(23, 59, 59, 999)
            break

        case 'yesterday':
            from.setDate(from.getDate() - 1)
            from.setHours(0, 0, 0, 0)
            to.setDate(to.getDate() - 1)
            to.setHours(23, 59, 59, 999)
            break

        case 'last7':
            from.setDate(from.getDate() - 6)
            from.setHours(0, 0, 0, 0)
            to.setHours(23, 59, 59, 999)
            break

        case 'last14':
            from.setDate(from.getDate() - 13)
            from.setHours(0, 0, 0, 0)
            to.setHours(23, 59, 59, 999)
            break

        case 'last30':
            from.setDate(from.getDate() - 29)
            from.setHours(0, 0, 0, 0)
            to.setHours(23, 59, 59, 999)
            break

        case 'thisWeek':
            from.setDate(first)
            from.setHours(0, 0, 0, 0)
            to.setHours(23, 59, 59, 999)
            break

        case 'lastWeek':
            from.setDate(from.getDate() - 7 - from.getDay())
            to.setDate(to.getDate() - to.getDay() - 1)
            from.setHours(0, 0, 0, 0)
            to.setHours(23, 59, 59, 999)
            break

        case 'thisMonth':
            from.setDate(1)
            from.setHours(0, 0, 0, 0)
            to.setHours(23, 59, 59, 999)
            break

        case 'lastMonth':
            from.setMonth(from.getMonth() - 1)
            from.setDate(1)
            from.setHours(0, 0, 0, 0)
            to.setDate(0)
            to.setHours(23, 59, 59, 999)
            break

        case 'lifetime':
            from.setFullYear(2020, 0, 1)
            from.setHours(0, 0, 0, 0)
            to.setHours(23, 59, 59, 999)
            break
    }

    return { from, to }
}

// Helper function to format currency
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value)
}

// Helper function to format duration (seconds to minutes:seconds)
const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

function StateBreakdown() {
    const { loading } = useAuth();
    const { configData } = useConfig();
    const reqApi = useApi()
    const [isGenerating, setIsGenerating] = useState(false);
    const dedupeRequest = useRef(false)
    const [selectedState, setSelectedState] = useState('All');
    const [preset, setPreset] = useState(null);
    const [startDate, setStartDate] = useState(undefined);
    const [endDate, setEndDate] = useState(undefined);
    const [startOpen, setStartOpen] = useState(false);
    const [endOpen, setEndOpen] = useState(false);
    const [reportData, setReportData] = useState(null)
    
    // Sorting and filtering state
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filterText, setFilterText] = useState('');

    // Update dates when preset changes
    useEffect(() => {
        if (preset && preset !== 'custom') {
            const dateRange = getPresetRange(preset);
            if (dateRange) {
                setStartDate(dateRange.from);
                setEndDate(dateRange.to);
            }
        } else if (preset === 'custom') {
            // Reset dates for custom selection
            setStartDate(undefined);
            setEndDate(undefined);
        }
    }, [preset]);

    const generateReport = useCallback(async () => {
        if (dedupeRequest.current === true) return;
        dedupeRequest.current = true;
        setIsGenerating(true);
        const result = await reqApi.execute('/report/generate/state', 'POST', {
            selectedState,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString()
        });
        setIsGenerating(false);
        dedupeRequest.current = false;
        if (result?.success !== false) {
            setReportData(result?.data);
            toast.success('Report Generated');
        }
    }, [selectedState, startDate, endDate, reqApi]);

    const resetReport = () => {
        setReportData(null);
        setSelectedState('All');
        setPreset(null);
        setStartDate(undefined);
        setEndDate(undefined);
        setSortConfig({ key: null, direction: 'asc' });
        setFilterText('');
    };

    // Handle sorting
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Get sort icon for column
    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <ArrowUpDown className="ml-2 h-4 w-4" />;
        }
        return sortConfig.direction === 'asc' 
            ? <ArrowUp className="ml-2 h-4 w-4" />
            : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    // Filtered and sorted data
    const processedData = useMemo(() => {
        if (!reportData) return [];

        // Separate totals row from state data
        const totalsRow = reportData.find(row => row.is_total === 1);
        let stateData = reportData.filter(row => row.is_total === 0);

        // Apply filter
        if (filterText) {
            stateData = stateData.filter(row =>
                row.state_name.toLowerCase().includes(filterText.toLowerCase())
            );
        }

        // Apply sorting
        if (sortConfig.key) {
            stateData.sort((a, b) => {
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

        // Add totals row back at the end if it exists
        return totalsRow ? [...stateData, totalsRow] : stateData;
    }, [reportData, sortConfig, filterText]);

    const exportToCSV = useCallback(() => {
        if (!processedData || processedData.length === 0) return;

        // Separate totals row from state data
        const totalsRow = processedData.find(row => row.is_total === 1);
        const stateData = processedData.filter(row => row.is_total === 0);

        // CSV Headers
        const headers = [
            'State Name',
            'Live Calls',
            'Completed',
            'Billable',
            'Avg Duration',
            'Billable %',
            'Call Cost',
            'Sales',
            'CPA',
            'Conversion %'
        ];

        const rows = [headers];

        // Add state data
        stateData.forEach(state => {
            rows.push([
                state.state_name,
                state.live_calls,
                state.completed_calls,
                state.billable_calls,
                formatDuration(state.average_billable_duration),
                state.billable_percentage,
                state.call_cost,
                state.call_sale_count,
                state.call_sale_cpa,
                state.call_conversion_rate_percentage
            ]);
        });

        // Add totals row
        if (totalsRow) {
            rows.push([]); // Empty row separator
            rows.push([
                totalsRow.state_name,
                totalsRow.live_calls,
                totalsRow.completed_calls,
                totalsRow.billable_calls,
                formatDuration(totalsRow.average_billable_duration),
                totalsRow.billable_percentage,
                totalsRow.call_cost,
                totalsRow.call_sale_count,
                totalsRow.call_sale_cpa,
                totalsRow.call_conversion_rate_percentage
            ]);
        }

        // Convert to CSV string
        const csvContent = rows.map(row =>
            row.map(cell => {
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `state_performance_${startDate?.toISOString().split('T')[0]}_to_${endDate?.toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Report exported to CSV');
    }, [processedData, startDate, endDate]);

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                {loading === true && (
                    <SplashScreen />
                )}
                <header className="flex h-16 shrink-0 items-center justify-between transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    Reporting
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbPage className="hidden md:block">
                                    By State
                                </BreadcrumbPage>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                {reportData ? (
                    <div className="flex flex-1 flex-col gap-4 p-6">
                        {/* Header with back button and filter */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold">State Inbound Performance Report</h2>
                                <p className="text-sm text-muted-foreground">
                                    {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filter by state name..."
                                        value={filterText}
                                        onChange={(e) => setFilterText(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                                <Button variant="outline" size="icon" onClick={exportToCSV}>
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" onClick={resetReport}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    New Report
                                </Button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('state_name')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                State Name
                                                {getSortIcon('state_name')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('live_calls')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                Live Calls
                                                {getSortIcon('live_calls')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('completed_calls')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                Completed
                                                {getSortIcon('completed_calls')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('billable_calls')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                Billable
                                                {getSortIcon('billable_calls')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('average_billable_duration')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                Avg Duration
                                                {getSortIcon('average_billable_duration')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('billable_percentage')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                Billable %
                                                {getSortIcon('billable_percentage')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('call_cost')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                Call Cost
                                                {getSortIcon('call_cost')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('call_sale_count')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                Sales
                                                {getSortIcon('call_sale_count')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('call_sale_cpa')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                CPA
                                                {getSortIcon('call_sale_cpa')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('call_conversion_rate_percentage')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                Conversion %
                                                {getSortIcon('call_conversion_rate_percentage')}
                                            </Button>
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
                                                <TableCell>{row.state_name}</TableCell>
                                                <TableCell className="text-right">{row.live_calls}</TableCell>
                                                <TableCell className="text-right">{row.completed_calls}</TableCell>
                                                <TableCell className="text-right">{row.billable_calls}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatDuration(row.average_billable_duration)}
                                                </TableCell>
                                                <TableCell className="text-right">{row.billable_percentage}%</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(row.call_cost)}
                                                </TableCell>
                                                <TableCell className="text-right">{row.call_sale_count}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(row.call_sale_cpa)}
                                                </TableCell>
                                                <TableCell className="text-right">{row.call_conversion_rate_percentage}%</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center text-muted-foreground">
                                                No states found matching "{filterText}"
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    /* Centered Content */
                    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6">
                        <div className="w-full max-w-2xl space-y-8">
                            {/* Header */}
                            <div className="text-center space-y-2">
                                <h1 className="text-3xl font-bold tracking-tight">State Performance Report</h1>
                                <p className="text-muted-foreground">Select a state and time period to generate your report</p>
                            </div>

                            {/* State Selector */}
                            <div className="flex flex-col items-center gap-3">
                                <Label htmlFor="state" className="text-base font-medium">
                                    State
                                </Label>
                                <Select value={selectedState} onValueChange={(value) => setSelectedState(value)}>
                                    <SelectTrigger id="state" className="w-full max-w-xs">
                                        <SelectValue placeholder="Select target state" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem key='All' value='All'>
                                            All
                                        </SelectItem>
                                       {configData?.zipData
                                            ?.filter(s => s.state_name !== null)
                                            ?.sort((a, b) => a.state_name.localeCompare(b.state_name))
                                            .map((zip) => (
                                                <SelectItem key={zip.state_name} value={zip.state_name}>
                                                {zip.state_name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Preset Selector */}
                            <div className="flex flex-col items-center gap-3">
                                <Label htmlFor="preset" className="text-base font-medium">
                                    Time Period
                                </Label>
                                <Select value={preset} onValueChange={(value) => setPreset(value)}>
                                    <SelectTrigger id="preset" className="w-full max-w-xs">
                                        <SelectValue placeholder="Select time period..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRESETS.map((preset) => (
                                            <SelectItem key={preset.name} value={preset.name}>
                                                {preset.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {preset && preset !== 'custom' && startDate && endDate && (
                                    <div className="text-center text-sm text-muted-foreground">
                                        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                                    </div>
                                )}
                            </div>

                            {/* Custom Date Pickers */}
                            {preset === 'custom' && (
                                <div className="flex flex-col items-center gap-6 pt-4">
                                    <div className="flex flex-col sm:flex-row gap-6 w-full justify-center">
                                        {/* Start Date Picker */}
                                        <div className="flex flex-col gap-3 items-center">
                                            <Label htmlFor="start-date" className="text-sm font-medium">
                                                Start Date
                                            </Label>
                                            <Popover open={startOpen} onOpenChange={setStartOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        id="start-date"
                                                        className="w-48 justify-between font-normal"
                                                    >
                                                        {startDate ? startDate.toLocaleDateString() : "Select start date"}
                                                        <ChevronDownIcon className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto overflow-hidden p-0" align="center">
                                                    <Calendar
                                                        mode="single"
                                                        selected={startDate}
                                                        captionLayout="dropdown"
                                                        onSelect={(date) => {
                                                            setStartDate(date);
                                                            setStartOpen(false);
                                                        }}
                                                        disabled={(date) => date > new Date()}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* End Date Picker */}
                                        <div className="flex flex-col gap-3 items-center">
                                            <Label htmlFor="end-date" className="text-sm font-medium">
                                                End Date
                                            </Label>
                                            <Popover open={endOpen} onOpenChange={setEndOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        id="end-date"
                                                        className="w-48 justify-between font-normal"
                                                    >
                                                        {endDate ? endDate.toLocaleDateString() : "Select end date"}
                                                        <ChevronDownIcon className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto overflow-hidden p-0" align="center">
                                                    <Calendar
                                                        mode="single"
                                                        selected={endDate}
                                                        captionLayout="dropdown"
                                                        onSelect={(date) => {
                                                            setEndDate(date);
                                                            setEndOpen(false);
                                                        }}
                                                        disabled={(date) =>
                                                            date > new Date() || (startDate && date < startDate)
                                                        }
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* Run Report Button */}
                            <div className="flex justify-center pt-4">
                                <Button
                                    size="lg"
                                    onClick={generateReport}
                                    disabled={!preset || !selectedState || isGenerating || (preset === 'custom' && (!startDate || !endDate))}
                                    className="gap-2"
                                >
                                    <FileText className="h-5 w-5" />
                                    {isGenerating ? 'Generating...' : 'Run Report'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </SidebarInset>
        </SidebarProvider>
    );
}

export default StateBreakdown;