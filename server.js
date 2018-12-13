'use strict';

// add dependencies
const express = require('express');
const app = express();
const superagent = require('superagent');
const pg = require('pg');

// middleware (captures req/res and modifies)
app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public')); // for serving static content

require('dotenv').config();
const PORT = process.env.PORT;

// connect db client
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

//set templating engine
app.set('view engine', 'ejs');
app.get(('/'), getSavedBooks); // renders all books already in DB

app.get(('/search'), (request, response) => { // renders search form
  response.render('./pages/searches/search');
});
app.post('/search', getBooks); // requests, processes, and renders search results
let searchResults = []; // to persist search results to enable single item search

app.get('/search/:book_isbn', pickBook); // path from "Select This Book" button
// app.get('/newbook/:book_isbn', showForm); // path from "Select This Book" button
app.post('/search/:book_isbn', saveBook); // path from book details update form

app.get('/book/:book_id', getOneBook);

function pickBook(request,response) {
  let selected = {};
  searchResults.forEach(val => {
    if (val.isbn === request.params.book_isbn) {
      selected = val;
    }
  })
  console.log('selected: ',selected);
  saveBook(selected,response);
}

// function showForm (){
//   // use trigger to select
// }

function saveBook (selected,response) {
  let SQL = 'INSERT INTO bookslist (authors,title,isbn,image,summary) VALUES ($1,$2,$3,$4,$5) RETURNING id;';

  let values = [selected.authors,selected.title,selected.isbn,selected.image,selected.summary];
  return client.query(SQL,values)
    .then (results => {
      // console.log(`/book/${results.rows[0].id}`);
      response.redirect(`/book/${results.rows[0].id}`);
    })
    .catch(error => handleError(error));
}

function getOneBook (request,response) {
  let SQL = 'SELECT * FROM bookslist WHERE id=$1;';
  let values = [request.params.book_id];
  return client.query(SQL,values)
    .then( results => {
      response.render('./index', {allBooks: results.rows});
    })
    .catch(error => handleError(error));

}

function getSavedBooks(request,response) {
  let SQL = 'SELECT * from bookslist;';
  return client.query(SQL)
    .then(results => {
      response.render('./index', {allBooks: results.rows});
    })
    .catch(error => handleError(error));
}


function getBooks(request,response) {
  // define handler
  const handler = {
    query: request.body.search_query,
    queryType: request.body.title==='on' ? 'intitle' : 'inauthor',
  }
  Book.fetch(handler,response);
}

function Book (data) {
  this.title = data.volumeInfo.title || 'Title not listed.';
  this.image = data.volumeInfo.imageLinks ? data.volumeInfo.imageLinks.thumbnail : 'http://www.bsmc.net.au/wp-content/uploads/No-image-available.jpg'; //
  this.authors = data.volumeInfo.authors.join(', ') || 'Authors not listed.';
  this.summary = data.volumeInfo.description || 'Summary not available.'
  this.isbn = data.volumeInfo.industryIdentifiers[0].identifier || 'ISBN not listed.'
}

Book.fetch = function (handler,response) {
  // request data from API
  const url = `https://www.googleapis.com/books/v1/volumes?q=${handler.queryType}:${handler.query}`
  superagent.get(url)
    .then(results => {
      let arrOfBooks = Book.makeBooks(results.body.items);
      return arrOfBooks;
    })
    .then (results => {
      searchResults = results;
      console.log('results to showAPI', results);
      response.render('./pages/searches/showAPI', { allBooks: results})
    })
    .catch(error => handleError(error));
}

Book.makeBooks = function (bookData) {
  // build array to return to render
  // make new Book objects for each item in incoming bookData
  let allBooks = [];
  if (bookData.length < 1) {
    return allBooks;
  } else {
    if (bookData.length > 10) {
      bookData = bookData.slice[0,10];
    }
    allBooks = bookData.map( entry => {
      let book = new Book(entry);
      return book;
    })
    return allBooks;
  }
}

function handleError(error) {
  console.error('Sorry, there was an error.');
}

app.listen(PORT, () => {
  console.log(`listening to port: ${PORT}`);
});
