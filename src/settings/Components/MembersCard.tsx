import * as React from 'react';
import { Card, CardContent } from 'azure-devops-ui/Card';
import { TitleSize } from 'azure-devops-ui/Header';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';
import { ZeroData } from 'azure-devops-ui/ZeroData';
import { Table } from 'azure-devops-ui/Table';
import { IHeaderCommandBarItem } from 'azure-devops-ui/HeaderCommandBar';
import { MemberViewModel } from '../../shared/types';

export interface MembersCardProps {
  selectedTeamId?: string;
  isTeamLoading: boolean;
  members: MemberViewModel[];
  selectionFingerprint: string;
  memberColumns: any;
  memberItemProvider: any;
  tableBehaviors: any[];
  commands: IHeaderCommandBarItem[];
}

export const MembersCard: React.FC<MembersCardProps> = ({
  selectedTeamId,
  isTeamLoading,
  members,
  selectionFingerprint,
  memberColumns,
  memberItemProvider,
  tableBehaviors,
  commands
}) => {
  if (!selectedTeamId) return null;

  const renderContent = () => {
    if (isTeamLoading) {
      return (
        <div className='members-table-container members-table-loading'>
          <Spinner size={SpinnerSize.large} label='Loading team members...' />
        </div>
      );
    }
    if (members.length === 0) {
      return (
        <div className='members-table-container members-table-empty'>
          <ZeroData
            imagePath={'../not-found.png'}
            imageAltText='No members available'
            primaryText='No members found for this team.'
            secondaryText='Add a custom member or choose another team.'
          />
        </div>
      );
    }
    return (
      <Table
        key={selectionFingerprint}
        ariaLabel='Team members'
        className='members-table'
        containerClassName='members-table-container'
        columns={memberColumns}
        itemProvider={memberItemProvider}
        behaviors={tableBehaviors}
        selectRowOnClick={false}
        showLines
      />
    );
  };

  return (
    <div className='members-section'>
      <Card
        className='settings-card member-card'
        titleProps={{ text: `Total: ${members.length}`, size: TitleSize.Medium }}
        headerCommandBarItems={commands}
      >
        <CardContent className='members-card-content'>{renderContent()}</CardContent>
      </Card>
    </div>
  );
};
