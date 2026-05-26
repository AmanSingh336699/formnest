import { api } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ApiEnvelope, User } from '../../types';

export const usersApi = {
  async me(): Promise<User> {
    const { data } = await api.get<ApiEnvelope<User>>(ENDPOINTS.me);
    if (!data.data) throw new Error('Failed to fetch user');
    return data.data;
  },

  async updateMe(input: Partial<Pick<User, 'name' | 'locale' | 'timezone' | 'avatarUrl'>>): Promise<User> {
    const { data } = await api.patch<ApiEnvelope<User>>(ENDPOINTS.me, input);
    if (!data.data) throw new Error('Update profile failed');
    return data.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post(ENDPOINTS.changePassword, { currentPassword, newPassword });
  },

  async deleteMe(): Promise<void> {
    await api.delete(ENDPOINTS.me);
  },
};
