import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Modal,
  Pressable,
  View,
  findNodeHandle,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets, useMobileUI } from "@35mm/mobile-ui";
import { AppText } from "../components/controls";
import { useAuthPalette } from "../components/palette";
import {
  validateSignupDateOfBirth,
  type SignupDateOfBirthInput,
} from "./validation";

export type DateOfBirthSegment = "month" | "day" | "year";
const FALLBACK_ORDER: readonly DateOfBirthSegment[] = ["month", "day", "year"];
export function dateOfBirthFieldOrder(
  locale?: string,
): readonly DateOfBirthSegment[] {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    const order = formatter
      .formatToParts(new Date(2001, 10, 22, 12))
      .map((part) => part.type)
      .filter(
        (part): part is DateOfBirthSegment =>
          part === "month" || part === "day" || part === "year",
      );
    return order.length === 3 && new Set(order).size === 3
      ? order
      : FALLBACK_ORDER;
  } catch {
    return FALLBACK_ORDER;
  }
}

function DateWheel({
  label,
  values,
  selected,
  onChange,
  rowHeight,
}: {
  readonly label: string;
  readonly values: readonly string[];
  readonly selected: number;
  readonly onChange: (index: number) => void;
  readonly rowHeight: number;
}) {
  const ref = useRef<FlatList<string>>(null);
  const c = useAuthPalette();
  const scrollIndex = useRef(selected);
  useEffect(() => {
    if (scrollIndex.current !== selected) {
      scrollIndex.current = selected;
      ref.current?.scrollToOffset({
        offset: selected * rowHeight,
        animated: false,
      });
    }
  }, [rowHeight, selected]);
  const selectOffset = (offset: number) => {
    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round(offset / rowHeight)),
    );
    if (scrollIndex.current === index) return;
    scrollIndex.current = index;
    onChange(index);
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        text: values[selected],
        min: 0,
        max: values.length - 1,
        now: selected,
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event) =>
        onChange(
          Math.min(
            values.length - 1,
            Math.max(
              0,
              selected +
                (event.nativeEvent.actionName === "increment" ? 1 : -1),
            ),
          ),
        )
      }
      style={{ flex: label === "Month" ? 1.7 : 1, height: rowHeight * 5 }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: rowHeight * 2,
          height: rowHeight,
          left: 0,
          right: 0,
          backgroundColor: c.field,
          borderRadius: 8,
        }}
      />
      <FlatList
        ref={ref}
        data={values}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID={`signup-dob-${label.toLowerCase()}-wheel`}
        keyExtractor={(item) => item}
        getItemLayout={(_data, index) => ({
          length: rowHeight,
          offset: rowHeight * index,
          index,
        })}
        initialScrollIndex={selected}
        initialNumToRender={7}
        maxToRenderPerBatch={7}
        windowSize={3}
        snapToInterval={rowHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingVertical: rowHeight * 2 }}
        scrollEventThrottle={16}
        onScroll={(event) => selectOffset(event.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(event) =>
          selectOffset(event.nativeEvent.contentOffset.y)
        }
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => onChange(index)}
            style={{
              height: rowHeight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText
              style={{
                fontSize: 20,
                color: index === selected ? c.ink : c.secondary,
              }}
              numberOfLines={1}
            >
              {item}
            </AppText>
          </Pressable>
        )}
      />
    </View>
  );
}

