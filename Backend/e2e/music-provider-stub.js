import express from "express";

const app = express();
const PORT = Number(process.env.MUSIC_PROVIDER_PORT || 5051);
const AUDIO_DURATION_SECONDS = 90;
const SAMPLE_RATE = 8_000;

const createSilentWav = () => {
  const dataSize = SAMPLE_RATE * AUDIO_DURATION_SECONDS * 2;
  const wav = Buffer.alloc(44 + dataSize);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);

  return wav;
};

const audio = createSilentWav();

const makeTestSong = (id, name) => ({
  id,
  name,
  artists: {
    primary: [
      {
        name: "Jamify Test Artist"
      }
    ]
  },
  duration: AUDIO_DURATION_SECONDS,
  image: [
    {
      quality: "500x500",
      url: "https://example.com/test-cover.jpg"
    }
  ],
  url: `http://localhost:${PORT}/tracks/${id}`,
  downloadUrl: [
    {
      quality: "160kbps",
      url: `http://localhost:${PORT}/audio/${id}.wav`
    }
  ]
});

const testSongs = [
  makeTestSong("e2e-track-1", "E2E Test Track One"),
  makeTestSong("e2e-track-2", "E2E Test Track Two")
];

app.get("/health", (req, res) => res.sendStatus(204));

app.get("/api/search/songs", (req, res) => {
  const query = String(req.query.query || "").toLowerCase();
  const song = query.includes("kesariya") ? testSongs[1] : testSongs[0];

  res.json({
    success: true,
    data: {
      results: [song]
    }
  });
});

app.get("/api/songs/:id", (req, res) => {
  const song = testSongs.find((candidate) => candidate.id === req.params.id);

  if (!song) {
    return res.status(404).json({
      success: false
    });
  }

  res.json({
    success: true,
    data: [song]
  });
});

app.get("/audio/:id.wav", (req, res) => {
  if (!testSongs.some((song) => song.id === req.params.id)) {
    return res.sendStatus(404);
  }

  const range = req.headers.range;

  if (range) {
    const [startValue, endValue] = range.replace("bytes=", "").split("-");
    const start = Number.parseInt(startValue, 10);
    const end = endValue
      ? Number.parseInt(endValue, 10)
      : audio.length - 1;

    if (!Number.isInteger(start) || start < 0 || start >= audio.length) {
      return res.status(416).set("Content-Range", `bytes */${audio.length}`).end();
    }

    const boundedEnd = Math.min(end, audio.length - 1);
    const chunk = audio.subarray(start, boundedEnd + 1);

    return res.status(206).set({
      "Content-Type": "audio/wav",
      "Content-Length": chunk.length,
      "Content-Range": `bytes ${start}-${boundedEnd}/${audio.length}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store"
    }).send(chunk);
  }

  res.set({
    "Content-Type": "audio/wav",
    "Content-Length": audio.length,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store"
  });
  return res.send(audio);
});

app.listen(PORT, () => {
  console.log(`E2E music provider running on ${PORT}`)
});
