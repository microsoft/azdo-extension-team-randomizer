import * as React from 'react';
import { MessageCard, MessageCardSeverity } from 'azure-devops-ui/MessageCard';
import { StatusMessage } from '../../settings/types';

export interface StatusBannerProps {
  status?: StatusMessage | undefined;
  onDismiss: () => void;
}

/** Custom comparison: compare status by type and message. */
function propsAreEqual(prev: StatusBannerProps, next: StatusBannerProps): boolean {
  return (
    prev.onDismiss === next.onDismiss &&
    prev.status?.type === next.status?.type &&
    prev.status?.message === next.status?.message
  );
}

const StatusBannerInner: React.FC<StatusBannerProps> = ({ status, onDismiss }) => {
  if (!status) return null;
  const severity = status.type === 'error' ? MessageCardSeverity.Error : MessageCardSeverity.Info;
  return (
    <MessageCard severity={severity} onDismiss={onDismiss} className='panel-status-banner'>
      {status.message}
    </MessageCard>
  );
};

export const StatusBanner = React.memo(StatusBannerInner, propsAreEqual);
