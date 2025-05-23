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
import { parseISO, differenceInDays, addDays, isValid, max as dateMax, isBefore, lightFormat } from 'date-fns';
// Trying a slightly different import path, assuming 'index.ts' is resolved automatically
import type { PharmacotherapyItem } from '../../types';

interface ProcessedDrugEpisode extends PharmacotherapyItem {
  isMerged?: boolean;
  parsedStartDate: Date; // Ensured to be a valid Date after initial filtering
  parsedEndDate: Date;   // Ensured to be a valid Date after initial filtering
  originalIndex?: number;
}

interface ChartDataItem {
  yCategoryKey: string;    
  yTickLabel: string;      
  fullDrugNameWithDose: string; 
  id: string;              
  start: number;           
  duration: number;        
  originalStartDateStr: string; 
  originalEndDateStr: string;   
  dose: string;            
  attemptGroup: number;
  color: string;           
  notes?: string; 
  range: [number, number]; 
}

interface DetailedTrdTimelineChartProps {
  pharmacotherapy: PharmacotherapyItem[];
}

const BASE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', 
  '#64748B', '#F97316', '#22D3EE', '#A3E635', '#FACC15', '#FB7185',
  '#6366F1', '#D946EF', '#06B6D4', '#A1A1AA', '#F43F5E', '#84CC16'
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; 
  }
  return Math.abs(hash);
}

function getDrugDoseColor(drugName: string, dose: string): string {
  const key = `${drugName}---${dose}`.toLowerCase(); 
  const colorIndex = hashCode(key) % BASE_COLORS.length;
  return BASE_COLORS[colorIndex];
}

const safeDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const parsed = parseISO(dateStr); 
  return isValid(parsed) ? parsed : null;
};

