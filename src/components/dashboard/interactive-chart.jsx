"use client"

import * as React from "react"
import { Line,
  Bar,
  ComposedChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis  } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { DBContext } from "@/contextproviders/DashboardContext";

const chartConfig = {
  Calls: {
    label: "Calls",
  },
  inbound: {
    label: "Inbound",
    color: "hsl(var(--primary))",
  },
  outbound: {
    label: "Outbound",
    color: "hsl(var(--secondary))",
  },
  primary: {
    label: "Primary",
    color: "hsl(var(--warning))",
  },
  secondary: {
    label: "Secondary",
    color: "hsl(var(--destructive))",
  }
}

const ChartContainer = ({ children, config, className }) => {
  return (
    <div 
      className={className}
      style={{
        "--color-inbound": config.inbound.color,
        "--color-outbound": config.outbound.color,
        "--color-primary": config.primary.color,
        "--color-secondary": config.secondary.color,
      }}
    >
      {children}
    </div>
  )
}

// ✅ Robust date formatter that handles different formats
const formatDateDisplay = (dateString) => {
  if (!dateString) return '';
  
  try {
    // Handle "2025-09-02" format from Postgres
    let date;
    if (typeof dateString === 'string' && dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};

// ✅ Helper to get grouping key based on timeFrame
const getGroupingKey = (dateString, timeFrame) => {
  try {
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day);
    
    switch (timeFrame) {
      case 'Day Of Week':
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return dayNames[date.getDay()];
        
      case 'Weekly':
        // Get start of week (Sunday)
        const dayOfWeek = date.getDay();
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - dayOfWeek);
        return weekStart.toISOString().split('T')[0];
        
      case 'Monthly':
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        
      default:
        return dateString;
    }
  } catch (error) {
    console.error('Grouping error:', error);
    return dateString;
  }
};

