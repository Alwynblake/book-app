'use strict';

const express = require('express');
const ejs = require('ejs');
const superagent = require('superagent');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`listening to port: ${PORT}`);
});

//set templating engine
app.set('view engine', 'ejs');
app.get(('/'), (request, response) => {
  response.render('index');
});
