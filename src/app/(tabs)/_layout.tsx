import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HomeTabIcon,
  ProfileTabIcon,
  ShopTabIcon,
  StatsTabIcon,
} from '../../presentation/components/art';
import { TabBounce } from '../../presentation/motion';
import { colors } from '../../presentation/ui';
import { strings } from '../../strings/pt-BR';

const INACTIVE = '#7C8B80';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: colors.tinta,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: { fontFamily: 'Nunito_700Bold', fontSize: 12 },
        tabBarStyle: {
          backgroundColor: colors.folha,
          borderTopColor: colors.fio,
          height: 68 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : insets.bottom + 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: strings.tabs.home,
          tabBarIcon: ({ color, focused }) => (
            <TabBounce focused={focused}>
              <HomeTabIcon color={color} />
            </TabBounce>
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: strings.tabs.shop,
          tabBarIcon: ({ color, focused }) => (
            <TabBounce focused={focused}>
              <ShopTabIcon color={color} />
            </TabBounce>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: strings.tabs.stats,
          tabBarIcon: ({ color, focused }) => (
            <TabBounce focused={focused}>
              <StatsTabIcon color={color} />
            </TabBounce>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: strings.tabs.profile,
          tabBarIcon: ({ color, focused }) => (
            <TabBounce focused={focused}>
              <ProfileTabIcon color={color} />
            </TabBounce>
          ),
        }}
      />
    </Tabs>
  );
}
