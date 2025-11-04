import * as React from 'react';
import { Card, CardContent } from 'azure-devops-ui/Card';
import { TitleSize } from 'azure-devops-ui/Header';
import { FormItem } from 'azure-devops-ui/FormItem';
import { IListBoxItem } from 'azure-devops-ui/ListBox';
import { IdentityPickerDropdown, IIdentity as IPickerIdentity } from 'azure-devops-ui/IdentityPicker';
import { Button } from 'azure-devops-ui/Button';
import { WebApiTeam } from 'azure-devops-extension-api/Core';
import { DropdownSelection } from 'azure-devops-ui/Utilities/DropdownSelection';
import { TeamSelector } from '../../panel/Components/TeamSelector';

export interface TeamConfigurationCardProps {
  teams: WebApiTeam[];
  selectedTeamId?: string;
  dropdownSelection: DropdownSelection; // shared selection state from settings hook
  onTeamSelect: (_event: React.SyntheticEvent<HTMLElement>, option: IListBoxItem<WebApiTeam> | undefined) => void;
  identityPickerProvider: any; // provider type from useIdentityPicker
  selectedIdentity?: IPickerIdentity;
  onIdentityChange: (identity?: IPickerIdentity) => boolean;
  onResolveIdentity: (input: string) => IPickerIdentity | undefined;
  onAddMember: () => void;
}

export const TeamConfigurationCard: React.FC<TeamConfigurationCardProps> = ({
  teams,
  selectedTeamId,
  dropdownSelection,
  onTeamSelect,
  identityPickerProvider,
  selectedIdentity,
  onIdentityChange,
  onResolveIdentity,
  onAddMember
}) => {
  // Custom suggestion renderer for custom identities
  const renderCustomSuggestion = React.useCallback(
    (identity: IPickerIdentity) => (
      <div className='custom-identity-suggestion'>
        <span className='custom-identity-suggestion-title'>Use custom value</span>
        <span className='custom-identity-suggestion-value bolt-text-secondary'>{identity.displayName}</span>
      </div>
    ),
    []
  );

  return (
    <Card className='settings-card' titleProps={{ text: 'Team configuration', size: TitleSize.Medium }}>
      <CardContent className='settings-card-content'>
        <TeamSelector teams={teams} selection={dropdownSelection} onSelect={onTeamSelect} />
        {selectedTeamId && (
          <FormItem label='Add member'>
            <div className='add-member-row'>
              <IdentityPickerDropdown
                pickerProvider={identityPickerProvider}
                value={selectedIdentity}
                onChange={onIdentityChange}
                resolveUnrecognizedIdentity={onResolveIdentity}
                placeholder='Search for a member'
                ariaLabel='Search for a member'
                className='identity-picker-field'
                noResultsFoundText='No matching identities. Press Enter to use a custom value.'
                renderCustomIdentitySuggestion={renderCustomSuggestion}
              />
              <Button
                iconProps={{ iconName: 'AddFriend' }}
                ariaLabel='Add'
                onClick={onAddMember}
                disabled={!selectedIdentity}
              />
            </div>
          </FormItem>
        )}
      </CardContent>
    </Card>
  );
};
