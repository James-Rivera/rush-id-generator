import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const envUsername = process.env.AUTH_USERNAME?.trim();
    const envPassword = process.env.AUTH_PASSWORD;

    // No-DB mode: if env credentials are configured, authenticate against them.
    if (envUsername && envPassword) {
      const isValid = username === envUsername && password === envPassword;

      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { success: true, message: 'Login successful', user: { id: `env:${envUsername}`, username: envUsername } },
        { status: 200 }
      );
    }

    // DB mode fallback: Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      // Log failed login attempt
      await prisma.log.create({
        data: {
          action: 'login_failed',
          message: `Failed login attempt for username: ${username}`,
          metadata: { username },
        },
      });

      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // For now, compare plain text (in production, use bcrypt)
    // TODO: Hash passwords with bcrypt before storing
    const isValid = password === user.password;

    if (!isValid) {
      // Log failed login attempt
      await prisma.log.create({
        data: {
          userId: user.id,
          action: 'login_failed',
          message: 'Invalid password',
          metadata: { username },
        },
      });

      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Log successful login
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'login_success',
        message: 'User logged in successfully',
        metadata: { username },
      },
    });

    return NextResponse.json(
      { success: true, message: 'Login successful', user: { id: user.id, username: user.username } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
