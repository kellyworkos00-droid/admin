import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getMainAdminEmail, isMainAdminIdentity } from "@/lib/admin-policy";

/**
 * POST /api/auth/signup
 * Register new seller account
 */
export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, passwordConfirm, businessName, businessType, phone } = 
      await req.json();

    // Validation
    if (!fullName || !email || !password || !businessName || !businessType || !phone) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (email.toLowerCase() === getMainAdminEmail()) {
      return NextResponse.json(
        { error: "This email is reserved for the main admin account" },
        { status: 403 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and seller profile
    const user = await prisma.user.create({
      data: {
        fullName,
        email: email.toLowerCase(),
        passwordHash,
        role: "CUSTOMER", // Sellers are CUSTOMER role, they get seller profile
        seller: {
          create: {
            businessName,
            businessType,
            phone,
            email: email.toLowerCase(),
            status: "PENDING", // Admin must verify
          },
        },
      },
      include: { seller: true },
    });

    const isMainAdmin = isMainAdminIdentity(user.email, user.role);

    // Create session token
    const token = Buffer.from(
      JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        sellerId: user.seller?.id,
        isMainAdmin,
      })
    ).toString("base64");

    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully. Awaiting admin verification.",
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          sellerId: user.seller?.id,
          isMainAdmin,
        },
        token,
      },
      { status: 201 }
    );

    // Set secure httpOnly cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
