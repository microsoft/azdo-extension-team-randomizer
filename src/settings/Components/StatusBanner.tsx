import * as React from 'react';
import { MessageCard, MessageCardSeverity } from 'azure-devops-ui/MessageCard';
import { StatusMessage } from '../types';

export interface StatusBannerProps {
  status?: StatusMessage;
  onDismiss: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ status, onDismiss }) => {
  if (!status) return null;
  // MessageCardSeverity does not expose a dedicated Success enum; map success to Info styling.
  const severity = status.type === 'error' ? MessageCardSeverity.Error : MessageCardSeverity.Info;
  return (
    <div className='status-banner'>
      <MessageCard severity={severity} onDismiss={onDismiss} className='settings-status-card'>
        {status.message}
      </MessageCard>
    </div>
  );
};
