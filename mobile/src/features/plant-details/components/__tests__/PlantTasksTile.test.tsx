import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PlantTasksTile from '../PlantTasksTile';

const actions = { onMarkComplete: jest.fn(), onPostpone: jest.fn(), onEditReminder: jest.fn(), onShowHistory: jest.fn() };
const pending = [{id:'r1',taskId:'t1',type:'watering' as const,when:'Tomorrow',dueDate:'2030-01-02'}];
const activity = Array.from({length:12},(_,i)=>({id:String(i),type:'watering' as const,completedAt:`2026-10-${String(20-i).padStart(2,'0')}T10:00:00Z`,actor:`Actor ${i}`}));
beforeEach(()=>jest.clearAllMocks());

it('shows upcoming tasks first and only the ten newest completions linked in a chain',()=>{
 const ui=render(<PlantTasksTile {...actions} reminders={pending} activity={activity}/>);
 expect(ui.getAllByTestId('plant-pending-task')).toHaveLength(1);
 expect(ui.getAllByTestId('plant-completed-task')).toHaveLength(10);
 expect(ui.getAllByTestId('task-chain-before')).toHaveLength(9);
 expect(ui.getAllByTestId('task-chain-after')).toHaveLength(9);
 expect(ui.queryByText(/Actor 10$/)).toBeNull();
 expect(ui.queryByText('Activity')).toBeNull();
 expect(ui.queryByText('Reminders')).toBeNull();
});
it('does not draw chain links for a single completion or awaiting tasks',()=>{
 const ui=render(<PlantTasksTile {...actions} reminders={pending} activity={activity.slice(0,1)}/>);
 expect(ui.queryByTestId('task-chain-before')).toBeNull();
 expect(ui.queryByTestId('task-chain-after')).toBeNull();
});
it('opens the awaiting task menu and completes the exact task',()=>{
 const ui=render(<PlantTasksTile {...actions} reminders={pending} activity={[]}/>);
 fireEvent.press(ui.getByLabelText('Task options'));
 fireEvent.press(ui.getByText('Mark as complete'));
 expect(actions.onMarkComplete).toHaveBeenCalledWith('t1');
});
it('renders a simple empty state',()=>{
 const ui=render(<PlantTasksTile {...actions} reminders={[]} activity={[]}/>);
 expect(ui.getByText('No tasks to display for this plant yet.')).toBeTruthy();
});
