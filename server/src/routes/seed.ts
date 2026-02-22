import { Router } from "express";
import type { Request, Response } from "express";
import pool from "../db.js";

const router = Router();

// POST /api/seed - 테스트 데이터 생성
// 프로필 5명 + 친구 관계 + 채팅방 + 메시지
router.post("/api/seed", async (_req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. 테스트 프로필 5명 생성
    const profiles = [
      { device_id: "seed-alice", display_name: "앨리스", status_message: "안녕하세요!" },
      { device_id: "seed-bob", display_name: "밥", status_message: "개발 중..." },
      { device_id: "seed-charlie", display_name: "찰리", status_message: "커피 마시는 중 ☕" },
      { device_id: "seed-diana", display_name: "다이애나", status_message: "" },
      { device_id: "seed-eve", display_name: "이브", status_message: "여행 가고 싶다" },
    ];

    const profileIds: string[] = [];
    for (const p of profiles) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO ego_profiles (device_id, display_name, status_message)
         VALUES ($1, $2, $3)
         ON CONFLICT (device_id) DO UPDATE SET display_name = $2
         RETURNING id`,
        [p.device_id, p.display_name, p.status_message]
      );
      profileIds.push(result.rows[0].id);
    }

    const [alice, bob, charlie, diana, eve] = profileIds;

    // 2. 친구 관계 (양방향)
    const friendships = [
      [alice, bob], [alice, charlie], [alice, diana], [alice, eve],
      [bob, charlie], [bob, diana],
      [charlie, eve],
    ];

    for (const [a, b] of friendships) {
      await client.query(
        `INSERT INTO ego_friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [a, b]
      );
      await client.query(
        `INSERT INTO ego_friendships (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [b, a]
      );
    }

    // 앨리스-밥 즐겨찾기
    await client.query(
      `UPDATE ego_friendships SET favorite = true WHERE user_id = $1 AND friend_id = $2`,
      [alice, bob]
    );

    // 3. 채팅방 생성
    // DM: 앨리스-밥
    const dm1 = await client.query<{ id: string }>(
      `INSERT INTO ego_chat_rooms (type, title) VALUES ('dm', NULL) RETURNING id`
    );
    const dmRoomId = dm1.rows[0].id;
    await client.query(
      `INSERT INTO ego_chat_room_members (room_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [dmRoomId, alice, bob]
    );

    // DM: 앨리스-찰리
    const dm2 = await client.query<{ id: string }>(
      `INSERT INTO ego_chat_rooms (type, title) VALUES ('dm', NULL) RETURNING id`
    );
    const dmRoom2Id = dm2.rows[0].id;
    await client.query(
      `INSERT INTO ego_chat_room_members (room_id, user_id) VALUES ($1, $2), ($1, $3)`,
      [dmRoom2Id, alice, charlie]
    );

    // 그룹: 앨리스+밥+찰리
    const group1 = await client.query<{ id: string }>(
      `INSERT INTO ego_chat_rooms (type, title) VALUES ('group', '프로젝트 팀') RETURNING id`
    );
    const groupRoomId = group1.rows[0].id;
    await client.query(
      `INSERT INTO ego_chat_room_members (room_id, user_id) VALUES ($1, $2), ($1, $3), ($1, $4)`,
      [groupRoomId, alice, bob, charlie]
    );

    // 4. 메시지 생성
    const now = Date.now();
    const msgs = [
      // 앨리스-밥 DM
      { room: dmRoomId, sender: alice, content: "밥, 안녕!", offset: -300000 },
      { room: dmRoomId, sender: bob, content: "앨리스! 오랜만이야", offset: -240000 },
      { room: dmRoomId, sender: alice, content: "오늘 점심 뭐 먹을까?", offset: -180000 },
      { room: dmRoomId, sender: bob, content: "김치찌개 어때?", offset: -120000 },
      { room: dmRoomId, sender: alice, content: "좋아! 12시에 보자", offset: -60000 },
      { room: dmRoomId, sender: bob, content: "👍", offset: -30000 },

      // 앨리스-찰리 DM
      { room: dmRoom2Id, sender: charlie, content: "앨리스 혹시 내일 시간 돼?", offset: -600000 },
      { room: dmRoom2Id, sender: alice, content: "내일 오후에 가능해!", offset: -500000 },
      { room: dmRoom2Id, sender: charlie, content: "그럼 카페에서 만나자", offset: -400000 },

      // 그룹 채팅
      { room: groupRoomId, sender: alice, content: "팀 회의 시작합시다", offset: -200000 },
      { room: groupRoomId, sender: bob, content: "네! 준비됐어요", offset: -150000 },
      { room: groupRoomId, sender: charlie, content: "저도요~", offset: -100000 },
      { room: groupRoomId, sender: alice, content: "이번 주 목표 공유할게요", offset: -50000 },
    ];

    for (const m of msgs) {
      const ts = new Date(now + m.offset).toISOString();
      await client.query(
        `INSERT INTO ego_messages (room_id, sender_id, content, created_at) VALUES ($1, $2, $3, $4)`,
        [m.room, m.sender, m.content, ts]
      );
    }

    // 5. 읽음 처리 (밥은 일부만 읽음 → 미읽음 발생)
    await client.query(
      `UPDATE ego_chat_room_members SET last_read_message_at = $1 WHERE room_id = $2 AND user_id = $3`,
      [new Date(now - 200000).toISOString(), dmRoomId, bob]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      data: {
        message: "테스트 데이터 생성 완료",
        profiles: profiles.map((p, i) => ({
          device_id: p.device_id,
          display_name: p.display_name,
          id: profileIds[i],
        })),
        rooms: [
          { type: "dm", title: "앨리스-밥", id: dmRoomId },
          { type: "dm", title: "앨리스-찰리", id: dmRoom2Id },
          { type: "group", title: "프로젝트 팀", id: groupRoomId },
        ],
        hint: "브라우저에서 device_id 'seed-alice'로 접속하려면 localStorage에 egotalk_device_id = 'seed-alice'를 설정하세요",
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/seed error:", err);
    res.status(500).json({ success: false, message: "Seed failed", code: "INTERNAL_ERROR" });
  } finally {
    client.release();
  }
});

export default router;
