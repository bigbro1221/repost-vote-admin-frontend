'use client';

import dynamic from 'next/dynamic';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import {ru} from 'date-fns/locale';
import {addDays, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, subMonths} from 'date-fns';

const DateRangePicker = dynamic(
  () => import('react-date-range').then(mod => mod.DateRangePicker),
  { ssr: false }
);

const now = () => new Date();
const mk = (label, range) => ({
  label,
  range,
  isSelected(r) {
    const d = range();
    return startOfDay(r.startDate).getTime() === startOfDay(d.startDate).getTime()
      && startOfDay(r.endDate).getTime() === startOfDay(d.endDate).getTime();
  },
});
const STATIC_RANGES = [
  mk('Сегодня', () => ({ startDate: now(), endDate: now() })),
  mk('Вчера', () => ({ startDate: addDays(now(), -1), endDate: addDays(now(), -1) })),
  mk('Последние 7 дней', () => ({ startDate: addDays(now(), -6), endDate: now() })),
  mk('Последние 30 дней', () => ({ startDate: addDays(now(), -29), endDate: now() })),
  mk('Эта неделя', () => ({ startDate: startOfWeek(now(), { weekStartsOn: 1 }), endDate: endOfWeek(now(), { weekStartsOn: 1 }) })),
  mk('Этот месяц', () => ({ startDate: startOfMonth(now()), endDate: endOfMonth(now()) })),
  mk('Прошлый месяц', () => ({ startDate: startOfMonth(subMonths(now(), 1)), endDate: endOfMonth(subMonths(now(), 1)) })),
];

export default function DatePickerClient({ value, onChange }) {
  return (
    <DateRangePicker
      ranges={value}
      onChange={onChange}
      locale={ru}
      weekStartsOn={1}
      staticRanges={STATIC_RANGES}
      inputRanges={[]}
      rangeColors={['#02A0FC']}
      maxDate={new Date()}
    />
  );
}
