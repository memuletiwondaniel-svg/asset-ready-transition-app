import React from 'react';
import { ScheduleSofMeetingModal } from './ScheduleSofMeetingModal';

/**
 * PAC meeting scheduler — thin wrapper over `ScheduleSofMeetingModal` in
 * `variant='pac'` mode. Attendee seats resolve from `vcr_pac_approvers`,
 * saves persist as `activity_type='pac_meeting'` in `vcr_key_activities`,
 * and task completion targets the `schedule_pac_meeting` action.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handoverPointId: string;
  projectId?: string;
  vcrCode?: string;
  vcrName?: string;
  projectPrefix?: string;
  taskId?: string;
}

export const SchedulePacMeetingModal: React.FC<Props> = (props) => {
  return <ScheduleSofMeetingModal {...props} variant="pac" />;
};
