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
  CartesianGrid,
} from 'recharts';
import { parseISO, differenceInDays, addDays, isValid, max as dateMax, isBefore, lightFormat } from 'date-fns';
import type { PharmacotherapyItem } from '../../types/index';

interface ProcessedDrugEpisode extends PharmacotherapyItem {
  isMerged?: boolean;
  parsedStartDate: Date; 
  parsedEndDate: Date;   
  originalIndex?: number;
}

interface ChartDataItem {
  yCategoryKey: string;    // Unikalny klucz dla osi Y: "DrugName---Dose"
  yTickLabel: string;      // Etykieta na osi Y: "SHORTNAME Dose (skrócona)"
  fullDrugNameWithDose: string; // Dla tooltipów: "NazwaLeku (Pełna Dawka)"
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
  '#6366F1', '#D946EF', '#06B6D4', '#A1A1AA', '#F43F5E', '#84CC16',
  '#F0ABFC', '#FDE68A', '#A7F3D0', '#BFDBFE'
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

function getDrugDoseColor(drugNamePlusDoseKey: string): string {
  const colorIndex = hashCode(drugNamePlusDoseKey.toLowerCase()) % BASE_COLORS.length;
  return BASE_COLORS[colorIndex];
}

const safeDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  const parsed = parseISO(dateStr); 
  return isValid(parsed) ? parsed : null;
};

