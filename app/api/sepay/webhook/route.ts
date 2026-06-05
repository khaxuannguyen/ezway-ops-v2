import { NextResponse } from "next/server";
import { getSepayWebhookApiKey } from "@/lib/sepay/config";
import { isValidSepayPayload } from "@/lib/sepay/types";
import { processSepayWebhook } from "@/lib/sepay/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint nhận webhook Sepay khi có giao dịch chuyển khoản về STK MB EZWAY.
 *
 * Auth: header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>`
 * (config cùng giá trị tại my.sepay.vn → Webhooks → API Key).
 *
 * Behavior:
 *  - 401 nếu sai/thiếu Apikey
 *  - 400 nếu payload không hợp lệ
 *  - 200 với { success: true } cho mọi trường hợp xử lý xong (matched,
 *    unmatched, ambiguous, ignored, duplicate). Sepay 200 = nhận thành công
 *  - 500 nếu DB/logic crash (Sepay retry theo cấu hình)
 */
export async function POST(request: Request) {
  // 1. Auth.
  const auth = request.headers.get("authorization") ?? "";
  let expected: string;
  try {
    expected = getSepayWebhookApiKey();
  } catch {
    return NextResponse.json(
      { success: false, message: "Webhook chưa cấu hình API key." },
      { status: 500 }
    );
  }
  const normalized = auth.replace(/^apikey\s+/i, "").trim();
  if (normalized !== expected) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  // 2. Parse payload.
  let body: unknown;
  try {
    body = await request.json();
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

  // 3. Process.
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
