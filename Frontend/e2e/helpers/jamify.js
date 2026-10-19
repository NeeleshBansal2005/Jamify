import { expect, request } from "@playwright/test";
import { randomUUID } from "node:crypto";

export const backendUrl = "http://localhost:5001";

const makeAccount = (role) => {
  const uniqueId = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  return {
    username: `e2e_${role}_${uniqueId}`.slice(0, 30),
    email: `jamify-e2e-${role}-${uniqueId}@example.test`,
    // Generated per run; no real user credential is stored in the repository.
    password: `E2E-${randomUUID()}!`
  };
};

const expectOk = async (response, action) => {
  const body = await response.json();

  expect(
    response.ok(),
    `${action} failed with ${response.status()}: ${JSON.stringify(body)}`
  ).toBeTruthy();

  return body;
};

export const createAuthenticatedUser = async (role) => {
  const account = makeAccount(role);
  const api = await request.newContext({ baseURL: backendUrl });

  const registration = await api.post("/auth/register", { data: account });
  await expectOk(registration, `register ${role}`);

  const login = await api.post("/auth/login", {
    data: {
      email: account.email,
      password: account.password
    }
  });
  await expectOk(login, `login ${role}`);

  const me = await api.get("/auth/me");
  const { user } = await expectOk(me, `load ${role}`);

  return {
    account,
    api,
    storageState: await api.storageState(),
    user
  };
};

export const createTwoUsers = async (browser) => {
  const userA = await createAuthenticatedUser("a");
  const userB = await createAuthenticatedUser("b");

  userA.context = await browser.newContext({
    storageState: userA.storageState
  });
  userB.context = await browser.newContext({
    storageState: userB.storageState
  });
  userA.page = await userA.context.newPage();
  userB.page = await userB.context.newPage();

  return { userA, userB };
};

export const disposeUsers = async ({ userA, userB }) => {
  await Promise.allSettled([
    userA.context?.close(),
    userB.context?.close(),
    userA.api?.dispose(),
    userB.api?.dispose()
  ]);
};

export const createRoom = async (user, name) => {
  const response = await user.api.post("/rooms", {
    data: {
      name,
      genre: "Electronic",
      vibe: "Focus"
    }
  });

  return expectOk(response, "create room");
};

export const joinRoom = async (user, roomId) => {
  const response = await user.api.post(`/rooms/${roomId}/join`);
  return expectOk(response, "join room");
};

export const readRoom = async (user, roomId) => {
  const response = await user.api.get(`/rooms/${roomId}`);
  return expectOk(response, "read room");
};

export const addPlayableTrack = async (user, roomId, query = "Believer") => {
  const searchResponse = await user.api.get("/music/search", {
    params: {
      q: query,
      limit: "10"
    }
  });
  const { songs } = await expectOk(searchResponse, "search test track");
  const track = songs.find(
    (song) => song.provider === "jiosaavn" && song.providerTrackId
  );

  expect(track, "music search did not return a JioSaavn track").toBeTruthy();

  const addResponse = await user.api.post(`/rooms/${roomId}/queue`, {
    data: {
      provider: track.provider,
      providerTrackId: track.providerTrackId
    }
  });
  const room = await expectOk(addResponse, "add test track");

  return { room, track };
};

export const openRoom = async (user, room) => {
  const realtimeMessages = [];
  user.page.on("console", (message) => {
    realtimeMessages.push(message.text());
  });

  await user.page.goto(`/room/${room._id}`);
  await expect(user.page.getByText(room.name, { exact: true })).toBeVisible();

  await expect
    .poll(
      () =>
        realtimeMessages.some((message) =>
          message.includes(`Realtime sync joined for room ${room._id}`)
        ),
      { message: `Socket.IO did not join room ${room._id}` }
    )
    .toBeTruthy();
};

export const waitForTrack = async (page, track) => {
  await expect(page.getByText(track.title, { exact: true }).first()).toBeVisible();
};

export const waitForPlaybackControl = async (page, label) => {
  await expect(
    page.getByRole("button", { name: label })
  ).toBeVisible();
};

export const skipButton = (page) =>
  page
    .locator("button")
    .filter({ has: page.locator("svg.lucide-skip-forward") })
    .last();

export const serverPlaybackPosition = (room, now = Date.now()) => {
  if (!room.isPlaying || !room.playbackStartedAt) {
    return room.playbackPosition || 0;
  }

  return (
    (room.playbackPosition || 0) +
    (now - new Date(room.playbackStartedAt).getTime()) / 1000
  );
};
