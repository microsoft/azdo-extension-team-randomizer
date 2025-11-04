import * as React from 'react';
import { MessageCard, MessageCardSeverity } from 'azure-devops-ui/MessageCard';
import { StatusMessage } from '../../settings/types';

export interface StatusBannerProps {
  status?: StatusMessage | undefined;
  onDismiss: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ status, onDismiss }) => {
  if (!status) return null;
  const severity = status.type === 'error' ? MessageCardSeverity.Error : MessageCardSeverity.Info;
  return (
    <MessageCard severity={severity} onDismiss={onDismiss} className='panel-status-banner'>
      {status.message}
    </MessageCard>
  );
};
