import Stack from "expo-router/stack";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[username]" />
      <Stack.Screen name="[username]/connections" />
      <Stack.Screen name="edit" />
    </Stack>
  );
}
