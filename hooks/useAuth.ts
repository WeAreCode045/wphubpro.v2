
import { useQuery } from '@tanstack/react-query';
import { account } from '../services/appwrite';
import { Models } from 'appwrite';

const MOCK_USER: Models.User<Models.Preferences> = {
  $id: 'admin-user',
  name: 'Admin User',
  email: 'admin@theplatform.com',
  $createdAt: new Date().toISOString(),
  $updatedAt: new Date().toISOString(),
  registration: new Date().toISOString(),
  status: true,
  emailVerification: true,
  phoneVerification: false,
  prefs: {},
  phone: '',
  passwordUpdate: new Date().toISOString(),
  accessedAt: new Date().toISOString(),
};

const getCurrentUser = async (): Promise<Models.User<Models.Preferences> | null> => {
  try {
    // In a real application with a login system, this would be:
    // return await account.get();
    // For now, we return a mock authenticated user to allow other hooks to work.
    return Promise.resolve(MOCK_USER);
  } catch (error) {
    if ((error as any).code === 401) {
      return null; // Not logged in
    }
    throw error;
  }
};

export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 15, // 15 minutes
    retry: false,
  });
};