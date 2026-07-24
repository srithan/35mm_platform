import { z } from "zod";

export const EMAIL_ADDRESS_MAX_LENGTH = 254;

export const emailAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address")
  .max(
    EMAIL_ADDRESS_MAX_LENGTH,
    `Email address must be ${EMAIL_ADDRESS_MAX_LENGTH} characters or fewer`,
  )
  .email("Enter a valid email address");
