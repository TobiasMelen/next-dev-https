//@ts-check
import { NextRequest, NextResponse } from "next/server";

export function middleware(/** @type {NextRequest} */ request) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-middleware", "hello");
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
