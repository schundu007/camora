import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { PrepScreen } from '@/screens/PrepScreen';
import { PracticeScreen } from '@/screens/PracticeScreen';
import { AudioInterviewScreen } from '@/screens/AudioInterviewScreen';
import { AccountScreen } from '@/screens/AccountScreen';
import { colors } from '@/theme/colors';

const Tabs = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
    primary: colors.navy,
    notification: colors.navy,
  },
};

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{
      fontSize: 11,
      fontWeight: '600',
      color: focused ? colors.navySoft : colors.textFaint,
      marginBottom: 4,
    }}>{label}</Text>
  );
}

function AuthedTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="Prep" component={PrepScreen} options={{ tabBarIcon: ({ focused }) => <TabLabel label="Prep" focused={focused} /> }} />
      <Tabs.Screen name="Practice" component={PracticeScreen} options={{ tabBarIcon: ({ focused }) => <TabLabel label="Practice" focused={focused} /> }} />
      <Tabs.Screen name="Live" component={AudioInterviewScreen} options={{ tabBarIcon: ({ focused }) => <TabLabel label="Live" focused={focused} /> }} />
      <Tabs.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: ({ focused }) => <TabLabel label="Account" focused={focused} /> }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.navySoft} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {isAuthenticated ? <AuthedTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}
