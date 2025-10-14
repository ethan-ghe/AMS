"use client"
import { Pie, PieChart, Legend, ResponsiveContainer } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const chartData = [
  { name: "Health", value: 275, fill: "hsl(var(--primary))" },
  { name: "Auto", value: 200, fill: "hsl(var(--secondary))" },
  { name: "Home", value: 187, fill: "hsl(var(--accent))" },
  { name: "Life", value: 173, fill: "hsl(var(--muted))" },
  { name: "Other", value: 90, fill: "hsl(var(--destructive))" }
]

export function EnrollmentCodeChart() {
  return (
    <Card className="w-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>Enrollment Code Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="mx-auto aspect-square max-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={chartData} 
                dataKey="value" 
                nameKey="name"
                cx="50%" 
                cy="50%" 
                outerRadius={80}
                label
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}