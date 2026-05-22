import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-route";
import { hashPassword } from "@/lib/password";
import { getPrismaBase } from "@/lib/prisma-base";

export const dynamic = "force-dynamic";

export const POST = withApiRoute("auth.register.POST", async (req) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
  const password = typeof o.password === "string" ? o.password : "";
  const name = typeof o.name === "string" ? o.name.trim().slice(0, 120) : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "invalid_email", message: "Укажите корректный email." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "weak_password", message: "Пароль должен быть не короче 8 символов." },
      { status: 400 },
    );
  }

  const db = getPrismaBase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "email_taken", message: "Аккаунт с таким email уже существует." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  await db.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      passwordHash,
    },
  });

  return NextResponse.json({ ok: true });
});
