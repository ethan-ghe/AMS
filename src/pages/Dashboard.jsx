import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbLink,
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
import { Button } from "@/components/ui/button"
import { SplashScreen } from "../components/splashscreen"
import { SectionCards } from "@/components/dashboard/sectioncards"
import { InteractiveChart } from "@/components/dashboard/interactive-chart"
import { DateRangePicker } from "@/components/daterangepicker/date-range-picker"
import { AgentSnapshotTable } from "@/components/dashboard/agent-snapshot-table"
import { GeoSnapshotTable } from "@/components/dashboard/geo-snapshot-table"
import { VendorSnapshotTable } from "../components/dashboard/vendor-snapshot-table"
import { EnrollmentCodeChart } from "../components/dashboard/enrollment-code-chart"
import { useAuth } from "@/contextproviders/AuthContext";
import { DBContext } from "@/contextproviders/DashboardContext";
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { useEffect } from "react"

function Dashboard() {
  const { loading } = useAuth()
  const { setPrimaryDateRange, setSecondaryDateRange, fetchData, dashboardLoading, lineOfBusiness, lineOfBusinessMap, setLineOfBusiness, timeFrame, setTimeFrame, timeFrameArray } = DBContext();

  const handleUpdate = (e) => {
    setPrimaryDateRange(e?.range);
    setSecondaryDateRange(e?.rangeCompare)
  }

  const handleDataRefresh = async () => {
    if (dashboardLoading) return; // Prevent multiple clicks
    try {
      console.log("Clicked");
      toast.info("Please wait", {
        description: "Your data is refreshing..."
      });
      const refreshed = await fetchData();
      if (refreshed) {
        toast.success("Success", {
          description: "Your data has been refreshed"
        });
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Something went wrong", {
        description: "Please refresh your screen and try again"
      });
    }
  }

  const handleLOBSwitch = (value) => {
    // Find the matching line of business object
    const foundLine = lineOfBusinessMap.find(l => l.value === value);
    if (foundLine) {
      setLineOfBusiness(foundLine);
    }
  }

  const handleTimeFrameSwitch = (value) => {
    if (value) {
      setTimeFrame(value);
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {loading === true || dashboardLoading === true && (
          <SplashScreen />
        )}
        <header className="flex h-16 shrink-0 items-center justify-between transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  Favorites
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbPage className="hidden md:block">
                  Dashboard
                </BreadcrumbPage>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center space-x-2 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDataRefresh}
              disabled={dashboardLoading}
              className="h-9 w-9 rounded-full"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${dashboardLoading ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh data</span>
            </Button>
            <Select
              defaultValue={timeFrame}
              onValueChange={handleTimeFrameSwitch}
              value={timeFrame}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time Frame" />
              </SelectTrigger>
              <SelectContent>
                {timeFrameArray.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker onUpdate={(e) => handleUpdate(e)} />
          </div>
        </header>
        <SectionCards />
        <InteractiveChart />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 px-2 lg:px-6">
          <div>
            <AgentSnapshotTable />
          </div>
          <div>
            <GeoSnapshotTable />
          </div>
          <div>
            <VendorSnapshotTable />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Dashboard