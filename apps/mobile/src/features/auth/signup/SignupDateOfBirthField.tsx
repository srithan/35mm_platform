import { AppText, TextField } from "@35mm/mobile-ui";
import { useMemo, useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import type { SignupDateOfBirthInput } from "@/features/auth/signup/validation";

export type DateOfBirthSegment = "month" | "day" | "year";

const FALLBACK_ORDER: readonly DateOfBirthSegment[] = [
  "month",
  "day",
  "year",
];

const SEGMENT_CONFIG = {
  month: {
    autoComplete: "birthdate-month",
    label: "Month",
    maxLength: 2,
    placeholder: "MM",
    textContentType: "birthdateMonth",
  },
  day: {
    autoComplete: "birthdate-day",
    label: "Day",
    maxLength: 2,
    placeholder: "DD",
    textContentType: "birthdateDay",
  },
  year: {
    autoComplete: "birthdate-year",
    label: "Year",
    maxLength: 4,
    placeholder: "YYYY",
    textContentType: "birthdateYear",
  },
} as const;

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

export function SignupDateOfBirthField({
  errorMessage,
  locale,
  onChange,
  onSubmit,
  value,
}: {
  readonly errorMessage?: string;
  readonly locale?: string;
  readonly onChange: (value: SignupDateOfBirthInput) => void;
  readonly onSubmit: () => void;
  readonly value: SignupDateOfBirthInput;
}) {
  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const order = useMemo(() => dateOfBirthFieldOrder(locale), [locale]);
  const refs = {
    month: monthRef,
    day: dayRef,
    year: yearRef,
  } as const;

  const updateSegment = (
    segment: DateOfBirthSegment,
    input: string,
    nextSegment: DateOfBirthSegment | undefined,
  ) => {
    const config = SEGMENT_CONFIG[segment];
    const digits = input.replace(/\D/g, "").slice(0, config.maxLength);
    onChange({ ...value, [segment]: digits });
    if (digits.length === config.maxLength && nextSegment) {
      refs[nextSegment].current?.focus();
    }
  };

  return (
    <View
      accessible={false}
      accessibilityLabel={`Date of birth. Enter ${order
        .map((segment) => SEGMENT_CONFIG[segment].label.toLowerCase())
        .join(", then ")}.`}
      style={styles.container}
      testID="signup-dob-fields"
    >
      <View style={styles.fields}>
        {order.map((segment, index) => {
          const config = SEGMENT_CONFIG[segment];
          const nextSegment = order[index + 1];
          const isLast = index === order.length - 1;
          return (
            <TextField
              key={segment}
              inputRef={refs[segment]}
              accessibilityHint={`Date of birth ${config.label.toLowerCase()}`}
              autoComplete={config.autoComplete}
              autoCorrect={false}
              containerStyle={
                segment === "year" ? styles.yearField : styles.shortField
              }
              enterKeyHint={isLast ? "done" : "next"}
              inputMode="numeric"
              keyboardType="number-pad"
              label={config.label}
              maxLength={config.maxLength}
              onChangeText={(input) =>
                updateSegment(segment, input, nextSegment)
              }
              onSubmitEditing={
                isLast
                  ? onSubmit
                  : () => nextSegment && refs[nextSegment].current?.focus()
              }
              placeholder={config.placeholder}
              returnKeyType={isLast ? "done" : "next"}
              selectTextOnFocus
              testID={`signup-dob-${segment}`}
              textContentType={config.textContentType}
              value={value[segment]}
            />
          );
        })}
      </View>
      {errorMessage ? (
        <AppText
          accessibilityLiveRegion="polite"
          color="destructive"
          role="metadata"
        >
          {errorMessage}
        </AppText>
      ) : (
        <AppText color="textSecondary" role="metadata">
          Your date of birth stays private.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  fields: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  shortField: {
    flex: 1,
    minWidth: 72,
  },
  yearField: {
    flex: 1.35,
    minWidth: 96,
  },
});
