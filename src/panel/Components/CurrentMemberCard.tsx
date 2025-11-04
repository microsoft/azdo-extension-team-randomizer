import * as React from 'react';
import { Card, CardContent } from 'azure-devops-ui/Card';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';
import { TitleSize } from 'azure-devops-ui/Header';
import { Persona, PersonaSize } from 'azure-devops-ui/Persona';
import { toPersonaIdentity } from '../../settings/memberUtils';
import { MemberViewModel } from '../../shared/types';

export interface CurrentMemberCardProps {
  member?: MemberViewModel | undefined;
  isLoading: boolean;
}

export const CurrentMemberCard: React.FC<CurrentMemberCardProps> = ({ member, isLoading }) => {
  return (
    <Card className='panel-card' titleProps={{ text: 'Current team member', size: TitleSize.Medium }}>
      <CardContent className='panel-card-content'>
        {isLoading ? (
          <Spinner size={SpinnerSize.medium} label='Updating current member...' />
        ) : member ? (
          <div className='panel-current-member'>
            <Persona identity={toPersonaIdentity(member)} size={PersonaSize.size40} />
            <div className='panel-current-member-text'>
              <span className='panel-current-member-name'>{member.displayName}</span>
              {member.uniqueName ? <span className='panel-current-member-unique'>{member.uniqueName}</span> : null}
            </div>
          </div>
        ) : (
          <div className='panel-card-placeholder'>NOT SELECTED YET</div>
        )}
      </CardContent>
    </Card>
  );
};
