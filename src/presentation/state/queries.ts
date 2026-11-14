import { useQuery } from '@tanstack/react-query';
import { backend, blocker } from './container';

export const keys = {
  profile: ['profile'] as const,
  tasks: ['tasks'] as const,
  shop: ['shop'] as const,
  blockedApps: ['blockedApps'] as const,
};

export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: backend.getProfile });
export const useTasks = () => useQuery({ queryKey: keys.tasks, queryFn: backend.listTasks });
export const useShop = () =>
  useQuery({
    queryKey: keys.shop,
    queryFn: async () => {
      const [items, owned] = await Promise.all([backend.listShopItems(), backend.listOwnedSkus()]);
      return { items, owned };
    },
  });

/** Apps currently blocked (names + icons on Android, empty on iOS). */
export const useBlockedApps = () =>
  useQuery({
    queryKey: keys.blockedApps,
    queryFn: async () => {
      const [apps, count] = await Promise.all([
        blocker.listBlockedApps(),
        blocker.getSelectedAppsCount(),
      ]);
      return { apps, count };
    },
  });
