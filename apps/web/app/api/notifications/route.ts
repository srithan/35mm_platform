import { NextResponse } from "next/server";
import { NOTIFICATIONS_MOCK_DATA } from "@/features/notifications/data/notificationsData";

export async function GET() {
  return NextResponse.json(NOTIFICATIONS_MOCK_DATA);
}
