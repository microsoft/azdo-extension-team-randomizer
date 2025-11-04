import * as React from 'react';
import { FormItem } from 'azure-devops-ui/FormItem';
import { Dropdown } from 'azure-devops-ui/Dropdown';
import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';
import { IListBoxItem } from 'azure-devops-ui/ListBox';
import { DropdownSelection } from 'azure-devops-ui/Utilities/DropdownSelection';
import { WebApiTeam } from 'azure-devops-extension-api/Core';

export interface TeamSelectorProps {
  teams: WebApiTeam[];
  selection: DropdownSelection;
  onSelect: (_e: React.SyntheticEvent<HTMLElement>, option: IListBoxItem<WebApiTeam> | undefined) => void;
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({ teams, selection, onSelect }) => {
  const teamItems = React.useMemo(
    () =>
      new ArrayItemProvider<IListBoxItem<WebApiTeam>>(
        teams.map((team) => ({
          id: team.id!,
          text: team.name || 'Unnamed team',
          data: team
        }))
      ),
    [teams]
  );

  return (
    <FormItem label='Team'>
      <Dropdown
        placeholder='Select a team'
        selection={selection}
        onSelect={onSelect}
        items={teamItems}
        className='panel-team-dropdown'
      />
    </FormItem>
  );
};