export function InteractiveChart() {
  const { rawData, primaryDateRange, timeFrame, loading } = DBContext();
  
  const generatedData = React.useMemo(() => {
    if (!rawData || !timeFrame || loading) {
      return [];
    }
    
    // ✅ Use hourly data for Hourly timeframe, daily for others
    const useHourly = timeFrame === 'Hourly';
    const callsData = useHourly ? (rawData.callsByHour || []) : (rawData.callsByDay || []);
    const salesData = useHourly ? (rawData.coreSalesByHour || []) : (rawData.coreSalesByDay || []);
    
    // ✅ For Daily and Hourly - simple merge
    if (timeFrame === 'Daily' || timeFrame === 'Hourly') {
      const dataMap = new Map();
      const key = useHourly ? 'hour' : 'date';
      
      callsData.forEach(call => {
        const timePoint = call[key];
        dataMap.set(timePoint, {
          date: timePoint,
          inbound: call.inbound || 0,
          outbound: call.outbound || 0,
          primary: 0,
          secondary: 0
        });
      });
      
      salesData.forEach(sale => {
        const timePoint = sale[key];
        if (dataMap.has(timePoint)) {
          dataMap.get(timePoint).primary = sale.count || 0;
        } else {
          dataMap.set(timePoint, {
            date: timePoint,
            inbound: 0,
            outbound: 0,
            primary: sale.count || 0,
            secondary: 0
          });
        }
      });
      
      let result = Array.from(dataMap.values());
      result.sort((a, b) => {
        if (useHourly) {
          return parseInt(a.date, 10) - parseInt(b.date, 10);
        }
        return a.date.localeCompare(b.date);
      });
      
      return result;
    }
    
    // ✅ For Day Of Week, Weekly, Monthly - group daily data
    const groupedMap = new Map();
    
    // Group calls data
    callsData.forEach(call => {
      const groupKey = getGroupingKey(call.date, timeFrame);
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          date: groupKey,
          inbound: 0,
          outbound: 0,
          primary: 0,
          secondary: 0,
          _sortKey: call.date // Keep original date for sorting
        });
      }
      const group = groupedMap.get(groupKey);
      group.inbound += call.inbound || 0;
      group.outbound += call.outbound || 0;
    });
    
    // Group sales data
    salesData.forEach(sale => {
      const groupKey = getGroupingKey(sale.date, timeFrame);
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          date: groupKey,
          inbound: 0,
          outbound: 0,
          primary: 0,
          secondary: 0,
          _sortKey: sale.date
        });
      }
      const group = groupedMap.get(groupKey);
      group.primary += sale.count || 0;
    });
    
    let result = Array.from(groupedMap.values());
    
    // ✅ Sort based on timeFrame
    switch (timeFrame) {
      case 'Day Of Week':
        const dayOrder = {
          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
          'Thursday': 4, 'Friday': 5, 'Saturday': 6
        };
        result.sort((a, b) => dayOrder[a.date] - dayOrder[b.date]);
        break;
        
      case 'Weekly':
      case 'Monthly':
        result.sort((a, b) => a._sortKey.localeCompare(b._sortKey));
        break;
        
      default:
        break;
    }
    
    // Remove sorting helper
    result.forEach(r => delete r._sortKey);
    
    return result;
  }, [rawData, timeFrame, loading]);

  const formatAxisTickByTimeFrame = (value) => {
    if (!value) return '';
    
    switch (timeFrame) {
      case 'Hourly':
        return `${value}:00`;
      case 'Daily':
        return formatDateDisplay(value);
      case 'Day Of Week':
        return value.substring(0, 3); // Sun, Mon, etc.
      case 'Weekly':
        return formatDateDisplay(value);
      case 'Monthly':
        return value.split(' ')[0]?.substring(0, 3) || value; // Jan, Feb, etc.
      default:
        return formatDateDisplay(value);
    }
  };

  const getDateRangeSubtitle = () => {
    if (!primaryDateRange || !primaryDateRange.from) {
      return "All time data";
    }

    const fromDate = primaryDateRange.from instanceof Date 
      ? primaryDateRange.from 
      : new Date(primaryDateRange.from);
    
    const toDate = primaryDateRange.to instanceof Date 
      ? primaryDateRange.to 
      : new Date(primaryDateRange.to);

    const formatDate = (date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
    };

    return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
  };

  return (
    <div className="w-full px-4 my-6 md:my-8 lg:px-6">
      <Card className="w-full">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Agency Performance ({timeFrame})</CardTitle>
            <CardDescription>
              {getDateRangeSubtitle()}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={generatedData}
                margin={{ top: 10, right: 30, left: 30, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={formatAxisTickByTimeFrame}
                />
                {/* ✅ Left Y-axis for Calls (higher volume) */}
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  label={{ 
                    value: 'Calls', 
                    angle: -90, 
                    position: 'left',
                    offset: 10,
                    style: { textAnchor: 'middle', fontSize: '12px' } 
                  }}
                />
                {/* ✅ Right Y-axis for Sales (lower volume) */}
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  label={{ 
                    value: 'Sales', 
                    angle: -90, 
                    position: 'right',
                    offset: 10,
                    style: { textAnchor: 'middle', fontSize: '12px' } 
                  }}
                />
                <Tooltip 
                  cursor={{ stroke: "var(--muted)", strokeWidth: 1, strokeDasharray: "4 4" }}
                  contentStyle={{ 
                    background: "var(--background)", 
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }}
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(value) => {
                    if (timeFrame === 'Hourly') {
                      return `${value}:00`;
                    } else if (timeFrame === 'Daily') {
                      return formatDateDisplay(value);
                    }
                    return value;
                  }}
                />
                {/* ✅ Sales bars on RIGHT axis */}
                <Bar
                  dataKey="primary"
                  name="Primary"
                  fill="var(--color-primary)"
                  yAxisId="right"
                  barSize={20}
                />
                <Bar
                  dataKey="secondary"
                  name="Secondary"
                  fill="var(--color-secondary)"
                  yAxisId="right"
                  barSize={20}
                />
                {/* ✅ Call lines on LEFT axis */}
                <Line
                  dataKey="inbound"
                  name="Inbound"
                  type="monotone"
                  stroke="#000000"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#000000", stroke: "#000000" }}
                  yAxisId="left"
                  connectNulls={true}
                />
                <Line
                  dataKey="outbound"
                  name="Outbound"
                  type="monotone"
                  stroke="#000000"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#000000", stroke: "#000000" }}
                  yAxisId="left"
                  connectNulls={true}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}