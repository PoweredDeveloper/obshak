import { useState, useEffect } from 'react';

export interface UserProfile {
  name: string;
  groupId: string;
  groupName: string;
  institute: string;
  course: number;
  semester: number;
  onboarded: boolean;
}

const STORAGE_KEY = 'obshak_user';

function getStoredUser(): UserProfile | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function storeUser(user: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function useUserProfile() {
  const [user, setUser] = useState<UserProfile | null>(getStoredUser);

  useEffect(() => {
    if (user) storeUser(user);
  }, [user]);

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const createUser = (profile: UserProfile) => {
    setUser(profile);
    storeUser(profile);
  };

  const clearUser = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return { user, updateUser, createUser, clearUser };
}
