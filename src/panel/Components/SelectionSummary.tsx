import * as React from 'react';

export interface SelectionSummaryProps {
  total: number;
  remaining: number;
  completed: number;
}

export const SelectionSummary: React.FC<SelectionSummaryProps> = ({ total, remaining, completed }) => (
  <div className='panel-summary'>
    <span>Total: {total}</span>
    <span>Remaining: {remaining}</span>
    <span>Completed: {completed}</span>
  </div>
);
