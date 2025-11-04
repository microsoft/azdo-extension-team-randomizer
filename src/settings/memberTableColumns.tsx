import * as React from 'react';
import { ITableColumn, TableCell, TableHeaderCell, ColumnJustification, SortOrder } from 'azure-devops-ui/Table';
import { Checkbox, TriStateCheckbox } from 'azure-devops-ui/Checkbox';
import { Persona, PersonaSize } from 'azure-devops-ui/Persona';
import { Button } from 'azure-devops-ui/Button';
import { MemberSourceType, MemberViewModel, MemberSource } from '../shared/types';
import { toPersonaIdentity } from './memberUtils';

export interface MemberTableColumnsOptions {
  selectedMemberIds: Set<string>;
  totalMemberCount: number;
  memberSorting: { columnId: string; sortOrder: SortOrder };
  onMemberToggle: (memberId: string, checked: boolean) => void;
  onRemoveMember: (memberId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function createMemberTableColumns(options: MemberTableColumnsOptions): ITableColumn<MemberViewModel>[] {
  const {
    selectedMemberIds,
    totalMemberCount,
    memberSorting,
    onMemberToggle,
    onRemoveMember,
    onSelectAll,
    onDeselectAll
  } = options;

  return [
    {
      id: 'selection',
      ariaLabel: 'Select member',
      width: 48,
      minWidth: 48,
      maxWidth: 48,
      readonly: true,
      renderHeaderCell: (columnIndex, tableColumn, focuszoneId, isFirstActionableHeader) => {
        const selectedCount = selectedMemberIds.size;
        const allSelected = totalMemberCount > 0 && selectedCount === totalMemberCount;
        const isIndeterminate = selectedCount > 0 && selectedCount < totalMemberCount;

        const toggleAll = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
          event.preventDefault();
          event.stopPropagation();

          if (totalMemberCount === 0) {
            return;
          }

          if (allSelected) {
            onDeselectAll();
          } else {
            onSelectAll();
          }
        };

        return (
          <TableHeaderCell<MemberViewModel>
            key={`col-header-${columnIndex}`}
            ariaLabel='Toggle all members'
            column={tableColumn}
            columnIndex={columnIndex}
            focuszoneId={focuszoneId}
            isFirstActionableHeader={isFirstActionableHeader}
          >
            <div
              className='member-checkbox-wrapper'
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <TriStateCheckbox
                ariaLabel='Toggle all members'
                checked={isIndeterminate ? undefined : allSelected}
                disabled={totalMemberCount === 0}
                focuszoneId={focuszoneId}
                onChange={toggleAll}
                triState
              />
            </div>
          </TableHeaderCell>
        );
      },
      renderCell: (_rowIndex, columnIndex, tableColumn, tableItem) => (
        <TableCell columnIndex={columnIndex} tableColumn={tableColumn} className='member-checkbox-cell'>
          <div
            className='member-checkbox-wrapper'
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Checkbox
              ariaLabel={`Include ${tableItem.displayName}`}
              checked={selectedMemberIds.has(tableItem.id)}
              onChange={(event, checked) => {
                const target = event?.currentTarget as HTMLInputElement | null;
                const isChecked = typeof checked === 'boolean' ? checked : !!target?.checked;
                onMemberToggle(tableItem.id, isChecked);
              }}
            />
          </div>
        </TableCell>
      )
    },
    {
      id: 'member',
      name: 'Member',
      width: -70,
      minWidth: 240,
      sortProps: {
        ariaLabelAscending: 'Sort by member ascending',
        ariaLabelDescending: 'Sort by member descending',
        sortOrder: memberSorting.columnId === 'member' ? memberSorting.sortOrder : undefined
      },
      renderCell: (_rowIndex, columnIndex, tableColumn, tableItem) => (
        <TableCell columnIndex={columnIndex} tableColumn={tableColumn}>
          <div className='member-name-cell'>
            <Persona identity={toPersonaIdentity(tableItem)} size={PersonaSize.size40} />
            <div className='member-name-text'>
              <div>{tableItem.displayName}</div>
              {tableItem.uniqueName && <div className='secondary-text'>{tableItem.uniqueName}</div>}
            </div>
          </div>
        </TableCell>
      )
    },
    {
      id: 'source',
      name: 'Source',
      width: 140,
      minWidth: 120,
      sortProps: {
        ariaLabelAscending: 'Sort by source ascending',
        ariaLabelDescending: 'Sort by source descending',
        sortOrder: memberSorting.columnId === 'source' ? memberSorting.sortOrder : undefined
      },
      renderCell: (_rowIndex, columnIndex, tableColumn, tableItem) => (
        <TableCell columnIndex={columnIndex} tableColumn={tableColumn}>
          <span className={'member-type-label member-type-label-' + tableItem.sourceType}>
            {MemberSource[tableItem.sourceType]}
          </span>
        </TableCell>
      )
    },
    {
      id: 'actions',
      ariaLabel: 'Member actions',
      width: 60,
      minWidth: 60,
      justification: ColumnJustification.Right,
      readonly: true,
      renderCell: (_rowIndex, columnIndex, tableColumn, tableItem) => (
        <TableCell columnIndex={columnIndex} tableColumn={tableColumn} className='member-actions-cell'>
          <div className='member-actions-content'>
            {tableItem.sourceType !== 'team' ? (
              <Button
                className='remove-member-button'
                iconProps={{ iconName: 'Delete' }}
                subtle
                ariaLabel={`Remove ${tableItem.displayName}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRemoveMember(tableItem.id);
                }}
              />
            ) : null}
          </div>
        </TableCell>
      )
    }
  ];
}
