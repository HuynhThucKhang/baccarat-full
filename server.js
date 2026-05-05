const axios = require('axios');
const express = require('express');
const https = require('https');

const BASE = "https://aibcr.me";

const app = express();
const agent = new https.Agent({ rejectUnauthorized: false });

let cookieJar = '';
let data = [];
let lastUpdate = null;

const session = axios.create({
    baseURL: BASE,
    httpsAgent: agent,
    timeout: 20000
});

// cookie
session.interceptors.request.use(c => {
    if (cookieJar) c.headers.Cookie = cookieJar;
    return c;
});

session.interceptors.response.use(res => {
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
        setCookie.forEach(c => {
            cookieJar += c.split(';')[0] + '; ';
        });
    }
    return res;
});

// login
async function login() {
    const html = await session.get('/login');
    const token = html.data.match(/csrf-token.*content="([^"]+)/)[1];

    await session.post('/login', new URLSearchParams({
        username: process.env.USERNAME,
        password: process.env.PASSWORD,
        _token: token
    }));
}

// fetch
async function fetchData() {
    try {
        const res = await session.post('/baccarat/getnewresult', "gameCode=ae");
        if (res.data?.data) {
            data = res.data.data;
            lastUpdate = new Date().toISOString();
        }
    } catch (e) {
        console.log("retry...");
    }
}

// loop
setInterval(fetchData, 2000);

// routes
app.use(express.static('public'));

app.get('/api', (req, res) => {
    res.json({ data, lastUpdate });
});

// start
(async () => {
    await login();
    await fetchData();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log("RUNNING " + PORT));
})();
