import { expect, test } from "@playwright/test";
import {
  addPlayableTrack,
  createRoom,
  createTwoUsers,
  disposeUsers,
  joinRoom,
  openRoom,
  readRoom,
  serverPlaybackPosition,
  skipButton,
  waitForTrack
} from "./helpers/jamify.js";

test.describe("realtime playback synchronization", () => {
  test.describe.configure({ mode: "serial" });

  const createSharedRoom = async (browser, label) => {
    const users = await createTwoUsers(browser);
    const room = await createRoom(users.userA, `E2E ${label} ${Date.now()}`);
    await joinRoom(users.userB, room._id);
    await Promise.all([
      openRoom(users.userA, room),
      openRoom(users.userB, room)
    ]);

    return { users, room };
  };

  test("playback state: User B receives User A starting playback", async ({
    browser
  }) => {
    const { users, room } = await createSharedRoom(browser, "playback");

    try {
      const { track } = await addPlayableTrack(users.userA, room._id);
      await Promise.all([
        waitForTrack(users.userA.page, track),
        waitForTrack(users.userB.page, track)
      ]);

      await expect(
        users.userB.page.getByRole("button", { name: "Pause playback" })
      ).toHaveCount(0);
      await expect(
        users.userB.page.locator("svg.lucide-skip-forward")
      ).toHaveCount(0);

      const nonHostPause = await users.userB.api.post(
        `/rooms/${room._id}/pause`
      );
      expect(nonHostPause.status()).toBe(403);

      // Adding the first track starts the current implementation automatically.
      // Pause first, then use User A's real UI action to verify play propagation.
      await users.userA.page
        .getByRole("button", { name: "Pause playback" })
        .click();
      await expect.poll(async () => {
        const storedRoom = await readRoom(users.userA, room._id);
        return storedRoom.isPlaying;
      }).toBe(false);

      await users.userA.page
        .getByRole("button", { name: "Play playback" })
        .click();
      await expect.poll(async () => {
        const storedRoom = await readRoom(users.userA, room._id);
        return storedRoom.isPlaying;
      }).toBe(true);

      const storedRoom = await readRoom(users.userA, room._id);
      expect(storedRoom.isPlaying).toBe(true);
    } finally {
      await disposeUsers(users);
    }
  });

  test("pause and resume: User B receives both state changes", async ({
    browser
  }) => {
    const { users, room } = await createSharedRoom(browser, "pause-resume");

    try {
      const { track } = await addPlayableTrack(users.userA, room._id);
      await Promise.all([
        waitForTrack(users.userA.page, track),
        waitForTrack(users.userB.page, track)
      ]);

      await users.userA.page
        .getByRole("button", { name: "Pause playback" })
        .click();

      await expect.poll(async () => {
        const updatedRoom = await readRoom(users.userA, room._id);
        return updatedRoom.isPlaying;
      }).toBe(false);

      let storedRoom = await readRoom(users.userA, room._id);
      expect(storedRoom.isPlaying).toBe(false);
      expect(storedRoom.playbackStartedAt).toBeNull();
      expect(storedRoom.playbackPosition).toBeGreaterThanOrEqual(0);

      await users.userA.page
        .getByRole("button", { name: "Play playback" })
        .click();

      await expect.poll(async () => {
        storedRoom = await readRoom(users.userA, room._id);
        return Boolean(storedRoom.isPlaying && storedRoom.playbackStartedAt);
      }).toBe(true);
    } finally {
      await disposeUsers(users);
    }
  });

  test("skip: User B receives the next track and matching queue state", async ({
    browser
  }) => {
    const { users, room } = await createSharedRoom(browser, "skip");

    try {
      const first = await addPlayableTrack(users.userA, room._id);
      const second = await addPlayableTrack(users.userA, room._id, "Kesariya");

      expect(second.track.providerTrackId).not.toBe(first.track.providerTrackId);

      await Promise.all([
        waitForTrack(users.userA.page, first.track),
        waitForTrack(users.userB.page, first.track)
      ]);

      const responsePromise = users.userA.page.waitForResponse(
        (response) =>
          response.url().includes(`/rooms/${room._id}/skip`) &&
          response.request().method() === "POST"
      );

      await skipButton(users.userA.page).click();

      const response = await responsePromise;
      expect(response.status()).toBe(200);
      await waitForTrack(users.userB.page, second.track);

      await expect
  .poll(
    async () => {
      const storedRoom = await readRoom(users.userA, room._id);
      return storedRoom.currentTrack?.providerTrackId;
    },
    { timeout: 10_000 }
  )
  .toBe(second.track.providerTrackId);

const storedRoom = await readRoom(users.userA, room._id);

expect(storedRoom.queue).toHaveLength(0);
expect(storedRoom.isPlaying).toBe(true);
expect(storedRoom.playbackPosition).toBe(0);
    } finally {
      await disposeUsers(users);
    }
  });

  test("late join: User B seeks close to the backend-authoritative position", async ({
    browser
  }) => {
    const users = await createTwoUsers(browser);
    const room = await createRoom(users.userA, `E2E late join ${Date.now()}`);
    await joinRoom(users.userB, room._id);

    try {
      await openRoom(users.userA, room);
      const { track } = await addPlayableTrack(users.userA, room._id);
      await waitForTrack(users.userA.page, track);

      // Make User A's play action a real browser gesture. Browser B is not
      // given an autoplay override; the assertion tests its seek position.
      await users.userA.page
        .getByRole("button", { name: "Pause playback" })
        .click();
      await users.userA.page
        .getByRole("button", { name: "Play playback" })
        .click();
      await users.userA.page.waitForTimeout(3_000);

      await openRoom(users.userB, room);

      await expect
        .poll(
          () =>
            users.userB.page
              .locator("audio")
              .evaluate((audio) => audio.readyState),
          { message: "User B never loaded audio metadata" }
        )
        .toBeGreaterThanOrEqual(1);

      await expect
        .poll(
          () => users.userB.page.locator("audio").evaluate((audio) => audio.currentTime),
          { message: "User B did not seek away from the beginning of the track" }
        )
        .toBeGreaterThan(1);

      await expect
        .poll(
          () => users.userB.page.locator("audio").evaluate((audio) => audio.paused),
          { message: "User B did not start playback after seeking" }
        )
        .toBe(false);

      const storedRoom = await readRoom(users.userA, room._id);
      const expectedPosition = serverPlaybackPosition(storedRoom);
      const browserPlayback = await users.userB.page
        .locator("audio")
        .evaluate((audio) => ({
          currentTime: audio.currentTime,
          duration: audio.duration,
          paused: audio.paused,
          readyState: audio.readyState
        }));
      const browserPosition = browserPlayback.currentTime;

      expect(Math.abs(browserPosition - expectedPosition)).toBeLessThan(2);
    } finally {
      await disposeUsers(users);
    }
  });
});
