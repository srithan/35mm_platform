import { useMobileUI } from "@35mm/mobile-ui";
import { useEffect, useState } from "react";
import { AppState, Image, View, type ImageSourcePropType } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useAuthPalette } from "../components/palette";

const POSTERS: readonly ImageSourcePropType[] = [
  require("../../../../assets/images/welcome/poster-1.jpg"),
  require("../../../../assets/images/welcome/poster-2.jpg"),
  require("../../../../assets/images/welcome/poster-3.jpg"),
  require("../../../../assets/images/welcome/poster-4.jpg"),
  require("../../../../assets/images/welcome/poster-5.jpg"),
  require("../../../../assets/images/welcome/poster-6.jpg"),
  require("../../../../assets/images/welcome/poster-7.jpg"),
  require("../../../../assets/images/welcome/poster-8.jpg"),
  require("../../../../assets/images/welcome/poster-9.jpg"),
];

function PosterColumn({
  column,
  width,
  height,
  active,
}: {
  readonly column: number;
  readonly width: number;
  readonly height: number;
  readonly active: boolean;
}) {
  const posterHeight = width * 1.5;
  const cycle = (posterHeight + 10) * 3;
  const phase = useSharedValue(0);
  const copies = Math.ceil(height / cycle) + 1;
  useEffect(() => {
    phase.value = 0;
    if (active)
      phase.value = withRepeat(
        withTiming(cycle, {
          duration: (cycle / (column === 1 ? 12 : 9)) * 1000,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    return () => cancelAnimation(phase);
  }, [active, column, cycle, phase]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -((phase.value + column * 38) % cycle) }],
  }));
  return (
    <Animated.View style={[{ width, gap: 10 }, style]}>
      {Array.from({ length: copies * 3 }, (_, row) => (
        <Image
          key={row}
          source={POSTERS[column * 3 + (row % 3)]!}
          resizeMode="cover"
          style={{ width, height: posterHeight, borderRadius: 20 }}
        />
      ))}
    </Animated.View>
  );
}

export function WelcomePosterWall() {
  const c = useAuthPalette();
  const { reduceMotion } = useMobileUI();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      testID="welcome-hero"
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      style={{ flex: 1, minHeight: 100, overflow: "hidden" }}
    >
      {size.width > 64 && size.height > 0 ? (
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 22 }}>
          {[0, 1, 2].map((column) => (
            <PosterColumn
              key={column}
              column={column}
              width={(size.width - 64) / 3}
              height={size.height}
              active={active && !reduceMotion}
            />
          ))}
        </View>
      ) : null}
      <View
        style={{
          position: "absolute",
          top: 0,
          width: "100%",
          height: Math.min(100, size.height * 0.25),
          experimental_backgroundImage: `linear-gradient(to bottom, ${c.paper}, ${c.paper}BF, ${c.paper}00)`,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          height: Math.min(150, size.height * 0.4),
          experimental_backgroundImage: `linear-gradient(to bottom, ${c.paper}00, ${c.paper}BF, ${c.paper})`,
        }}
      />
    </View>
  );
}
