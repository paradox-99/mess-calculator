"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { raw, text, type FormState } from "@/lib/form";
import {
  fieldErrors,
  passwordChangeSchema,
  passwordProblems,
  profileSchema,
  signupSchema,
} from "@/lib/validation";

const BCRYPT_ROUNDS = 10;

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = text(formData, "username");
  const password = raw(formData, "password");
  const values = { username };

  if (!username || !password) {
    return {
      errors: {
        ...(username ? {} : { username: ["This field is required."] }),
        ...(password ? {} : { password: ["This field is required."] }),
      },
      values,
    };
  }

  try {
    await signIn("credentials", { username, password, redirectTo: "/groups" });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        errors: {
          __all__: [
            "Please enter a correct username and password. Note that both fields may be case-sensitive.",
          ],
        },
        values,
      };
    }
    // signIn signals its redirect by throwing; let that through.
    throw error;
  }
  return {};
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = {
    username: text(formData, "username"),
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    email: text(formData, "email"),
  };

  const parsed = signupSchema.safeParse({
    ...values,
    password1: raw(formData, "password1"),
    password2: raw(formData, "password2"),
  });
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values };
  }

  const { username, firstName, lastName, email, password1 } = parsed.data;

  const errors: Record<string, string[]> = {};
  if (await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } })) {
    errors.username = ["A user with that username already exists."];
  }
  if (await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })) {
    errors.email = ["A user with that email address already exists."];
  }
  if (Object.keys(errors).length > 0) {
    return { errors, values };
  }

  await prisma.user.create({
    data: {
      username,
      firstName,
      lastName,
      email,
      passwordHash: await bcrypt.hash(password1, BCRYPT_ROUNDS),
    },
  });

  // Django logged the new user straight in after signup.
  await signIn("credentials", { username, password: password1, redirectTo: "/groups" });
  return {};
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = {
    username: text(formData, "username"),
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    email: text(formData, "email"),
  };

  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), values };
  }
  const { username, firstName, lastName, email } = parsed.data;

  const errors: Record<string, string[]> = {};
  const usernameTaken = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" }, id: { not: user.id } },
  });
  if (usernameTaken) errors.username = ["A user with that username already exists."];

  const emailTaken = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, id: { not: user.id } },
  });
  if (emailTaken) errors.email = ["A user with that email address already exists."];

  if (Object.keys(errors).length > 0) return { errors, values };

  await prisma.user.update({
    where: { id: user.id },
    data: { username, firstName, lastName, email },
  });

  revalidatePath("/profile");
  redirect("/profile");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const parsed = passwordChangeSchema.safeParse({
    oldPassword: raw(formData, "oldPassword"),
    newPassword1: raw(formData, "newPassword1"),
    newPassword2: raw(formData, "newPassword2"),
  });
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }
  const { oldPassword, newPassword1 } = parsed.data;

  if (!(await bcrypt.compare(oldPassword, user.passwordHash))) {
    return {
      errors: { oldPassword: ["Your old password was entered incorrectly. Please enter it again."] },
    };
  }

  const problems = passwordProblems(newPassword1, user);
  if (problems.length > 0) {
    return { errors: { newPassword1: problems } };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword1, BCRYPT_ROUNDS) },
  });

  // The JWT session isn't derived from the password hash, so unlike Django's
  // update_session_auth_hash there's nothing to refresh here.
  revalidatePath("/profile");
  redirect("/profile");
}
