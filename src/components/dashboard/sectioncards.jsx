import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { DBContext } from "@/contextproviders/DashboardContext";
import { useCallback, useEffect, useMemo } from "react";

export function SectionCards() {
  const { rawData } = DBContext();

  const countPrimarySales = useMemo(() => {
    return rawData?.coreSalesByDay?.reduce((acc, current) => acc + current.count, 0) || 0;
  }, [rawData]);


  const countSecondarySales = useMemo(() => {
    if (rawData && rawData.secondarysalerecords) {
      return rawData.secondarysalerecords.length
    }
  }, [rawData]);


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 lg:px-6 *:data-[slot=card]:shadow-xs *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Primary Sales</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
          {countPrimarySales ? countPrimarySales : 0}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Secondary Sales</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
          {countSecondarySales ? countSecondarySales : 0}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Active Policies</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {rawData?.policyInfo?.find(p=>p?.status === 'active')?.count || 0}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>At-Risk Policies</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {rawData?.policyInfo?.find(p=>p?.status === 'pendingcancellation')?.count || 0}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}