export const DetailedTrdTimelineChart: React.FC<DetailedTrdTimelineChartProps> = ({ pharmacotherapy }) => {
  console.log('[Chart] Initial pharmacotherapy prop:', JSON.parse(JSON.stringify(pharmacotherapy)));

  const { chartDataForRecharts, minDateTimestamp, maxDateTimestamp, yAxisCategories } = useMemo(() => {
    const initialProcessedDrugs: ProcessedDrugEpisode[] = pharmacotherapy
      .map((drug, index) => ({
        ...drug,
        originalIndex: index,
        parsedStartDate: safeDate(drug.startDate),
        parsedEndDate: safeDate(drug.endDate),
      }))
      .filter(drug => {
        const isValidDrug = drug.parsedStartDate instanceof Date && 
                            isValid(drug.parsedStartDate) &&
                            drug.parsedEndDate instanceof Date && 
                            isValid(drug.parsedEndDate) && 
                            !isBefore(drug.parsedEndDate, drug.parsedStartDate);
        if(!isValidDrug) {
          console.warn(`[Chart] Invalid drug data (pre-merge) filtered out (originalIndex: ${drug.originalIndex}): Start: ${drug.startDate}, End: ${drug.endDate}, Name: ${drug.drugName}`, drug);
        }
        return isValidDrug;
      }) as ProcessedDrugEpisode[];

    const groupedForMerging = new Map<string, ProcessedDrugEpisode[]>();
    initialProcessedDrugs.forEach(drug => {
      const drugNameKey = (drug.drugName || 'Nieznany Lek').trim();
      const doseKey = (drug.dose || 'N/A').trim();
      const mergeKey = `${drugNameKey}---${doseKey}`;
      if (!groupedForMerging.has(mergeKey)) {
        groupedForMerging.set(mergeKey, []);
      }
      groupedForMerging.get(mergeKey)!.push(drug); 
    });

    const mergedDrugDoseEpisodes: ProcessedDrugEpisode[] = [];
    groupedForMerging.forEach(group => {
      if (group.length === 0) return;
      group.sort((a, b) => a.parsedStartDate.getTime() - b.parsedStartDate.getTime());

      let currentMerged: ProcessedDrugEpisode = { ...group[0] };
      currentMerged.isMerged = false; 

      for (let i = 1; i < group.length; i++) {
        const nextDrug = group[i];
        if (currentMerged.parsedEndDate && isValid(currentMerged.parsedEndDate) && 
            nextDrug.parsedStartDate && isValid(nextDrug.parsedStartDate) &&
            nextDrug.parsedStartDate <= addDays(currentMerged.parsedEndDate, 1)) { 
          currentMerged.parsedEndDate = dateMax(currentMerged.parsedEndDate, nextDrug.parsedEndDate);
          currentMerged.isMerged = true;
          if (!currentMerged.notes?.includes('Okresy scalone')) {
            currentMerged.notes = `${currentMerged.notes || ''}${currentMerged.notes ? '; ' : ''}Okresy scalone`.trim();
          }
        } else {
          mergedDrugDoseEpisodes.push(currentMerged);
          currentMerged = { ...nextDrug };
          currentMerged.isMerged = false;
        }
      }
      mergedDrugDoseEpisodes.push(currentMerged);
    });
    
    console.log('[Chart] Merged drug-dose episodes:', JSON.parse(JSON.stringify(mergedDrugDoseEpisodes)));
    
    const finalValidMergedItems = mergedDrugDoseEpisodes.filter(drug => {
        const stillValid = drug.parsedStartDate instanceof Date && 
                            isValid(drug.parsedStartDate) && 
                            drug.parsedEndDate instanceof Date && 
                            isValid(drug.parsedEndDate) && 
                            !isBefore(drug.parsedEndDate, drug.parsedStartDate);
        if (!stillValid) {
            console.warn('[Chart] Invalid item after merge, filtering out before creating ChartDataItem:', drug);
        }
        return stillValid;
    });

    if (finalValidMergedItems.length === 0) {
      return { chartDataForRecharts: [], minDateTimestamp: 0, maxDateTimestamp: 0, yAxisCategories: [] };
    }

    const allTimestamps = finalValidMergedItems.flatMap(d => [d.parsedStartDate.getTime(), d.parsedEndDate.getTime()]);
    let minTs = Math.min(...allTimestamps);
    let maxTs = Math.max(...allTimestamps);
    
    const dateDiff = differenceInDays(new Date(maxTs), new Date(minTs));
    if (dateDiff < 30) {
        minTs = addDays(new Date(minTs), - Math.floor((30 - dateDiff) / 2) - 15).getTime();
        maxTs = addDays(new Date(maxTs), Math.ceil((30 - dateDiff) / 2) + 15).getTime();
    } else {
        minTs = addDays(new Date(minTs), -15).getTime();
        maxTs = addDays(new Date(maxTs), 15).getTime();
    }
    const overallMinTimestamp = minTs;
    const overallMaxTimestamp = maxTs;

    const items: ChartDataItem[] = finalValidMergedItems.map((drug, index) => {
      // Critical check before date operations
      if (!isValid(drug.parsedStartDate) || !isValid(drug.parsedEndDate)) {
        console.error(`[Chart] Creating ChartDataItem: Invalid date found for drug at originalIndex ${drug.originalIndex}`, drug);
        // Return a placeholder or skip this item to prevent RangeError
        // For now, skipping might be safer if data is truly corrupt.
        // However, the filter above should prevent this. This is an extra safeguard.
        return null; 
      }

      const duration = differenceInDays(drug.parsedEndDate, drug.parsedStartDate) + 1;
      const fullDrugName = (drug.drugName || 'Nieznany Lek').trim();
      const dose = (drug.dose || 'N/A').trim();
      const yCategoryKey = fullDrugName;
      const shortName = (drug.shortName || fullDrugName.substring(0,3).toUpperCase() || 'N/A').trim();

      return {
        yCategoryKey: yCategoryKey,
        yTickLabel: shortName, 
        fullDrugNameWithDose: `${fullDrugName} (${dose})`,
        id: drug.id ? `${drug.id}-${index}-ep` : `drug-ep-${index}-${Math.random().toString(16).slice(2)}`,
        start: drug.parsedStartDate.getTime(),
        duration: duration > 0 ? duration : 1,
        originalStartDateStr: lightFormat(drug.parsedStartDate, 'dd.MM.yy'),
        originalEndDateStr: lightFormat(drug.parsedEndDate, 'dd.MM.yy'),
        dose: dose,
        attemptGroup: drug.attemptGroup || 0,
        color: getDrugDoseColor(fullDrugName, dose),
        notes: drug.notes,
        range: [
          drug.parsedStartDate.getTime(), 
          addDays(drug.parsedStartDate, (duration > 0 ? duration : 1) - 1).getTime()
        ] as [number, number],
      };
    }).filter(item => item !== null) as ChartDataItem[]; // Filter out any nulls from invalid date handling
    
    const yCategoryMap = new Map<string, { label: string, minStart: number }>();
    initialProcessedDrugs.forEach(drug => {
        const fullDrugNameKey = (drug.drugName || 'Nieznany Lek').trim();
        const shortNameLabel = (drug.shortName || fullDrugNameKey.substring(0,3).toUpperCase() || 'N/A').trim();
        if (drug.parsedStartDate && isValid(drug.parsedStartDate) && !yCategoryMap.has(fullDrugNameKey)) { 
            yCategoryMap.set(fullDrugNameKey, { label: shortNameLabel, minStart: drug.parsedStartDate.getTime() });
        }
    });

    const sortedYCategories = Array.from(yCategoryMap.entries())
        .sort(([, a], [, b]) => a.minStart - b.minStart) 
        .map(([key, val]) => ({ value: key, label: val.label }));

    console.log('[Chart] Final chartDataForRecharts (items for Recharts):', JSON.parse(JSON.stringify(items)));
    console.log('[Chart] Y-Axis Categories (for domain and ticks):', sortedYCategories);

    return { 
      chartDataForRecharts: items, 
      minDateTimestamp: overallMinTimestamp, 
      maxDateTimestamp: overallMaxTimestamp, 
      yAxisCategories: sortedYCategories 
    };
  }, [pharmacotherapy]);

  if (chartDataForRecharts.length === 0) {
    return <p className="text-slate-500 text-center py-4">Brak prawidłowych danych farmakoterapii do wizualizacji osi czasu leczenia.</p>;
  }
  
  const CustomTooltipContent: React.FC<any> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem; 
      return (
        <div className="bg-white p-3 shadow-lg rounded-md border border-slate-200 text-sm">
          <p className="font-semibold text-slate-800">{data.fullDrugNameWithDose}</p>
          <p className="text-slate-600">
            Okres: {data.originalStartDateStr} - {data.originalEndDateStr}
          </p>
          <p className="text-slate-600">Czas trwania: {data.duration} dni</p>
          {data.attemptGroup > 0 && <p className="text-slate-600">Próba leczenia: {data.attemptGroup}</p>}
          {data.notes && <p className="text-xs text-slate-500 mt-1">Uwagi: {data.notes}</p>}
        </div>
      );
    }
    return null;
  };

  const XAxisTickFormatter = (timestamp: number): string => {
    const date = new Date(timestamp);
    return lightFormat(date, 'dd.MM.yy'); 
  };
  
  const barHeight = 20;
  const yCategoryPadding = 35;
  const chartHeight = Math.max(300, yAxisCategories.length * yCategoryPadding + 120);

  return (
    <div style={{ width: '100%', height: chartHeight }} className="overflow-x-auto bg-slate-50 p-4 rounded-lg shadow-inner">
      <ResponsiveContainer width="100%" height="100%" minWidth={800}>
        <BarChart
          layout="vertical"
          data={chartDataForRecharts} 
          margin={{ top: 20, right: 70, left: 50, bottom: 60 }} 
          barCategoryGap="0%" 
        >
          <XAxis
            type="number"
            domain={[minDateTimestamp, maxDateTimestamp]}
            tickFormatter={XAxisTickFormatter}
            scale="time"
            minTickGap={50}
            tick={{ fontSize: 10, fill: '#475569' }}
            padding={{left: 20, right: 20}} 
            label={{ value: "Oś Czasu Farmakoterapii", position: "insideBottom", offset: -35, fontSize: 13, fill: '#1e293b', fontWeight: 'bold' }}
            allowDuplicatedCategory={false} 
            stroke="#cbd5e1"
          />
          <YAxis
            type="category"
            dataKey="yCategoryKey" 
            ticks={yAxisCategories.map(cat => cat.value)} 
            tickFormatter={(yCategoryKeyValue) => { 
                const cat = yAxisCategories.find(c => c.value === yCategoryKeyValue);
                return cat ? cat.label : ''; 
            }}
            width={100} 
            tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 'bold', textAnchor: 'end' }}
            interval={0} 
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'rgba(203, 213, 225, 0.3)' }} />
          
          <Bar dataKey="range" barSize={barHeight} radius={[4, 4, 4, 4]}>
            {chartDataForRecharts.map((entry) => (
              <Cell key={`cell-${entry.id}`} fill={entry.color} />
            ))}
            <LabelList
                position="right"
                offset={5}
                fill="#334155" 
                fontSize={9}
                formatter={(_value: any, entry: ChartDataItem) => { 
                    if (entry && typeof entry.duration === 'number' && entry.fullDrugNameWithDose) {
                        const chartRenderWidth = typeof window !== "undefined" ? window.innerWidth * 0.7 - 250 : 450; 
                        const timeSpanRatio = (entry.range[1] - entry.range[0]) / (maxDateTimestamp - minDateTimestamp);
                        const barPixelWidth = timeSpanRatio * chartRenderWidth;
                        
                        const labelText = `${entry.dose} (${entry.duration}d)`; 
                        
                        if (barPixelWidth < 30 && entry.duration > 0) return `(${entry.duration}d)`;
                        if (barPixelWidth < (labelText.length * 4.5)) { 
                             return `(${entry.duration}d)`;
                        }
                        return labelText;
                    }
                    return '';
                }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};