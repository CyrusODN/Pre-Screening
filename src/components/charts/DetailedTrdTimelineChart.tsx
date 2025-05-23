import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { parseISO, format, differenceInDays, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';

interface TimelineProps {
  pharmacotherapy: {
    id: string;
    drugName: string;
    shortName: string;
    startDate: string;
    endDate: string;
    dose: string;
    attemptGroup: number;
    notes?: string;
    isAugmentation?: boolean;
    baseDrug?: string;
  }[];
  overallStartDate: string;
}

export const DetailedTrdTimelineChart: React.FC<TimelineProps> = ({ pharmacotherapy, overallStartDate }) => {
  const today = new Date();
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const GanttBarShape = (props: any) => {
    const { x, y, width, height, fill, payload } = props;
    if (width <= 0) return null;

    return (
      <g onMouseEnter={() => setHoveredBar(payload.barId)} onMouseLeave={() => setHoveredBar(null)}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height * 0.65}
          fill={fill}
          rx={3}
          ry={3}
          style={{ cursor: 'pointer', opacity: hoveredBar === payload.barId || !hoveredBar ? 1 : 0.5, transition: 'opacity 0.2s' }}
        />
      </g>
    );
  };

  const drugColors = useMemo(() => {
    const uniqueDrugs = [...new Set(pharmacotherapy.map(p => p.drugName))];
    const colors = ['#38bdf8', '#fb923c', '#34d399', '#f472b6', '#a78bfa', '#fbbf24', '#84cc16', '#22d3ee'];
    return uniqueDrugs.reduce((acc, drug, index) => {
      acc[drug] = colors[index % colors.length];
      return acc;
    }, {} as Record<string, string>);
  }, [pharmacotherapy]);

  const processedData = useMemo(() => {
    if (!pharmacotherapy || pharmacotherapy.length === 0) {
      return { chartData: [], yAxisDrugs: [], minDate: today, maxDate: today };
    }

    const allDates = pharmacotherapy.flatMap(p => [parseISO(p.startDate), p.endDate ? parseISO(p.endDate) : today]);
    if (overallStartDate) allDates.push(parseISO(overallStartDate));

    let minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    let maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    if (differenceInDays(maxDate, minDate) < 30) {
      maxDate = addDays(minDate, 30);
    }

    const yAxisDrugs = [...new Set(pharmacotherapy.map(p => p.drugName))].sort((a, b) => {
      const firstStartDateA = Math.min(...pharmacotherapy.filter(p => p.drugName === a).map(p => parseISO(p.startDate).getTime()));
      const firstStartDateB = Math.min(...pharmacotherapy.filter(p => p.drugName === b).map(p => parseISO(p.startDate).getTime()));
      return firstStartDateA - firstStartDateB;
    });

    const chartData = pharmacotherapy.map((p, index) => {
      const start = parseISO(p.startDate);
      const end = p.endDate ? parseISO(p.endDate) : (maxDate > today ? addDays(maxDate, 1) : addDays(today, 1));
      const durationInDays = differenceInDays(end, start);

      return {
        ...p,
        taskName: p.drugName,
        range: [start.getTime(), end.getTime()],
        durationInDays,
        fill: drugColors[p.drugName],
        barId: `bar-${p.id}-${index}`
      };
    });

    return { chartData, yAxisDrugs, minDate, maxDate };
  }, [pharmacotherapy, drugColors, overallStartDate, today]);

  const { chartData, yAxisDrugs, minDate, maxDate } = processedData;

  const XAxisTickFormatter = (timestamp: number) => format(new Date(timestamp), 'MMM yy', { locale: pl });

  const CustomTooltipContent = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-md border border-slate-200 text-sm">
          <p className="font-bold text-slate-700" style={{ color: data.fill }}>{data.drugName}</p>
          <p className="text-slate-600"><strong>Dawka:</strong> {data.dose}</p>
          <p className="text-slate-600">
            <strong>Okres:</strong> {format(new Date(data.range[0]), 'dd.MM.yyyy')} - {data.endDate ? format(new Date(data.range[1]), 'dd.MM.yyyy') : 'Trwa'}
          </p>
          {data.notes && <p className="text-slate-500 mt-1"><em>Notatki:</em> {data.notes}</p>}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return <p className="text-slate-500 text-center py-4">Brak danych farmakoterapii do wyświetlenia.</p>;
  }

  return (
    <div className="p-4 border border-slate-200 rounded-lg bg-white shadow min-h-[300px] h-[auto]" style={{ height: `${Math.max(300, yAxisDrugs.length * 50 + 100)}px` }}>
      <h4 className="text-md font-semibold text-slate-700 mb-4 text-center">Oś Czasu Farmakoterapii</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            type="number"
            domain={[minDate.getTime(), maxDate.getTime()]}
            tickFormatter={XAxisTickFormatter}
            scale="time"
            style={{ fontSize: '10px', fill: '#555' }}
            label={{ value: "Oś czasu", position: 'insideBottom', offset: -10, style: { fontSize: '11px', fill: '#555' } }}
            height={40}
          />
          <YAxis
            type="category"
            dataKey="taskName"
            width={100}
            domain={yAxisDrugs}
            interval={0}
            style={{ fontSize: '10px', fill: '#555' }}
          />
          <Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'rgba(200,200,200,0.1)' }} />
          <Legend
            wrapperStyle={{ fontSize: '10px', margin: 'auto' }}
            payload={Object.entries(drugColors).map(([name, color]) => ({ value: name, type: 'square', color: color }))}
          />
          <Bar
            dataKey="range"
            shape={<GanttBarShape />}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="dose"
              position="right"
              offset={5}
              fill="#475569"
              fontSize={9}
              formatter={(value: string, entry: any) => {
                if (!entry || typeof entry.durationInDays === 'undefined') return '';
                return entry.durationInDays > 30 ? value : '';
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};