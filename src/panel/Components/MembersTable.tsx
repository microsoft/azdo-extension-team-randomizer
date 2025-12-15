import * as React from 'react';
import { Table, ITableColumn, TableCell } from 'azure-devops-ui/Table';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';
import { ZeroData } from 'azure-devops-ui/ZeroData';
import { Status, Statuses } from 'azure-devops-ui/Status';
import { Persona, PersonaSize } from 'azure-devops-ui/Persona';
import { Checkbox } from 'azure-devops-ui/Checkbox';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';
import { MemberViewModel } from '../../shared/types';
import { toPersonaIdentity } from '../../settings/memberUtils';

export interface MembersTableProps {
  members: MemberViewModel[];
  currentMemberId?: string;
  completedMemberIds: Set<string>;
  isTeamLoading: boolean;
  excludedMemberIds: Set<string>;
  onToggleInclusion: (memberId: string) => void;
}

/** Compare two Sets by size and contents. */
function setsAreEqual(a: Set<string>, b: Set<string>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

/** Custom comparison for MembersTable props to handle Set comparisons. */
function propsAreEqual(prev: MembersTableProps, next: MembersTableProps): boolean {
  return (
    prev.members === next.members &&
    prev.currentMemberId === next.currentMemberId &&
    prev.isTeamLoading === next.isTeamLoading &&
    prev.onToggleInclusion === next.onToggleInclusion &&
    setsAreEqual(prev.completedMemberIds, next.completedMemberIds) &&
    setsAreEqual(prev.excludedMemberIds, next.excludedMemberIds)
  );
}

const MembersTableInner: React.FC<MembersTableProps> = ({
  members,
  currentMemberId,
  completedMemberIds,
  isTeamLoading,
  excludedMemberIds,
  onToggleInclusion
}) => {
  // Include status-driving state in memo deps so Table receives a fresh provider when status changes.
  const itemProvider = React.useMemo(
    () => new ArrayItemProvider<MemberViewModel>(members),
    [members, currentMemberId, completedMemberIds, excludedMemberIds]
  );

  const columns = React.useMemo<ITableColumn<MemberViewModel>[]>(
    () => [
      {
        id: 'selection',
        name: '',
        width: 40,
        minWidth: 40,
        maxWidth: 40,
        renderCell: (_rowIndex, columnIndex, tableColumn, item) => {
          const isExcluded = excludedMemberIds.has(item.id);
          return (
            <TableCell key={`col-${columnIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
              <Checkbox checked={!isExcluded} onChange={() => onToggleInclusion(item.id)} />
            </TableCell>
          );
        }
      },
      {
        id: 'member',
        name: 'Member',
        width: -70,
        minWidth: 240,
        renderCell: (_rowIndex, columnIndex, tableColumn, item) => {
          const isExcluded = excludedMemberIds.has(item.id);
          const className = isExcluded ? 'member-name-cell member-excluded' : 'member-name-cell';
          return (
            <TableCell key={`col-${columnIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
              <div className={className}>
                <Persona identity={toPersonaIdentity(item)} size={PersonaSize.size40} />
                <div className='member-name-text'>
                  <div>{item.displayName}</div>
                </div>
              </div>
            </TableCell>
          );
        }
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
          const isExcluded = excludedMemberIds.has(item.id);
          const statusProps = isExcluded
            ? Statuses.Skipped
            : isCurrent
            ? Statuses.Running
            : isCompleted
            ? Statuses.Success
            : Statuses.Queued;
          const className = isExcluded ? 'member-excluded' : undefined;
          return (
            <TableCell key={`col-${columnIndex}`} columnIndex={columnIndex} tableColumn={tableColumn}>
              <div className={className}>
                <Status {...statusProps} />
              </div>
            </TableCell>
          );
        }
      }
    ],
    [completedMemberIds, currentMemberId, excludedMemberIds, onToggleInclusion]
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
  const tableKey = `${currentMemberId || 'none'}-${completedMemberIds.size}-${excludedMemberIds.size}`;
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

export const MembersTable = React.memo(MembersTableInner, propsAreEqual);
