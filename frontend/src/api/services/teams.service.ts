import { api } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ApiEnvelope, TeamRow, TeamMemberRow } from '../../types';

export const teamsApi = {
  async list(): Promise<TeamRow[]> {
    const { data } = await api.get<ApiEnvelope<TeamRow[]>>(ENDPOINTS.teams);
    return data.data ?? [];
  },
  async create(name: string): Promise<TeamRow> {
    const { data } = await api.post<ApiEnvelope<TeamRow>>(ENDPOINTS.teams, { name });
    if (!data.data) throw new Error('Create team failed');
    return data.data;
  },
  async members(id: string): Promise<TeamMemberRow[]> {
    const { data } = await api.get<ApiEnvelope<TeamMemberRow[]>>(ENDPOINTS.teamMembers(id));
    return data.data ?? [];
  },
  async invite(id: string, email: string): Promise<TeamMemberRow> {
    const { data } = await api.post<ApiEnvelope<TeamMemberRow>>(ENDPOINTS.invite(id), { email });
    if (!data.data) throw new Error('Invite failed');
    return data.data;
  },
  async accept(token: string): Promise<{ teamId: string }> {
    const { data } = await api.post<ApiEnvelope<{ teamId: string }>>(ENDPOINTS.acceptTeam, { token });
    if (!data.data) throw new Error('Accept failed');
    return data.data;
  },
  async removeMember(teamId: string, userId: string): Promise<void> {
    await api.delete(ENDPOINTS.removeMember(teamId, userId));
  },
};
