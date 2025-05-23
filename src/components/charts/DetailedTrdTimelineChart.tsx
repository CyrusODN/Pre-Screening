import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { differenceInDays, format } from 'date-fns';
import { FC, useMemo } from 'react';
import { PatientData } from '../../types';

interface Props {
  /** może być undefined, gdy AI jeszcze nie zwróciło danych */
  trdAnalysis?: PatientData['trdAnalysis'] | null;
}

/* util – zwraca null, jeśli data pusta / niepoprawna */
const safeDate = (d: string | null | undefined) => {
  if (!d) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const DetailedTrdTimelineChart: FC<Props> = ({ trdAnalysis }) => {
  /* jeśli brak danych – nie renderuj wykresu */
  if (!trdAnalysis?.pharmacotherapy?.length) {
    return <p>Brak danych do wizualizacji.</p>;
  }

  /* ---- prepare data ---- */
  const data = useMemo(() => {
    return trdAnalysis.pharmacotherapy
      .map((drug) => {
        const start = safeDate(drug.startDate);
        const end = safeDate(drug.endDate);
        if (!start || !end) return null;

        return {
          id: drug.id,
          name: drug.shortName || drug.drugName,
          x: start,
          width: Math.max(differenceInDays(end, start), 1), // min 1 px
          startLabel: format(start, 'yyyy-MM-dd'),
          endLabel: format(end, 'yyyy-MM-dd'),
        };
      })
      .filter(Boolean) as {
      id: string;
      name: string;
      x: Date;
      width: number;
      startLabel: string;
      endLabel: string;
    }[];
  }, [trdAnalysis]);

  if (!data.length) return <p>Brak poprawnych dat do wykresu.</p>;

  /* ---- custom tooltip ---- */
  const CustomTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { name, startLabel, endLabel } = payload[0].payload;
    return (
      <div className="rounded-lg bg-white p-2 shadow">
        <p className="font-semibold">{name}</p>
        <p>{`${startLabel} → ${endLabel}`}</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={120 + data.length * 20}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 100, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <Tooltip content={<CustomTooltipContent />} />
        <Bar
          dataKey="width"
          isAnimationActive={false}
          shape={({ x, y, width, height, fill }) => (
            <rect x={x} y={y} width={width} height={height} fill={fill} />
          )}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};