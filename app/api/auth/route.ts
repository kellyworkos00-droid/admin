import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getMainAdminEmail, isMainAdminIdentity } from "@/lib/admin-policy";

type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  sellerId?: string;
};

function buildAuthResponse(user: SessionUser) {
  const isMainAdmin = isMainAdminIdentity(user.email, user.role);
  const sellerId = user.role === "ADMIN" ? undefined : user.sellerId;

  const token = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      sellerId,
      isMainAdmin,
    })
  ).toString("base64");

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      sellerId,
      isMainAdmin,
    },
    token,
  });

  response.cookies.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}

/**
 * POST /api/auth/login
 * Login with email and password
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { seller: true },
    });

    const mainAdminEmail = getMainAdminEmail();
    const mainAdminPassword = process.env.MAIN_ADMIN_PASSWORD;
    const isMainAdminAttempt = normalizedEmail === mainAdminEmail;

    if (!user && isMainAdminAttempt && mainAdminPassword && password === mainAdminPassword) {
      const repairedAdmin = await prisma.user.upsert({
        where: { email: mainAdminEmail },
        update: {
          role: "ADMIN",
          fullName: "Main Admin",
          passwordHash: await bcrypt.hash(mainAdminPassword, 10),
          isActive: true,
        },
        create: {
          email: mainAdminEmail,
          role: "ADMIN",
          fullName: "Main Admin",
          passwordHash: await bcrypt.hash(mainAdminPassword, 10),
          isActive: true,
        },
      });

      return buildAuthResponse({
        id: repairedAdmin.id,
        fullName: repairedAdmin.fullName,
        email: repairedAdmin.email,
        role: repairedAdmin.role,
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive. Contact support." },
        { status: 403 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash || ""
    );

    if (!passwordMatch) {
      if (isMainAdminAttempt && mainAdminPassword && password === mainAdminPassword) {
        const repairedAdmin = await prisma.user.update({
          where: { id: user.id },
          data: {
            role: "ADMIN",
            fullName: user.fullName || "Main Admin",
            passwordHash: await bcrypt.hash(mainAdminPassword, 10),
            isActive: true,
          },
        });

        return buildAuthResponse({
          id: repairedAdmin.id,
          fullName: repairedAdmin.fullName,
          email: repairedAdmin.email,
          role: repairedAdmin.role,
        });
      }

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    return buildAuthResponse({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      sellerId: user.seller?.id,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
