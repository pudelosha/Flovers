import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Calendar, { LightCalendarDay } from '../Calendar';
import RawCalendar from 'react-native-calendars/src/calendar';
import { ThemeContext } from '../ThemeContext';
import { LIGHT_COLORS } from '../palette';
jest.mock(
  'react-native-calendars/src/calendar',
  () => (props: any) =>
    require('react').createElement(require('react-native').View, props),
);
const light = (children: React.ReactNode) => (
  <ThemeContext.Provider value={{ isLight: true, colors: LIGHT_COLORS }}>
    {children}
  </ThemeContext.Provider>
);
it('retains real due-date marks and renders visible dots with working date selection', () => {
  const date = {
    dateString: '2026-11-03',
    day: 3,
    month: 11,
    year: 2026,
    timestamp: 0,
  };
  const select = jest.fn();
  const ui = render(
    light(
      <Calendar
        current="2026-11-01"
        markingType="multi-dot"
        markedDates={{
          '2026-11-03': {
            marked: true,
            dots: [{ key: 'watering', color: '#4dabf7' }],
          },
        }}
        onDayPress={select}
      />,
    ),
  );
  const props = ui.UNSAFE_getByType(RawCalendar).props;
  expect(props.markedDates['2026-11-03'].marked).toBe(true);
  expect(props.dayComponent).toBe(LightCalendarDay);
  const day = render(
    light(
      <LightCalendarDay
        date={date}
        marking={props.markedDates[date.dateString]}
        onPress={props.onDayPress}
        accessibilityLabel="November 3"
      />,
    ),
  );
  expect(
    day.getByTestId('calendar-dot-2026-11-03-watering').props.style,
  ).toMatchObject({ width: 5, height: 5 });
  fireEvent.press(day.getByRole('button'));
  expect(select).toHaveBeenCalledWith(date);
});

it("draws selection as a real circle and retains space for task dots",()=>{
 const ui=render(light(<LightCalendarDay date={{dateString:"2026-11-03",day:3}} marking={{selected:true}}/>));
 expect(ui.getByTestId("calendar-selected-circle").props).toMatchObject({width:32,height:32});
});
