import { z } from "zod";

/**
 * Form schemas and the password rules.
 *
 * The password checks mirror Django's four AUTH_PASSWORD_VALIDATORS
 * (similarity to user attributes, minimum length, common passwords, and
 * all-numeric) so accounts created here hold to the same standard the Django
 * version enforced.
 */

// Django's UsernameValidator: letters, digits and @/./+/-/_ only.
export const usernameSchema = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .max(150, "Ensure this value has at most 150 characters.")
  .regex(
    /^[\w.@+-]+$/,
    "Enter a valid username. This value may contain only letters, numbers, and @/./+/-/_ characters.",
  );

export const emailSchema = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .email("Enter a valid email address.");

const optionalName = z.string().trim().max(150).default("");

// The head of Django's common-password list. Not the full 20k file, but it
// catches what people actually type on a signup form.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "123456", "12345678", "123456789",
  "1234567890", "qwerty", "qwerty123", "abc123", "111111", "123123", "iloveyou",
  "admin", "welcome", "monkey", "login", "letmein", "dragon", "sunshine",
  "princess", "football", "baseball", "master", "shadow", "superman", "trustno1",
  "passw0rd", "starwars", "whatever", "changeme", "secret",
]);

/** Rough stand-in for Django's SequenceMatcher-based similarity check. */
function tooSimilar(password: string, attribute: string): boolean {
  const value = attribute.trim().toLowerCase();
  if (value.length < 3) return false;
  const lowered = password.toLowerCase();
  return lowered.includes(value) || value.includes(lowered);
}

export function passwordProblems(
  password: string,
  attributes: { username?: string; email?: string; firstName?: string; lastName?: string } = {},
): string[] {
  const problems: string[] = [];

  if (password.length < 8) {
    problems.push("This password is too short. It must contain at least 8 characters.");
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    problems.push("This password is too common.");
  }
  if (/^\d+$/.test(password)) {
    problems.push("This password is entirely numeric.");
  }

  const candidates = [
    attributes.username,
    attributes.firstName,
    attributes.lastName,
    attributes.email,
    attributes.email?.split("@")[0],
  ].filter((value): value is string => Boolean(value));

  if (candidates.some((value) => tooSimilar(password, value))) {
    problems.push("The password is too similar to your other personal information.");
  }

  return problems;
}

export const signupSchema = z
  .object({
    username: usernameSchema,
    firstName: optionalName,
    lastName: optionalName,
    email: emailSchema,
    password1: z.string().min(1, "This field is required."),
    password2: z.string().min(1, "This field is required."),
  })
  .superRefine((data, ctx) => {
    if (data.password1 !== data.password2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password2"],
        message: "The two password fields didn't match.",
      });
      return;
    }
    for (const message of passwordProblems(data.password1, data)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password1"], message });
    }
  });

export const loginSchema = z.object({
  username: z.string().trim().min(1, "This field is required."),
  password: z.string().min(1, "This field is required."),
});

export const profileSchema = z.object({
  username: usernameSchema,
  firstName: optionalName,
  lastName: optionalName,
  email: emailSchema,
});

export const passwordChangeSchema = z
  .object({
    oldPassword: z.string().min(1, "This field is required."),
    newPassword1: z.string().min(1, "This field is required."),
    newPassword2: z.string().min(1, "This field is required."),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword1 !== data.newPassword2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword2"],
        message: "The two password fields didn't match.",
      });
    }
  });

export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, "This field is required.").max(100),
});

export const groupJoinSchema = z.object({
  inviteCode: z.string().trim().min(1, "This field is required.").max(12),
});

export const memberUsernameSchema = z.object({
  username: z.string().trim().min(1, "This field is required.").max(150),
});

export const transferLeadershipSchema = z.object({
  memberId: z.coerce.number().int().positive("Select a member."),
});

// Matches Django's DecimalField(max_digits=8, decimal_places=2, min_value=0).
const costSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? "0" : value))
  .pipe(
    z
      .string()
      .regex(/^\d{1,6}(\.\d{1,2})?$/, "Enter a number with at most 2 decimal places."),
  );

export const dailyEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  lunch: z.coerce.boolean().default(false),
  dinner: z.coerce.boolean().default(false),
  cost: costSchema,
  maidAbsentLunch: z.coerce.boolean().default(false),
  maidAbsentDinner: z.coerce.boolean().default(false),
});

/** A required money amount — a utility bill can't be left blank. */
export const utilityAmountSchema = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .regex(/^\d{1,6}(\.\d{1,2})?$/, "Enter a number with at most 2 decimal places.");

export const utilityTypeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "This field is required.")
      .max(60, "Keep the name under 60 characters."),
    // "same": one figure for everyone. "individual": one per member, which the
    // action validates separately because the member list comes from the DB.
    split: z.enum(["same", "individual"]),
    amount: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    if (data.split !== "same") return;
    const result = utilityAmountSchema.safeParse(data.amount);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: result.error.issues[0]?.message ?? "Enter a valid amount.",
      });
    }
  });

export const extraMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  mealType: z.enum(["lunch", "dinner"]),
  quantity: z
    .string()
    .trim()
    .regex(/^\d(\.\d)?$/, "Enter a number between 0.1 and 9.9.")
    .refine((value) => Number(value) >= 0.1, "Ensure this value is greater than or equal to 0.1.")
    .refine((value) => Number(value) <= 9.9, "Ensure this value is less than or equal to 9.9."),
});

/** Collapses a ZodError into the `{ field: [messages] }` shape the forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "__all__";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}
