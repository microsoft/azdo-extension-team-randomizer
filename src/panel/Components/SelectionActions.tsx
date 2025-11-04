import * as React from 'react';
import { Button } from 'azure-devops-ui/Button';
import { ButtonGroup } from 'azure-devops-ui/ButtonGroup';

export interface SelectionActionsProps {
  onPrevious: () => void;
  onRandomize: () => void;
  onReset: () => void;
  disablePrevious: boolean;
  disableRandomize: boolean;
  disableReset: boolean;
  isSelectionCycleComplete: boolean;
}

export const SelectionActions: React.FC<SelectionActionsProps> = ({
  onPrevious,
  onRandomize,
  onReset,
  disablePrevious,
  disableRandomize,
  disableReset,
  isSelectionCycleComplete
}) => (
  <ButtonGroup className='panel-actions'>
    <Button
      iconProps={{ iconName: 'Previous' }}
      ariaLabel='Select Previous'
      disabled={disablePrevious}
      onClick={onPrevious}
    />
    <Button
      primary={!isSelectionCycleComplete}
      iconProps={{ iconName: 'Next' }}
      ariaLabel='Select Next'
      disabled={disableRandomize}
      onClick={onRandomize}
    />
    <Button
      primary={isSelectionCycleComplete}
      iconProps={{ iconName: 'Refresh' }}
      ariaLabel='Start Over'
      disabled={disableReset}
      onClick={onReset}
    />
  </ButtonGroup>
);
