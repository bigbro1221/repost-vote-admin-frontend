'use client';

import { DateRangePicker } from 'react-date-range';
import * as rdrLocales from 'react-date-range/dist/locale';

const DatePicker = ({ value, onChange }) => {
  return (
    <DateRangePicker
      locale={rdrLocales.ru}
      ranges={value}
      onChange={onChange}
    />
  );
};

export default DatePicker;
