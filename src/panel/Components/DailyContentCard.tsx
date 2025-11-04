import * as React from 'react';
import { Card, CardContent } from 'azure-devops-ui/Card';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';
import { IHeaderCommandBarItem } from 'azure-devops-ui/HeaderCommandBar';
import { TitleSize } from 'azure-devops-ui/Header';

export interface DailyContentCardProps {
  title: string;
  value?: string; // Normalized display value
  isLoading: boolean;
  onRefresh: () => void;
  loadingLabel: string; // Spinner label while loading
  emptyMessage: string; // Placeholder text when no value present
  testId?: string;
  refreshLabel?: string; // Optional override for refresh aria label
  emptyLabel?: string; // Optional override for placeholder aria label
}

/** Generic card for daily rotating content (question, holiday, etc.). */
export const DailyContentCard: React.FC<DailyContentCardProps> = ({
  title,
  value,
  isLoading,
  onRefresh,
  loadingLabel,
  emptyMessage,
  testId,
  refreshLabel,
  emptyLabel
}) => {
  const commandItems = React.useMemo<IHeaderCommandBarItem[]>(
    () => [
      {
        id: `${title.toLowerCase().replace(/\s+/g, '-')}-refresh`,
        iconProps: { iconName: 'Refresh' },
        ariaLabel: isLoading ? loadingLabel : (refreshLabel ?? `Refresh ${title}`),
        disabled: isLoading,
        onActivate: () => onRefresh()
      }
    ],
    [isLoading, onRefresh, title, loadingLabel, refreshLabel]
  );

  return (
    <Card
      className='panel-card'
      titleProps={{ text: title, size: TitleSize.Medium }}
      headerCommandBarItems={commandItems}
      data-testid={testId}
    >
      <CardContent className='panel-card-content'>
        {isLoading ? (
          <Spinner size={SpinnerSize.medium} label={loadingLabel} />
        ) : value ? (
          <p className='panel-card-text' aria-live='polite'>
            {value}
          </p>
        ) : (
          <div className='panel-card-placeholder' aria-label={emptyLabel}>
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
