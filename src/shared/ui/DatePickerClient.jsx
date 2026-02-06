'use client';

import dynamic from 'next/dynamic';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const DateRangePicker = dynamic(
  () =>
    import('react-date-range').then(mod => mod.DateRangePicker),
  { ssr: false }
);

export default function DatePickerClient({ value, onChange }) {
  return (
    <DateRangePicker
      ranges={value}
      onChange={onChange}
    />
  );
}
