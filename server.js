const express = require('express');
const axios = require('axios');
const qs = require('qs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = 'http://localhost:3000/callback';

let accessToken = '';

// Serve the static HTML file
app.use(express.static(path.join(__dirname, 'public')));

app.get('/login', (req, res) => {
  const scopes = 'user-read-private user-read-email';
  const authUrl = 'https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + clientId +
    '&scope=' + encodeURIComponent(scopes) +
    '&redirect_uri=' + encodeURIComponent(redirectUri);
  
  console.log(`Redirecting to: ${authUrl}`);
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  console.log(`Received code: ${code}`);
  
  try {
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: qs.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
    });

    accessToken = tokenResponse.data.access_token;
    console.log(`Access Token: ${accessToken}`);
    res.redirect('/');
  } catch (error) {
    console.error('Error getting tokens:', error.response ? error.response.data : error.message);
    res.send('Error getting tokens');
  }
});

app.get('/random-song', async (req, res) => {
  if (!accessToken) {
    return res.status(401).send('Access token is not available');
  }

  try {
    const genresResponse = await axios.get('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const genres = genresResponse.data.genres;
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];

    const recommendationsResponse = await axios.get(
      `https://api.spotify.com/v1/recommendations?limit=1&seed_genres=${randomGenre}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const track = recommendationsResponse.data.tracks[0];
    res.json({
      title: track.name,
      artist: track.artists[0].name,
      image: track.album.images[0].url,
    });
  } catch (error) {
    console.error('Error fetching random song:', error.response ? error.response.data : error.message);
    res.status(500).send('Error fetching random song');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
