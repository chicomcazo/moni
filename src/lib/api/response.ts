import { NextResponse } from "next/server";

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: { page?: number; limit?: number; total?: number };
}

export function apiSuccess<T>(
  data: T,
  meta?: ApiResponse<T>["meta"],
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data, error: null, meta });
}

export function apiError(
  error: string,
  status = 400,
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { success: false, data: null, error },
    { status },
  );
}
