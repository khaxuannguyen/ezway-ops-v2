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
  const timestamp = (request.headers.get("x-sepay-timestamp") ?? "").trim();
  if (!sigHeader) {
    return NextResponse.json(
      { success: false, message: "Missing X-SePay-Signature header." },
      { status: 401 }
    );
  }

  // Sepay format: `sha256={hex}` — strip prefix nếu có.
  const sigHex = sigHeader.replace(/^sha256=/i, "");

  // Build các candidate payload:
  //  A. Raw body (simple)
  //  B. timestamp + "." + raw body (Stripe-style anti-replay)
  // Sepay docs không rõ — support cả 2 + 2 biến thể secret để robust.
  const payloads = timestamp
    ? [rawBody, `${timestamp}.${rawBody}`]
    : [rawBody];
  const secretVariants = [secret, secret.replace(/^whsec_/, "")];

  const expectedHexs: string[] = [];
  for (const p of payloads) {
    for (const s of secretVariants) {
      expectedHexs.push(
        crypto.createHmac("sha256", s).update(p).digest("hex")
      );
    }
  }

  const ok = expectedHexs.some((expected) => {
    try {
      return (
        sigHex.length === expected.length &&
        crypto.timingSafeEqual(
          Buffer.from(sigHex, "hex"),
          Buffer.from(expected, "hex")
        )
      );
    } catch {
      return false;
    }
  });
  if (!ok) {
    console.warn("[sepay/webhook] signature mismatch", {
      received: sigHex.slice(0, 24) + "...",
      timestamp,
      expectedVariants: expectedHexs.map((h) => h.slice(0, 24) + "..."),
      bodyPreview: rawBody.slice(0, 200),
    });
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
