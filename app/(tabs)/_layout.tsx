import { Tabs } from 'expo-router';
import { Bookmark, Home, Search, User } from 'lucide-react-native';
import { View } from 'react-native';

interface TabIconProps {
  focused: boolean;
}

const TabIcon = ({ focused, icon: Icon }: TabIconProps & { icon: any }) => {
  return (
    <View className="items-center justify-center">
      <Icon
        size={20}
        strokeWidth={2.5}
        color={focused ? '#AB8BFF' : '#A8B5DB'}
        style={{
          opacity: focused ? 1 : 0.6,
        }}
      />
    </View>
  );
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          height: 60,
          paddingVertical: 0,
          paddingTop: 0,
          paddingBottom: 0,
          marginTop: 10,

        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          height: 60,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 13, 35, 0.85)',
          marginHorizontal: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={Home} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={Search} />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={Bookmark} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={User} />
          ),
        }}
      />
    </Tabs>
  );
}
