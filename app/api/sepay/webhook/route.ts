import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSepayWebhookSecret } from "@/lib/sepay/config";
import { isValidSepayPayload } from "@/lib/sepay/types";
import { processSepayWebhook } from "@/lib/sepay/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint nhận webhook Sepay khi có giao dịch chuyển khoản về STK MB EZWAY.
 *
 * Auth: HMAC-SHA256.
 *  - Sepay tính HMAC-SHA256 của raw body với secret key shared
 *  - Gửi signature qua header `X-SePay-Signature` (hex lowercase)
 *  - App verify: tính HMAC của raw body với SAME secret, compare timing-safe
 *
 * Behavior:
 *  - 401 sai/thiếu signature
 *  - 400 payload không hợp lệ
 *  - 200 cho mọi case xử lý xong (matched/unmatched/ignored/duplicate)
 *  - 500 chỉ khi crash thật (Sepay sẽ retry)
 */
export async function POST(request: Request) {
  // 1. Đọc raw body TRƯỚC khi parse — HMAC verify dựa trên bytes nguyên gốc.
  const rawBody = await request.text();

  // 2. Verify HMAC signature.
  let secret: string;
  try {
    secret = getSepayWebhookSecret();
  } catch {
    return NextResponse.json(
      { success: false, message: "Webhook chưa cấu hình secret." },
      { status: 500 }
    );
  }
  const sigHeader = (request.headers.get("x-sepay-signature") ?? "").trim();
  if (!sigHeader) {
    return NextResponse.json(
      { success: false, message: "Missing X-SePay-Signature header." },
      { status: 401 }
    );
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  let ok = false;
  try {
    ok =
      sigHeader.length === expected.length &&
      crypto.timingSafeEqual(
        Buffer.from(sigHeader, "hex"),
        Buffer.from(expected, "hex")
      );
  } catch {
    ok = false;
  }
  if (!ok) {
    return NextResponse.json(
      { success: false, message: "Invalid signature." },
      { status: 401 }
    );
  }

  // 3. Parse payload.
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, message: "Body không phải JSON hợp lệ." },
      { status: 400 }
    );
  }
  if (!isValidSepayPayload(body)) {
    return NextResponse.json(
      { success: false, message: "Payload thiếu trường bắt buộc." },
      { status: 400 }
    );
  }

  // 4. Process.
  try {
    const result = await processSepayWebhook(body);
    return NextResponse.json({
      success: true,
      id: result.id,
      status: result.status,
      alreadyProcessed: result.alreadyProcessed,
      paymentId: result.paymentId,
      orderId: result.orderId,
      message: result.message,
    });
  } catch (err) {
    console.error("[sepay/webhook]", err);
    return NextResponse.json(
      { success: false, message: "Lỗi xử lý nội bộ." },
      { status: 500 }
    );
  }
}
