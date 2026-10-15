import express from "express";

const app = express();
const port = 5050;

const testSong = {
  id: "e2e-track-1",
  name: "E2E Test Track",
  artists: {
    primary: [{ name: "Jamify Test Artist" }]
  },
  duration: 180,
  image: [
    {
      quality: "500x500",
      url: "https://example.com/test-cover.jpg"
    }
  ],
  url: "https://example.com/e2e-track-1",
  downloadUrl: [
    {
      quality: "160kbps",
      url: "https://example.com/e2e-track-1.mp3"
    }]     
};

app.get("/api/search/songs", (req, res) => {
  res.json({
    success: true,
    data: {
      results: [testSong]
    }
  });
});

app.get("/api/songs/:id", (req, res) => {
  if (req.params.id !== testSong.id) {
    return res.status(404).json({
      success: false
    });
  }

  res.json({
    success: true,
    data: [testSong]
  });
});

app.listen(port, () => {
  console.log(`E2E music provider running on ${port}`);
});