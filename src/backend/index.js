const express = require('express');
const app = express();
const port = 3001;

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});