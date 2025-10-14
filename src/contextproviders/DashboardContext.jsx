// src/contextproviders/DashboardContext.jsx
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useConfig } from "./ConfigContext";
import useApi from "../hooks/useApi";
import { toast } from "sonner";

const DashboardContext = createContext(null);

const getStartingRange = () => {
  const from = new Date();
  const to = new Date();
  const first = from.getDate() - from.getDay();
  from.setDate(first);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
};

export function DBAuthProvider({ children }) {
  const { configData } = useConfig();
  const dashboardApi = useApi();
  
  const [primaryDateRange, setPrimaryDateRange] = useState(getStartingRange());
  const [secondaryDateRange, setSecondaryDateRange] = useState(getStartingRange());
  const [timeFrame, setTimeFrame] = useState("Daily");
  const [rawData, setRawData] = useState({
    callrecords: [],
    primarysalerecords: [],
    secondarysalerecords: []
  });
  const [filteredData, setFilteredData] = useState(null)
  const [lineOfBusiness, setLineOfBusiness] = useState({name:"Medicare Advantage", value:"ma"});
  
  const lineOfBusinessMap = [
    {name:"All", value:"All"},
    {name:"Medicare Advantage", value:"MedAdv"},
    {name:"Final Expense", value:"FE"}
  ];
  const timeFrameArray = ["Hourly", "Daily", "Day Of Week", "Weekly", "Monthly"];

  useEffect(() => {
    console.log(primaryDateRange);
    if (!configData) return;

    const fetchDashboardData = async () => {
      if (primaryDateRange?.from === primaryDateRange?.to) {
        setTimeFrame("Hourly");
      }

      const result = await dashboardApi.execute('/dashboard/data', 'POST', {
        primaryDateRange,
        secondaryDateRange,
        lineOfBusiness: lineOfBusiness.value,
      });


      if (result) {
        setRawData(result);
      } else {
        toast.error('Failed To Load Dashboard Data', {
          description: result.error || 'Please try again.'
        });
      }
    };

    fetchDashboardData();
  }, [primaryDateRange, secondaryDateRange, lineOfBusiness, configData]);

  // ✅ Use useMemo instead of useCallback - memoize the RESULT, not the function
  useEffect(() => {
    console.log("raw data ", rawData)
    let returnObj = {
      callrecords: [],
      primarysalerecords: [],
      secondarysalerecords: []
    };

    if (!primaryDateRange?.from || !primaryDateRange?.to || !rawData) {
      return returnObj;
    }

    // Convert date range to Date objects
    const fromDate = primaryDateRange.from instanceof Date
      ? primaryDateRange.from
      : new Date(primaryDateRange.from);
    
    const toDate = primaryDateRange.to instanceof Date
      ? primaryDateRange.to
      : new Date(primaryDateRange.to);
    
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    // Filter callrecords
    if (rawData.callrecords) {
      returnObj.callrecords = rawData.callrecords
        .filter(call => lineOfBusiness.value === "All" || call?.line === lineOfBusiness.value)
        .filter(record => {
          const recordDate = new Date(record.timestamp);
          return recordDate >= fromDate && recordDate <= toDate;
        });
    }

    // Filter primarysalerecords
    if (rawData.primarysalerecords) {
      returnObj.primarysalerecords = rawData.primarysalerecords
        .filter(primsale => lineOfBusiness.value === "All" || primsale?.line === lineOfBusiness.value)
        .filter(record => {
          const recordDate = new Date(record.timestamp);
          return recordDate >= fromDate && recordDate <= toDate;
        });
    }

    // Filter secondarysalerecords
    if (rawData.secondarysalerecords) {
      returnObj.secondarysalerecords = rawData.secondarysalerecords
        .filter(secsale => lineOfBusiness.value === "All" || secsale?.line === lineOfBusiness.value)
        .filter(record => {
          const recordDate = new Date(record.timestamp);
          return recordDate >= fromDate && recordDate <= toDate;
        });
    }

    setFilteredData(returnObj)

  }, [rawData]); 

  const fetchData = useCallback(async () => {
    if (dashboardApi.loading) return false;

      if (primaryDateRange?.from === primaryDateRange?.to) {
        setTimeFrame("Hourly");
      }

      const result = await dashboardApi.execute('/dashboard/data', 'POST', {
        primaryDateRange,
        secondaryDateRange,
        lineOfBusiness: lineOfBusiness.value,
      });

      if (result) {
        setRawData(result);
        toast.success('Data Refreshed');
      } else {
        toast.error('Failed To Load Dashboard Data', {
          description: result.error || 'Please try again.'
        });
      }
  }, [dashboardApi.loading, primaryDateRange, secondaryDateRange, lineOfBusiness, timeFrame]);

  const value = {
    // Data
    rawData,
    filteredData,
    
    // Loading & Error
    dashboardLoading: dashboardApi.loading,
    error: dashboardApi.error,
    
    // Date Ranges
    primaryDateRange,
    setPrimaryDateRange,
    secondaryDateRange,
    setSecondaryDateRange,
    
    // Filters
    lineOfBusiness,
    setLineOfBusiness,
    lineOfBusinessMap,
    timeFrame,
    setTimeFrame,
    timeFrameArray,
    
    // Actions
    fetchData,
    refreshData: fetchData
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === null) {
    throw new Error("useDashboard must be used within a DBAuthProvider");
  }
  return context;
};

export const DBContext = useDashboard;