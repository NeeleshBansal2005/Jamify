import dotenv from "dotenv";
import axios from "axios";

export const getSpotifyAccessToken = async (req, res) => {
    const spotifyClientId = process.env.CLIENT_ID;
    const spotifyClientSecret = process.env.CLIENT_SECRET; 
    const response = await fetch('https://accounts.spotify.com/api/token', {
    method:'POST',
    headers:{
        'Authorization': 'Basic ' + Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64'), // Encode client ID and secret in Base64 for Basic Auth and set in Authorization header 
        'Content-type':'application/x-www-form-urlencoded' //spotify token endpoint expects data in URL-encoded format, so we set the appropriate content type header 
    },
    body:'grant_type=client_credentials'//backend requsting permission to access spotify data without user context, so we use client credentials flow and specify grant type in request body , basically spotify give my app access token 
});

const data = await response.json();

console.log("data is:",data);

return data.access_token;
}
export const searchTracks = async (req, res) => {
    const query = req.query.q; // Get the search query from the request query parameters
    //validate query exists 
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }
    //call token helper function to get access token
    const accessToken = await getSpotifyAccessToken();
    console.log("Access Token:", accessToken);
    //make a request to Spotify API to search for tracks using the access token and search query
    try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${accessToken}` // Include the access token in the Authorization header for authentication
            },
            params: {//kya dudhna hai is params
                q: query, // Set the search query parameter
                type: 'track', // Specify that we want to search for tracks
                limit: 10 // Limit the number of results returned
            }
        });
const tracks = response.data.tracks.items.map((track) => ({
    id: track.id,
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    albumCover: track.album.images[0]?.url,
    duration: track.duration_ms,
    uri: track.uri,
}));
    res.json(tracks);
    } catch (error) {
        console.error('Error searching Spotify tracks:', error);
        res.status(500).json({ error: 'Failed to search Spotify tracks' });
    }}
