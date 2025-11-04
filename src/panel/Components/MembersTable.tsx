import * as React from 'react';
import { Table, ITableColumn, TableCell } from 'azure-devops-ui/Table';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';
import { ZeroData } from 'azure-devops-ui/ZeroData';
import { Status, Statuses } from 'azure-devops-ui/Status';
import { Persona, PersonaSize } from 'azure-devops-ui/Persona';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';
import { MemberViewModel } from '../../shared/types';
import { toPersonaIdentity } from '../../settings/memberUtils';

export interface MembersTableProps {
  members: MemberViewModel[];
  currentMemberId?: string;
  completedMemberIds: Set<string>;
  isTeamLoading: boolean;
}

export const MembersTable: React.FC<MembersTableProps> = ({
  members,
  currentMemberId,
  completedMemberIds,
  isTeamLoading
}) => {
  // Include status-driving state in memo deps so Table receives a fresh provider when status changes.
  const itemProvider = React.useMemo(
    () => new ArrayItemProvider<MemberViewModel>(members),
    [members, currentMemberId, completedMemberIds]
  );

  const columns = React.useMemo<ITableColumn<MemberViewModel>[]>(
    () => [
      {
        id: 'member',
        name: 'Member',
        width: -70,
        minWidth: 240,
        renderCell: (_rowIndex, columnIndex, tableColumn, item) => (
          <TableCell columnIndex={columnIndex} tableColumn={tableColumn}>
            <div className='member-name-cell'>
              <Persona identity={toPersonaIdentity(item)} size={PersonaSize.size40} />
              <div className='member-name-text'>
                <div>{item.displayName}</div>
              </div>
            </div>
          </TableCell>
        )
      },
      {
        id: 'status',
        name: 'Status',
        width: 160,
        minWidth: 140,
        readonly: true,
        renderCell: (_rowIndex, columnIndex, tableColumn, item) => {
          const isCurrent = currentMemberId === item.id;
          const isCompleted = completedMemberIds.has(item.id);
          const statusProps = isCurrent ? Statuses.Running : isCompleted ? Statuses.Success : Statuses.Queued;
          return (
            <TableCell columnIndex={columnIndex} tableColumn={tableColumn}>
              <Status {...statusProps} />
            </TableCell>
          );
        }
      }
    ],
    [completedMemberIds, currentMemberId]
  );

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
          secondaryText='Update the team roster in settings or choose another team.'
        />
      </div>
    );
  }

  // Force a remount when current or completed state changes to ensure Status cells repaint.
  const tableKey = `${currentMemberId || 'none'}-${completedMemberIds.size}`;
  return (
    <Table
      key={tableKey}
      ariaLabel='Team members'
      className='members-table'
      containerClassName='members-table-container'
      columns={columns}
      itemProvider={itemProvider}
      selectRowOnClick={false}
      showLines
    />
  );
};
