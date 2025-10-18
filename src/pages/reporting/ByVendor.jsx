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
import { ChevronDownIcon, FileText, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react"


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

function VendorBreakdown() {
    const { loading } = useAuth();
    const { configData } = useConfig();
    const reqApi = useApi()
    const [isGenerating, setIsGenerating] = useState(false);
    const dedupeRequest = useRef(false)
    const [selectedVendor, setSelectedVendor] = useState('All');
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
        const result = await reqApi.execute('/report/generate/vendor', 'POST', {
            selectedVendor,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString()
        });
        setIsGenerating(false);
        dedupeRequest.current = false;
        if (result?.success !== false) {
            setReportData(result?.data);
            toast.success('Report Generated');
        }
    }, [selectedVendor, startDate, endDate, reqApi]);

    const resetReport = () => {
        setReportData(null);
        setSelectedVendor('All');
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

        // Separate totals row from vendor data
        const totalsRow = reportData.find(row => row.is_total === 1);
        let vendorData = reportData.filter(row => row.is_total === 0);

        // Apply filter
        if (filterText) {
            vendorData = vendorData.filter(row =>
                row.friendlyname.toLowerCase().includes(filterText.toLowerCase())
            );
        }

        // Apply sorting
        if (sortConfig.key) {
            vendorData.sort((a, b) => {
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
        return totalsRow ? [...vendorData, totalsRow] : vendorData;
    }, [reportData, sortConfig, filterText]);

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
                                    By Vendor
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
                                <h2 className="text-2xl font-bold">Vendor Performance Report</h2>
                                <p className="text-sm text-muted-foreground">
                                    {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filter by vendor name..."
                                        value={filterText}
                                        onChange={(e) => setFilterText(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                                <Button variant="outline" onClick={resetReport}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    New Report
                                </Button>
                            </div>
                        </div>

                        {/* Table with horizontal scroll */}
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="sticky left-0 bg-background z-10">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('friendlyname')}
                                                className="h-auto p-0 font-semibold hover:bg-transparent"
                                            >
                                                Vendor
                                                {getSortIcon('friendlyname')}
                                            </Button>
                                        </TableHead>
                                        {/* Calls Section */}
                                        <TableHead className="text-right bg-muted/30" colSpan={5}>Calls</TableHead>
                                        {/* Leads Section */}
                                        <TableHead className="text-right bg-blue-50/50" colSpan={4}>Leads</TableHead>
                                        {/* Drops Section */}
                                        <TableHead className="text-right bg-green-50/50" colSpan={4}>Drops</TableHead>
                                        {/* Total Sales */}
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                    <TableRow>
                                        <TableHead className="sticky left-0 bg-background z-10"></TableHead>
                                        {/* Calls columns */}
                                        <TableHead className="text-right bg-muted/30">
                                            <Button variant="ghost" onClick={() => handleSort('total_calls')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Total{getSortIcon('total_calls')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right bg-muted/30">
                                            <Button variant="ghost" onClick={() => handleSort('billable_calls')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Billable{getSortIcon('billable_calls')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right bg-muted/30">
                                            <Button variant="ghost" onClick={() => handleSort('call_cost')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Cost{getSortIcon('call_cost')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right bg-muted/30">
                                            <Button variant="ghost" onClick={() => handleSort('call_sale_count')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Sales{getSortIcon('call_sale_count')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right bg-muted/30">
                                            <Button variant="ghost" onClick={() => handleSort('call_sale_cpa')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                CPA{getSortIcon('call_sale_cpa')}
                                            </Button>
                                        </TableHead>
                                        {/* Leads columns */}
                                        <TableHead className="text-right bg-blue-50/50">
                                            <Button variant="ghost" onClick={() => handleSort('total_leads')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Total{getSortIcon('total_leads')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right bg-blue-50/50">
                                            <Button variant="ghost" onClick={() => handleSort('lead_cost')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Cost{getSortIcon('lead_cost')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right bg-blue-50/50">
                                            <Button variant="ghost" onClick={() => handleSort('lead_sale_count')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Sales{getSortIcon('lead_sale_count')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right bg-blue-50/50">
                                            <Button variant="ghost" onClick={() => handleSort('lead_sale_cpa')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                CPA{getSortIcon('lead_sale_cpa')}
                                            </Button>
                                        </TableHead>
                                        {/* Drops columns */}
                                        <TableHead className="text-right bg-green-50/50">
                                            <Button variant="ghost" onClick={() => handleSort('total_drops')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Total{getSortIcon('total_drops')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right bg-green-50/50">
                                            <Button variant="ghost" onClick={() => handleSort('drop_cost')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Cost{getSortIcon('drop_cost')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right bg-green-50/50">
                                            <Button variant="ghost" onClick={() => handleSort('drop_sale_count')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Sales{getSortIcon('drop_sale_count')}
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-right bg-green-50/50">
                                            <Button variant="ghost" onClick={() => handleSort('drop_sale_cpa')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                CPA{getSortIcon('drop_sale_cpa')}
                                            </Button>
                                        </TableHead>
                                        {/* Total Sales */}
                                        <TableHead className="text-right">
                                            <Button variant="ghost" onClick={() => handleSort('total_sale_count')} className="h-auto p-0 font-semibold hover:bg-transparent">
                                                Sales{getSortIcon('total_sale_count')}
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
                                                <TableCell className="sticky left-0 bg-background">{row.friendlyname}</TableCell>
                                                {/* Calls */}
                                                <TableCell className="text-right bg-muted/10">{row.total_calls}</TableCell>
                                                <TableCell className="text-right bg-muted/10">{row.billable_calls}</TableCell>
                                                <TableCell className="text-right bg-muted/10">{formatCurrency(row.call_cost)}</TableCell>
                                                <TableCell className="text-right bg-muted/10">{row.call_sale_count}</TableCell>
                                                <TableCell className="text-right bg-muted/10">{formatCurrency(row.call_sale_cpa)}</TableCell>
                                                {/* Leads */}
                                                <TableCell className="text-right bg-blue-50/30">{row.total_leads}</TableCell>
                                                <TableCell className="text-right bg-blue-50/30">{formatCurrency(row.lead_cost)}</TableCell>
                                                <TableCell className="text-right bg-blue-50/30">{row.lead_sale_count}</TableCell>
                                                <TableCell className="text-right bg-blue-50/30">{formatCurrency(row.lead_sale_cpa)}</TableCell>
                                                {/* Drops */}
                                                <TableCell className="text-right bg-green-50/30">{row.total_drops}</TableCell>
                                                <TableCell className="text-right bg-green-50/30">{formatCurrency(row.drop_cost)}</TableCell>
                                                <TableCell className="text-right bg-green-50/30">{row.drop_sale_count}</TableCell>
                                                <TableCell className="text-right bg-green-50/30">{formatCurrency(row.drop_sale_cpa)}</TableCell>
                                                {/* Total */}
                                                <TableCell className="text-right font-semibold">{row.total_sale_count}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={15} className="text-center text-muted-foreground">
                                                No vendors found matching "{filterText}"
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
                                <h1 className="text-3xl font-bold tracking-tight">Vendor Performance Report</h1>
                                <p className="text-muted-foreground">Select a vendor and time period to generate your report</p>
                            </div>

                            {/* Vendor Selector */}
                            <div className="flex flex-col items-center gap-3">
                                <Label htmlFor="vendor" className="text-base font-medium">
                                    Vendor
                                </Label>
                                <Select value={selectedVendor} onValueChange={(value) => setSelectedVendor(value)}>
                                    <SelectTrigger id="vendor" className="w-full max-w-xs">
                                        <SelectValue placeholder="Select target vendor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem key='All' value='All'>
                                            All
                                        </SelectItem>
                                        {configData?.vendorData
                                        ?.sort((a, b) => a.friendlyname.localeCompare(b.friendlyname))
                                        .map((vendor) => (
                                            <SelectItem key={vendor.vid} value={vendor.vid}>
                                            {vendor?.friendlyname}
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
                                    disabled={!preset || !selectedVendor || isGenerating || (preset === 'custom' && (!startDate || !endDate))}
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

export default VendorBreakdown;