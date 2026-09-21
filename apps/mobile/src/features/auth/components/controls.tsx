import {
  AppIcon,
  Screen as BaseScreen,
  type AppTextProps as BaseAppTextProps,
  type ButtonProps as BaseButtonProps,
  type TextFieldProps as BaseTextFieldProps,
  type PasswordFieldProps as BasePasswordFieldProps,
  type ScreenProps,
  type InlineNoticeProps as BaseInlineNoticeProps,
} from "@35mm/mobile-ui";
import type { Ref } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { ArrowRight } from "lucide-react-native";
import { useAuthPalette } from "./palette";

type AppTextProps = Omit<BaseAppTextProps, "style"> & {
  readonly style?: StyleProp<TextStyle>;
};
type ButtonProps = Omit<BaseButtonProps, "style"> & {
  readonly style?: StyleProp<ViewStyle>;
};
type TextFieldProps = Omit<BaseTextFieldProps, "style" | "containerStyle"> & {
  readonly style?: StyleProp<TextStyle>;
  readonly containerStyle?: StyleProp<ViewStyle>;
};
type PasswordFieldProps = Omit<
  BasePasswordFieldProps,
  "style" | "containerStyle"
> & {
  readonly style?: StyleProp<TextStyle>;
  readonly containerStyle?: StyleProp<ViewStyle>;
};
type InlineNoticeProps = Omit<BaseInlineNoticeProps, "style"> & {
  readonly style?: StyleProp<ViewStyle>;
};

export function Screen({ style, ...props }: ScreenProps) {
  const colors = useAuthPalette();
  return (
    <BaseScreen {...props} style={[{ backgroundColor: colors.paper }, style]} />
  );
}

export function AppText({
  role = "body",
  color = "text",
  align,
  style,
  ...props
}: AppTextProps) {
  const c = useAuthPalette();
  const size =
    role === "display"
      ? 34
      : role === "screenTitle"
        ? 28
        : role === "metadata"
          ? 13
          : role === "bodyLarge"
            ? 16
            : 15;
  return (
    <Text
      {...props}
      style={[
        {
          color:
            color === "destructive"
              ? c.error
              : color === "socialAccent"
                ? c.link
                : color === "success"
                  ? c.success
                  : color === "text"
                    ? c.ink
                    : c.secondary,
          fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
          fontSize: size,
          lineHeight: size * 1.22,
          fontWeight:
            role === "display" || role === "screenTitle"
              ? "700"
              : role === "authorName" || role === "rowLabelCompact"
                ? "600"
                : "400",
          textAlign: align,
        },
        style,
      ]}
    />
  );
}

export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled = false,
  fullWidth,
  style,
  icon: _icon,
  iconPosition: _iconPosition,
  size: _size,
  ...props
}: ButtonProps) {
  const c = useAuthPalette();
  const primary = variant === "primary";
  const foreground = primary ? c.paper : variant === "danger" ? c.error : c.ink;
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          alignSelf: fullWidth ? "stretch" : "center",
          minHeight: primary ? 62 : 44,
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          backgroundColor: primary
            ? c.ink
            : variant === "secondary"
              ? c.field
              : "transparent",
          opacity: disabled || loading ? 0.58 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={foreground} /> : null}
      <AppText
        style={{
          color: foreground,
          fontSize: 16,
          fontWeight: "600",
          flexShrink: 1,
        }}
      >
        {label}
      </AppText>
      {primary && !loading ? (
        <ArrowRight color={foreground} size={19} accessible={false} />
      ) : null}
    </Pressable>
  );
}

export function TextField({
  label,
  message,
  errorMessage,
  leadingIcon: _leadingIcon,
  trailing,
  inputRef,
  editable = true,
  style,
  containerStyle,
  showLabel = false,
  prefix,
  ...props
}: TextFieldProps & {
  readonly showLabel?: boolean;
  readonly prefix?: string;
}) {
  const c = useAuthPalette();
  return (
    <View style={[{ gap: 9 }, containerStyle]}>
      {showLabel ? (
        <AppText style={{ fontSize: 17, fontWeight: "600" }}>{label}</AppText>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 58,
          borderRadius: 8,
          paddingHorizontal: 18,
          backgroundColor: c.field,
          borderColor: errorMessage ? c.error : c.border,
          borderWidth: StyleSheet.hairlineWidth,
          opacity: editable ? 1 : 0.58,
        }}
      >
        {prefix ? (
          <AppText color="textSecondary" style={{ fontWeight: "600" }}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          {...props}
          ref={inputRef as Ref<TextInput>}
          accessibilityLabel={props.accessibilityLabel ?? label}
          editable={editable}
          placeholder={props.placeholder ?? label}
          placeholderTextColor={c.secondary}
          selectionColor={c.link}
          style={[
            {
              flex: 1,
              minWidth: 0,
              minHeight: 58,
              paddingVertical: 14,
              color: c.ink,
              fontSize: 16,
              fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
            },
            style,
          ]}
        />
        {trailing}
      </View>
      {errorMessage || message ? (
        <AppText
          selectable
          accessibilityLiveRegion={errorMessage ? "polite" : "none"}
          role="metadata"
          color={errorMessage ? "destructive" : "textSecondary"}
        >
          {errorMessage ?? message}
        </AppText>
      ) : null}
    </View>
  );
}

export function PasswordField({
  label,
  visible,
  onVisibilityChange,
  ...props
}: PasswordFieldProps & { readonly showLabel?: boolean }) {
  const c = useAuthPalette();
  return (
    <TextField
      {...props}
      label={label}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          accessibilityState={{ selected: visible }}
          disabled={props.editable === false}
          onPress={() => onVisibilityChange(!visible)}
          testID={`${props.testID ?? "password-field"}-visibility`}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppIcon
            name={visible ? "eye-off" : "eye"}
            color={c.secondary}
            size={20}
          />
        </Pressable>
      }
    />
  );
}

export function InlineNotice({
  message,
  title,
  tone = "info",
  style,
  ...props
}: InlineNoticeProps) {
  const c = useAuthPalette();
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      {...props}
      style={[
        { padding: 14, borderRadius: 8, backgroundColor: c.field, gap: 6 },
        style,
      ]}
    >
      {title ? <AppText style={{ fontWeight: "600" }}>{title}</AppText> : null}
      <AppText
        selectable
        color={tone === "error" ? "destructive" : "textSecondary"}
        role="metadata"
      >
        {message}
      </AppText>
    </View>
  );
}
