import { View, Text, StyleSheet } from "react-native";

export default function WebTestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WEB RENDERING WORKS</Text>
      <Text>If you can see this, React Native Web is rendering correctly.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#16a34a",
    marginBottom: 12,
  },
});