export const DetailedTrdTimelineChart: React.FC<DetailedTrdTimelineChartProps> = ({ pharmacotherapy }) => {
  console.log('[Chart] Initial pharmacotherapy prop (individual episodes from AI):', JSON.parse(JSON.stringify(pharmacotherapy)));

  const { chartData, minDateTimestamp, maxDateTimestamp, yAxisCategories } = useMemo(() => {
    const validIndividualEpisodes: ProcessedDrugEpisode[] = pharmacotherapy
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
          console.warn(`[Chart] Invalid individual drug episode filtered out (originalIndex: ${drug.originalIndex}): Start: ${drug.startDate}, End: ${drug.endDate}, Name: ${drug.drugName}`, drug);
        }
        return isValidDrug;
      }) as ProcessedDrugEpisode[];

    if (validIndividualEpisodes.length === 0) {
      return { chartData: [], minDateTimestamp: 0, maxDateTimestamp: 0, yAxisCategories: [] };
    }

    // Grupuj epizody po kluczu: NazwaLeku---Dawka
    const groupedByDrugAndDose = new Map<string, ProcessedDrugEpisode[]>();
    validIndividualEpisodes.forEach(episode => {
      const drugName = (episode.drugName || 'Nieznany Lek').trim();
      const dose = (episode.dose || 'N/A').trim();
      const key = `${drugName}---${dose}`;
      if (!groupedByDrugAndDose.has(key)) {
        groupedByDrugAndDose.set(key, []);
      }
      groupedByDrugAndDose.get(key)!.push(episode);
    });

    const finalChartItems: ChartDataItem[] = [];
    let uniqueIdCounter = 0;
    
    // Kolejność na osi Y: najpierw wg pierwszego pojawienia się leku, potem wg dawki
    const yCategoryOrderMap = new Map<string, { firstAppearance: number, doses: Set<string>, shortName: string }>();
    validIndividualEpisodes.forEach(ep => {
        const drugName = (ep.drugName || 'Nieznany Lek').trim();
        const shortName = (ep.shortName || drugName.substring(0,4).toUpperCase() || 'N/A').trim();
        const dose = (ep.dose || 'N/A').trim();
        if (ep.parsedStartDate && isValid(ep.parsedStartDate)) {
            if (!yCategoryOrderMap.has(drugName)) {
                yCategoryOrderMap.set(drugName, { firstAppearance: ep.parsedStartDate.getTime(), doses: new Set(), shortName: shortName });
            }
            yCategoryOrderMap.get(drugName)!.doses.add(dose);
            if (ep.parsedStartDate.getTime() < yCategoryOrderMap.get(drugName)!.firstAppearance) {
                yCategoryOrderMap.get(drugName)!.firstAppearance = ep.parsedStartDate.getTime();
            }
        }
    });

    const sortedDrugNamesForYAxis = Array.from(yCategoryOrderMap.keys())
      .sort((a,b) => yCategoryOrderMap.get(a)!.firstAppearance - yCategoryOrderMap.get(b)!.firstAppearance);

    const yCategoriesForAxis: { value: string; label: string; }[] = [];

    sortedDrugNamesForYAxis.forEach(drugName => {
        const doses = Array.from(yCategoryOrderMap.get(drugName)!.doses).sort((a,b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
        const shortName = yCategoryOrderMap.get(drugName)!.shortName;

        doses.forEach(dose => {
            const yCategoryKey = `${drugName}---${dose}`;
            const episodesInGroup = groupedByDrugAndDose.get(yCategoryKey) || [];
            
            if (episodesInGroup.length === 0) return;
            
            // Nie ma już potrzeby scalania, bo AI dostarcza indywidualne epizody, a każdy lek+dawka to osobny tor
            // Każdy epizod z AI staje się osobnym słupkiem
            episodesInGroup.forEach(episode => {
                const duration = differenceInDays(episode.parsedEndDate, episode.parsedStartDate) + 1;
                finalChartItems.push({
                    yCategoryKey: yCategoryKey,
                    yTickLabel: `${shortName} ${dose.substring(0,12)}${dose.length > 12 ? '...' : ''}`,
                    fullDrugNameWithDose: `${drugName} (${dose})`,
                    id: episode.id || `ep-${uniqueIdCounter++}`, // Użyj ID od AI jeśli jest, inaczej generuj
                    start: episode.parsedStartDate.getTime(),
                    duration: duration > 0 ? duration : 1,
                    originalStartDateStr: lightFormat(episode.parsedStartDate, 'dd.MM.yy'),
                    originalEndDateStr: lightFormat(episode.parsedEndDate, 'dd.MM.yy'),
                    dose: dose,
                    attemptGroup: episode.attemptGroup || 0,
                    color: getDrugDoseColor(yCategoryKey),
                    notes: episode.notes,
                    range: [episode.parsedStartDate.getTime(), episode.parsedEndDate.getTime()] as [number, number],
                });
            });
            // Dodaj do kategorii osi Y tylko raz dla każdej kombinacji lek+dawka
            if (!yCategoriesForAxis.find(cat => cat.value === yCategoryKey)) {
                 yCategoriesForAxis.push({ value: yCategoryKey, label: `${shortName} ${dose.substring(0,12)}${dose.length > 12 ? '...' : ''}` });
            }
        });
    });
    
    if (finalChartItems.length === 0) {
      return { chartData: [], minDateTimestamp: 0, maxDateTimestamp: 0, yAxisCategories: [] };
    }

    const allAggregatedTimestamps = finalChartItems.flatMap(d => d.range ? [d.start, d.range[1]] : [d.start]);
    let minTs = Math.min(...allAggregatedTimestamps);
    let maxTs = Math.max(...allAggregatedTimestamps);

    const dateDiffVal = differenceInDays(new Date(maxTs), new Date(minTs));
    if (dateDiffVal < 60) {
        const paddingNeeded = (60 - dateDiffVal) / 2;
        minTs = addDays(new Date(minTs), -Math.ceil(paddingNeeded) - 20).getTime();
        maxTs = addDays(new Date(maxTs), Math.ceil(paddingNeeded) + 20).getTime();
    } else {
        minTs = addDays(new Date(minTs), -30).getTime();
        maxTs = addDays(new Date(maxTs), 30).getTime();
    }
    const overallMinTimestamp = minTs;
    const overallMaxTimestamp = maxTs;
    
    // Sortowanie yCategoriesForAxis na podstawie kolejności z sortedDrugNamesForYAxis i sortowania dawek
    // Ta część jest już obsłużona przez iterację po sortedDrugNamesForYAxis i dodawanie do yCategoriesForAxis

    return { 
      chartData: finalChartItems, 
      minDateTimestamp: overallMinTimestamp, 
      maxDateTimestamp: overallMaxTimestamp, 
      yAxisCategories: yCategoriesForAxis // Użyj nowo utworzonej, posortowanej listy
    };
  }, [pharmacotherapy]);

  if (chartData.length === 0) {
    return <p className="text-slate-500 text-center py-4">Brak prawidłowych danych farmakoterapii do wizualizacji osi czasu leczenia.</p>;
  }
  
  const CustomTooltipContent: React.FC<any> = ({ active, payload }): JSX.Element | null => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem; 
      return (
        <div className="bg-white p-3 shadow-lg rounded-md border border-slate-200 text-sm max-w-md">
          <p className="font-semibold text-slate-800">{data.fullDrugNameWithDose}</p>
          <p className="text-slate-600">
            Okres: {data.originalStartDateStr} - {data.originalEndDateStr}
          </p>
          <p className="text-slate-600">Czas trwania: {data.duration} dni</p>
          {data.attemptGroup > 0 && <p className="text-slate-600">Próba leczenia: {data.attemptGroup}</p>}
          {data.notes && <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">Uwagi: {data.notes}</p>}
        </div>
      );
    }
    return null;
  };

  const XAxisTickFormatter = (timestamp: number): string => {
    const date = new Date(timestamp);
    return lightFormat(date, 'dd.MM.yy'); 
  };
  
  const barHeightConst = 20;
  const yCategoryLanePadding = 20; // Zmniejszony padding dla gęstszego upakowania
  const chartHeight = Math.max(500, yAxisCategories.length * (barHeightConst + yCategoryLanePadding) + 200); // Zwiększona minimalna i ogólna wysokość

  return (
    <div style={{ width: '100%', height: chartHeight }} className="overflow-x-auto bg-white p-6 rounded-xl shadow-2xl border border-slate-300">
      <ResponsiveContainer width="100%" height="100%" minWidth={1000}> {/* Zwiększone minWidth */}
        <BarChart
          layout="vertical"
          data={chartData} 
          margin={{ top: 40, right: 30, left: 200, bottom: 80 }} // Znacznie zwiększony lewy margines, zmniejszony prawy
          barCategoryGap="10%" // Mniejszy odstęp między kategoriami na osi Y
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            domain={[minDateTimestamp, maxDateTimestamp]}
            tickFormatter={XAxisTickFormatter}
            scale="time"
            minTickGap={60} // Zmniejszony minTickGap dla potencjalnie większej liczby ticków
            tick={{ fontSize: 11, fill: '#374151' }}
            padding={{left: 20, right: 20}} 
            label={{ value: "Oś Czasu Farmakoterapii", position: "insideBottom", offset: -50, fontSize: 16, fill: '#111827', fontWeight: '600' }}
            allowDuplicatedCategory={false} 
            stroke="#6b7280"
          />
          <YAxis
            type="category"
            dataKey="yCategoryKey" 
            ticks={yAxisCategories.map(cat => cat.value)} 
            tickFormatter={(yCategoryKeyValue: string) => { 
                const cat = yAxisCategories.find(c => c.value === yCategoryKeyValue);
                return cat ? cat.label : ''; 
            }}
            width={180} // Zwiększona szerokość dla dłuższych etykiet "SKRÓT DAWKA"
            tick={{ fontSize: 10, fill: '#111827', fontWeight: '500', textAnchor: 'end' }} // Mniejsza czcionka dla osi Y
            interval={0} 
            tickLine={false}
            axisLine={{ stroke: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} />
          
          <Bar dataKey="range" barSize={barHeightConst} radius={[3, 3, 3, 3]}>
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.id}`} fill={entry.color} />
            ))}
            <LabelList
                position="insideRight" 
                offset={5} // Zmniejszony offset
                fill="#ffffff" 
                fontSize={9} // Mniejsza czcionka etykiety na słupku
                fontWeight="500" // Lżejsza czcionka
                formatter={(_value: any, entry: ChartDataItem) => { 
                    if (!entry || !entry.range || entry.range.length !== 2 || typeof entry.range[0] !== 'number' || typeof entry.range[1] !== 'number') {
                        console.warn("[Chart LabelList] Invalid entry or entry.range for formatter:", entry);
                        return '';
                    }
                    if (typeof entry.duration === 'number' && entry.dose) {
                        // Wyświetlaj tylko czas trwania na słupku dla zwięzłości
                        return `(${entry.duration}d)`; 
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
