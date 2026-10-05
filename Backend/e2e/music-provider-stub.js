import express from "express";

const app = express();
const PORT = 5050;

const songs = {
  Believer: {
    id: "e2e-track-believer",
    name: "Believer",
    artist: "E2E Test Artist One",
  },

  Kesariya: {
    id: "e2e-track-kesariya",
    name: "Kesariya",
    artist: "E2E Test Artist Two",
  },
};

// Generate a real 30-second silent WAV file.
// This gives Chromium real audio metadata to load.
const createSilentWav = (durationSeconds = 30) => {
  const sampleRate = 44100;
  const channels = 1;
  const bitsPerSample = 16;

  const bytesPerSample = bitsPerSample / 8;
  const dataSize =
    sampleRate * durationSeconds * channels * bytesPerSample;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);

  const byteRate =
    sampleRate * channels * bytesPerSample;

  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Remaining bytes are already zero = silence

  return buffer;
};

const silentWav = createSilentWav(30);

const toProviderSong = (song) => ({
  id: song.id,
  name: song.name,

  artists: {
    primary: [{ name: song.artist }],
  },

  duration: 30,

  image: [
    {
      quality: "500x500",
      url: "https://example.com/test-cover.jpg",
    },
  ],

  url: `https://example.com/${song.id}`,

  downloadUrl: [
    {
      quality: "160kbps",
      url: `http://localhost:${PORT}/audio/${song.id}.wav`,
    },
  ],
});

// Real audio endpoint
app.get("/audio/:id.wav", (req, res) => {
  const exists = Object.values(songs).some(
    (song) => `${song.id}.wav` === req.params.id + ".wav"
  );

  if (!exists) {
    return res.status(404).send("Audio not found");
  }

  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Content-Length", silentWav.length);

  res.send(silentWav);
});

app.get("/api/search/songs", (req, res) => {
  const query = String(req.query.query || "").toLowerCase();

  const song = query.includes("kesariya")
    ? songs.Kesariya
    : songs.Believer;

  res.json({
    success: true,
    data: {
      results: [toProviderSong(song)],
    },
  });
});

app.get("/api/songs/:id", (req, res) => {
  const song = Object.values(songs).find(
    (item) => item.id === req.params.id
  );

  if (!song) {
    return res.status(404).json({
      success: false,
    });
  }

  res.json({
    success: true,
    data: [toProviderSong(song)],
  });
});

app.listen(PORT, () => {
  console.log(`E2E music provider running on ${PORT}`);
});