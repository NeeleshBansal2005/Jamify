import { expect, test } from "@playwright/test";
import {
  createRoom,
  createTwoUsers,
  disposeUsers,
  joinRoom,
  openRoom,
  readRoom
} from "./helpers/jamify.js";

test("room creation and access: its host can open a newly created room", async ({
  browser
}) => {
  const users = await createTwoUsers(browser);

  try {
    const room = await createRoom(users.userA, `E2E host room ${Date.now()}`);

    await openRoom(users.userA, room);

    const storedRoom = await readRoom(users.userA, room._id);
    expect(String(storedRoom.host)).toBe(String(users.userA.user._id));
    expect(storedRoom.members.map((member) => String(member.user))).toContain(
      String(users.userA.user._id)
    );
  } finally {
    await disposeUsers(users);
  }
});

test("two users join the same room and establish independent realtime connections", async ({
  browser
}) => {
  const users = await createTwoUsers(browser);

  try {
    const room = await createRoom(users.userA, `E2E shared room ${Date.now()}`);
    await joinRoom(users.userB, room._id);

    await Promise.all([
      openRoom(users.userA, room),
      openRoom(users.userB, room)
    ]);

    const storedRoom = await readRoom(users.userA, room._id);
    const memberIds = storedRoom.members.map((member) => String(member.user));

    expect(memberIds).toEqual(
      expect.arrayContaining([
        String(users.userA.user._id),
        String(users.userB.user._id)
      ])
    );
  } finally {
    await disposeUsers(users);
  }
});
