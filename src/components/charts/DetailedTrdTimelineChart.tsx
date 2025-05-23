// src/components/charts/DetailedTrdTimelineChart.tsx
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts';
import { parseISO, differenceInDays, format, addDays, isValid } from 'date-fns';
import type { PharmacotherapyItem } from '../../types';

interface ChartDataItem {
  name: string;
  id: string;
  start: number; // Timestamp
  duration: number; // Days
  originalStartDate: string;
  originalEndDate: string;
  dose: string;
  attemptGroup: number;
  color: string;
}

interface DetailedTrdTimelineChartProps {
  pharmacotherapy: PharmacotherapyItem[];
}

const ATTEMPT_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
];

const safeDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const parsed = parseISO(dateStr);
  return isValid(parsed) ? parsed : null;
};

export const DetailedTrdTimelineChart: React.FC<DetailedTrdTimelineChartProps> = ({ pharmacotherapy }) => {
  const { chartData, minDateTimestamp, maxDateTimestamp, yAxisDomain } = useMemo(() => {
    const validDrugs = pharmacotherapy
      .map(drug => ({
        ...drug,
        parsedStartDate: safeDate(drug.startDate),
        parsedEndDate: safeDate(drug.endDate),
      }))
      .filter(drug => drug.parsedStartDate && drug.parsedEndDate && drug.parsedStartDate <= drug.parsedEndDate);

    if (validDrugs.length === 0) {
      return { chartData: [], minDateTimestamp: 0, maxDateTimestamp: 0, yAxisDomain: [] };
    }

    const allTimestamps = validDrugs.flatMap(d => [d.parsedStartDate!.getTime(), d.parsedEndDate!.getTime()]);
    const minTs = Math.min(...allTimestamps);
    const maxTs = Math.max(...allTimestamps);
    
    const paddingDays = validDrugs.length > 1 && minTs !== maxTs ? 30 : 60;
    const minDate = addDays(new Date(minTs), -paddingDays);
    const maxDate = addDays(new Date(maxTs), paddingDays);

    const overallMinTimestamp = minDate.getTime();
    const overallMaxTimestamp = maxDate.getTime();

    const data: ChartDataItem[] = validDrugs.map((drug, index) => {
      const duration = differenceInDays(drug.parsedEndDate!, drug.parsedStartDate!) + 1;
      return {
        name: drug.shortName || drug.drugName || 'Nieznany Lek', // Fallback for name
        id: drug.id || `drug-${index}-${Math.random()}`, // More unique fallback ID
        start: drug.parsedStartDate!.getTime(),
        duration: duration > 0 ? duration : 1, // Ensure duration is at least 1
        originalStartDate: format(drug.parsedStartDate!, 'dd.MM.yy'),
        originalEndDate: format(drug.parsedEndDate!, 'dd.MM.yy'),
        dose: drug.dose || 'N/A',
        attemptGroup: drug.attemptGroup || 0,
        color: ATTEMPT_COLORS[((drug.attemptGroup || 0) -1 + ATTEMPT_COLORS.length) % ATTEMPT_COLORS.length] || '#6B7280',
      };
    });
    
    const yDomain = data.map(d => d.name).reverse(); 

    return { chartData: data, minDateTimestamp: overallMinTimestamp, maxDateTimestamp: overallMaxTimestamp, yAxisDomain: yDomain };
  }, [pharmacotherapy]);

  if (chartData.length === 0) {
    return <p className="text-slate-500 text-center py-4">Brak danych do wizualizacji osi czasu leczenia.</p>;
  }
  
  const CustomTooltipContent: React.FC<any> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem; // item from chartData
      return (
        <div className="bg-white p-3 shadow-lg rounded-md border border-slate-200 text-sm">
          <p className="font-semibold text-slate-800">{data.name} ({data.dose})</p>
          <p className="text-slate-600">
            Okres: {data.originalStartDate} - {data.originalEndDate}
          </p>
          <p className="text-slate-600">Czas trwania: {data.duration} dni</p>
          {data.attemptGroup > 0 && <p className="text-slate-600">Próba leczenia: {data.attemptGroup}</p>}
        </div>
      );
    }
    return null;
  };

  const XAxisTickFormatter = (timestamp: number): string => {
    const date = new Date(timestamp);
    return format(date, 'dd.MM.yy'); 
  };

  // dataKey for Bar should relate to the 'value' of the bar for positioning purposes.
  // Since we're making a Gantt chart, the 'value' is essentially the [start, end] range.
  // Recharts expects a single value for dataKey to determine bar length from origin,
  // or an array of two values [start, end] for a bar that doesn't start at origin.
  const dataKeyForBar: [string, string] = ["start", "end_calculated_for_recharts_bar"];
  // However, to make it simpler with LabelList and Cell, we'll use a single dataKey for Bar
  // and handle positioning and width via Cells and ensure LabelList gets the correct 'entry'.
  // The `Bar` component itself doesn't directly draw if you provide custom Cells for everything.
  // We can make `dataKey` point to `duration` and use `x` in a custom shape or rely on `Cell` to be correctly placed.
  // The current approach maps `Bar` with `dataKey="start"` and Cells inside.
  // Let's define a `value` that represents the end point for the `Bar` `dataKey` for length calculation.
  // Each item in `chartData` will need `start` (timestamp) and an `end` (timestamp).
  const chartDataWithEndpoints = chartData.map(item => ({
    ...item,
    // This 'value' will be used by the Bar to determine its length on the XAxis (from origin if not stacked/custom)
    // For a Gantt, we pass an array [start, end] to dataKey if supported or use custom shape.
    // Here, we're using `Bar dataKey="start"` and Cells. This is unusual.
    // The <Bar dataKey="start"> means the length of the bar is determined by the 'start' value, which is not what we want for Gantt.
    // We want the bar to be drawn from 'start' for a length of 'duration'.
    // A common approach for Gantt in Recharts:
    // dataKey="range" where range = [item.start, item.start + item.duration_in_ms]
    // Or, use a "dummy" Bar component and render everything with custom shapes or Cells based on an iteration.
    // The Bar > Cell approach means Cell is responsible for rendering its segment.
    // If we use Cell, the Bar's dataKey is less critical if Cell overrides rendering.
    // However, LabelList is tricky. It associates with the Bar's data.

    // Let's map data for Bar to have a clear [start, end] for dataKey.
    range: [item.start, addDays(new Date(item.start), item.duration -1).getTime()] as [number, number]
  }));


  const barHeight = 25;
  const chartHeight = yAxisDomain.length * (barHeight + 15) + 80; // Increased bottom margin

  return (
    <div style={{ width: '100%', height: chartHeight }} className="overflow-x-auto">
      <ResponsiveContainer width="100%" height="100%" minWidth={600}>
        <BarChart
          layout="vertical"
          data={chartDataWithEndpoints} // Use data with 'range'
          margin={{ top: 20, right: 50, left: 20, bottom: 40 }} // Adjusted margins
          barCategoryGap="25%"
        >
          <XAxis
            type="number"
            domain={[minDateTimestamp, maxDateTimestamp]}
            tickFormatter={XAxisTickFormatter}
            scale="time"
            minTickGap={60} 
            tick={{ fontSize: 10, fill: '#64748b' }}
            padding={{left: 10, right: 10}}
            label={{ value: "Oś Czasu", position: "insideBottom", offset: -25, fontSize: 12, fill: '#334155' }}
          />
          <YAxis
            type="category"
            dataKey="name" // This refers to 'name' in chartDataWithEndpoints (via original chartData items)
            width={120} // Increased width for drug names
            tick={{ fontSize: 11, fill: '#334155' }}
            domain={yAxisDomain} 
            interval={0} 
          />
          <Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'rgba(200,200,200,0.1)' }} />
          
          <Bar dataKey="range" barSize={barHeight} radius={[4, 4, 4, 4]}>
            {chartDataWithEndpoints.map((entry) => (
              <Cell key={`cell-${entry.id}`} fill={entry.color} />
            ))}
            <LabelList
                // dataKey="name" // This was causing 'value' to be 'name'
                // Let's not specify dataKey here, so 'entry' in formatter is the full data object
                // and 'value' would be the value of Bar's dataKey ('range')
                // Or, content can be a custom component.
                // For simplicity, let's ensure the formatter gets the full entry.
                // If dataKey is not set on LabelList, it might use the Bar's dataKey by default.
                // The 'value' passed to formatter would be 'range'. 'entry' would be the data item.
                position="insideRight" 
                offset={8}
                fill="#ffffff"
                fontSize={10}
                formatter={(value: [number,number], entry: ChartDataItem) => { // Value is now 'range', entry is from chartDataWithEndpoints which has ChartDataItem props
                    if (entry && typeof entry.duration === 'number') {
                        // entry.name should be correct here, as 'entry' is the item from chartDataWithEndpoints
                        return `${entry.name} (${entry.duration}d)`;
                    }
                    if (entry && entry.name) return entry.name; // Fallback
                    return '';
                }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};