export function SignupDateOfBirthField({
  errorMessage,
  locale,
  onChange,
  value,
  today,
}: {
  readonly errorMessage?: string;
  readonly locale?: string;
  readonly onChange: (value: SignupDateOfBirthInput) => void;
  readonly onSubmit: () => void;
  readonly value: SignupDateOfBirthInput;
  readonly today?: string;
}) {
  const c = useAuthPalette();
  const { reduceMotion } = useMobileUI();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState({ year: 2000, month: 1, day: 1 });
  const trigger = useRef<View>(null);
  const done = useRef<View>(null);
  const now = new Date();
  const upper = today ? new Date(`${today}T12:00:00`) : now;
  const order = useMemo(() => dateOfBirthFieldOrder(locale), [locale]);
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { month: "long" }).format(
          new Date(2000, index, 1, 12),
        ),
      ),
    [locale],
  );
  const years = Array.from(
    { length: upper.getFullYear() - 1900 + 1 },
    (_, index) => String(1900 + index),
  );
  const monthLimit =
    draft.year === upper.getFullYear() ? upper.getMonth() + 1 : 12;
  const dayLimit = Math.min(
    new Date(draft.year, draft.month, 0).getDate(),
    draft.year === upper.getFullYear() && draft.month === upper.getMonth() + 1
      ? upper.getDate()
      : 31,
  );
  const change = (segment: DateOfBirthSegment, number: number) => {
    setDraft((previous) => {
      const next = { ...previous, [segment]: number };
      next.month = Math.min(
        next.month,
        next.year === upper.getFullYear() ? upper.getMonth() + 1 : 12,
      );
      next.day = Math.min(
        next.day,
        new Date(next.year, next.month, 0).getDate(),
        next.year === upper.getFullYear() && next.month === upper.getMonth() + 1
          ? upper.getDate()
          : 31,
      );
      return next;
    });
  };
  const validated = validateSignupDateOfBirth(value, today);
  const formatted = validated.value
    ? new Intl.DateTimeFormat(locale, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(
        new Date(
          Number(value.year),
          Number(value.month) - 1,
          Number(value.day),
          12,
        ),
      )
    : "Select date of birth";
  const close = () => {
    setVisible(false);
    const node = findNodeHandle(trigger.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  };
  return (
    <View testID="signup-dob-fields" style={{ gap: 8 }}>
      <Pressable
        ref={trigger}
        accessibilityRole="button"
        accessibilityLabel="Date of birth"
        accessibilityValue={{ text: formatted }}
        testID="signup-dob-open"
        onPress={() => {
          setDraft(
            validated.value
              ? {
                  year: Number(value.year),
                  month: Number(value.month),
                  day: Number(value.day),
                }
              : { year: 2000, month: 1, day: 1 },
          );
          setVisible(true);
        }}
        style={{
          minHeight: 66,
          paddingHorizontal: 22,
          paddingVertical: 16,
          backgroundColor: c.border,
          borderRadius: 8,
          justifyContent: "center",
        }}
      >
        <AppText style={{ fontSize: 24 }}>{formatted}</AppText>
      </Pressable>
      {errorMessage ? (
        <AppText
          color="destructive"
          role="metadata"
          accessibilityLiveRegion="polite"
        >
          {errorMessage}
        </AppText>
      ) : null}
      <Modal
        visible={visible}
        transparent
        animationType={reduceMotion ? "none" : "slide"}
        onRequestClose={close}
        onShow={() => {
          const node = findNodeHandle(done.current);
          if (node) AccessibilityInfo.setAccessibilityFocus(node);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "#00000060",
          }}
        >
          <Pressable
            accessibilityLabel="Dismiss date picker"
            accessibilityRole="button"
            onPress={close}
            style={{ flex: 1 }}
          />
          <View
            accessibilityViewIsModal
            onAccessibilityEscape={close}
            style={{
              backgroundColor: c.paper,
              paddingBottom: insets.bottom + 26,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
          >
            <View
              style={{
                backgroundColor: c.field,
                alignItems: "flex-end",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
            >
              <Pressable
                ref={done}
                accessibilityRole="button"
                accessibilityLabel="Done"
                testID="signup-dob-done"
                onPress={() => {
                  onChange({
                    year: String(draft.year),
                    month: String(draft.month).padStart(2, "0"),
                    day: String(draft.day).padStart(2, "0"),
                  });
                  close();
                }}
                style={{
                  minHeight: 56,
                  paddingHorizontal: 24,
                  justifyContent: "center",
                }}
              >
                <AppText style={{ fontSize: 18, fontWeight: "600" }}>
                  Done
                </AppText>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", paddingHorizontal: 18 }}>
              {order.map((segment) => (
                <DateWheel
                  key={segment}
                  label={segment[0]!.toUpperCase() + segment.slice(1)}
                  values={
                    segment === "month"
                      ? months.slice(0, monthLimit)
                      : segment === "year"
                        ? years
                        : Array.from({ length: dayLimit }, (_, index) =>
                            String(index + 1),
                          )
                  }
                  selected={
                    segment === "year" ? draft.year - 1900 : draft[segment] - 1
                  }
                  rowHeight={Math.max(44, 28 * fontScale)}
                  onChange={(index) =>
                    change(
                      segment,
                      segment === "year" ? index + 1900 : index + 1,
                    )
                  }
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
