import webpush from "web-push";
import pool from "../db.js";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:egotalk@example.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushToRoom(
  roomId: string,
  senderProfileId: string,
  message: { content: string; sender_name: string | null }
): Promise<void> {
  try {
    // Get all push subscriptions for room members except sender and muted members
    const result = await pool.query<PushSubscriptionRow>(
      `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth
       FROM ego_push_subscriptions ps
       JOIN ego_chat_room_members crm ON crm.user_id = ps.user_id
       WHERE crm.room_id = $1
         AND ps.user_id != $2
         AND crm.mute = false`,
      [roomId, senderProfileId]
    );

    if (result.rows.length === 0) return;

    const payload = JSON.stringify({
      title: message.sender_name || "EgoTalk",
      body: message.content,
      data: { roomId },
    });

    const expiredIds: string[] = [];

    await Promise.allSettled(
      result.rows.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            expiredIds.push(sub.id);
          } else {
            console.error("Push send error:", err);
          }
        }
      })
    );

    // Remove expired subscriptions
    if (expiredIds.length > 0) {
      await pool.query(
        `DELETE FROM ego_push_subscriptions WHERE id = ANY($1)`,
        [expiredIds]
      );
    }
  } catch (err) {
    console.error("sendPushToRoom error:", err);
  }
}
