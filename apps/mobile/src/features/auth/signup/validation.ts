import {
  DATE_OF_BIRTH_LENGTH,
  parseDateOnly,
  validateDateOfBirth,
} from "@35mm/validators/date-of-birth";
import {
  EMAIL_ADDRESS_MAX_LENGTH,
  emailAddressSchema,
} from "@35mm/validators/email";
import { usernameSchema } from "@35mm/validators/username";

export const DISPLAY_NAME_MAX_LENGTH = 100;
export const USERNAME_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 8;
export const DATE_OF_BIRTH_MAX_LENGTH = DATE_OF_BIRTH_LENGTH;
export { EMAIL_ADDRESS_MAX_LENGTH };

export interface ValidatedSignupIdentity {
  readonly displayName: string;
  readonly username: string;
}

export interface SignupIdentityValidation {
  readonly displayNameError: string | null;
  readonly usernameError: string | null;
  readonly value: ValidatedSignupIdentity | null;
}

export interface SignupUsernameValidation {
  readonly error: string | null;
  readonly value: string | null;
}

export interface SignupEmailValidation {
  readonly error: string | null;
  readonly value: string | null;
}

export interface ValidatedSignupPassword {
  readonly password: string;
  readonly confirmation: string;
}

export interface SignupPasswordValidation {
  readonly passwordError: string | null;
  readonly confirmationError: string | null;
  readonly value: ValidatedSignupPassword | null;
}

export interface SignupDateOfBirthInput {
  readonly year: string;
  readonly month: string;
  readonly day: string;
}

export interface SignupDateOfBirthValidation {
  readonly error: string | null;
  readonly value: string | null;
}

export function validateSignupEmail(
  emailInput: string,
): SignupEmailValidation {
  const result = emailAddressSchema.safeParse(emailInput);
  return result.success
    ? { error: null, value: result.data }
    : {
        error:
          result.error.issues[0]?.message ?? "Enter a valid email address",
        value: null,
      };
}

export function validateSignupUsername(
  usernameInput: string,
): SignupUsernameValidation {
  const result = usernameSchema.safeParse(usernameInput.trim());
  return result.success
    ? { error: null, value: result.data }
    : {
        error:
          result.error.issues[0]?.message ?? "Enter a valid username",
        value: null,
      };
}

export function validateSignupIdentity(
  displayNameInput: string,
  usernameInput: string,
): SignupIdentityValidation {
  const displayName = displayNameInput.trim();
  const usernameResult = validateSignupUsername(usernameInput);
  const displayNameError =
    displayName.length < 2
      ? "Full name must be at least 2 characters"
      : displayName.length > DISPLAY_NAME_MAX_LENGTH
        ? `Full name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer`
        : null;

  return {
    displayNameError,
    usernameError: usernameResult.error,
    value:
      displayNameError === null && usernameResult.value !== null
        ? {
            displayName,
            username: usernameResult.value,
          }
        : null,
  };
}

export function validateSignupPassword(
  password: string,
  confirmation: string,
): SignupPasswordValidation {
  const passwordCharacterCount = Array.from(password).length;
  const passwordError =
    passwordCharacterCount === 0
      ? "Enter a password"
      : passwordCharacterCount < PASSWORD_MIN_LENGTH
        ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
        : null;
  const confirmationError =
    confirmation.length === 0
      ? "Confirm your password"
      : confirmation !== password
        ? "Passwords do not match"
        : null;

  return {
    passwordError,
    confirmationError,
    value:
      passwordError === null && confirmationError === null
        ? { password, confirmation }
        : null,
  };
}

function padDatePart(value: string): string {
  return value.padStart(2, "0");
}

export function signupDateOfBirthInputFromValue(
  value: string,
): SignupDateOfBirthInput {
  const parts = parseDateOnly(value);
  return parts
    ? {
        year: String(parts.year).padStart(4, "0"),
        month: padDatePart(String(parts.month)),
        day: padDatePart(String(parts.day)),
      }
    : { year: "", month: "", day: "" };
}

export function validateSignupDateOfBirth(
  input: SignupDateOfBirthInput,
  today?: string,
): SignupDateOfBirthValidation {
  const year = input.year.trim();
  const month = input.month.trim();
  const day = input.day.trim();
  if (!year && !month && !day) {
    return { error: "Enter your date of birth", value: null };
  }
  if (
    year.length !== 4 ||
    month.length < 1 ||
    month.length > 2 ||
    day.length < 1 ||
    day.length > 2
  ) {
    return { error: "Enter a complete date of birth", value: null };
  }

  const candidate = `${year}-${padDatePart(month)}-${padDatePart(day)}`;
  const validation = validateDateOfBirth(candidate, today);
  return validation.success
    ? { error: null, value: validation.value }
    : { error: validation.message, value: null };
}
