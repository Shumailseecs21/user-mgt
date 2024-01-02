// app.js
const mongoose=require("mongoose");
const express = require('express'); // import express
const bodyParser = require('body-parser'); // import body-parser
const connectToDatabase = require('./src/db/connect'); // import the connect function
const userRoutes = require('./src/routes/userRoutes'); // import the user routes
const winston = require('winston'); // import winston for logging
require('dotenv').config();

const app = express(); // create an express app
const PORT = process.env.PORT 

// Define the logger configuration
const logger = winston.createLogger({
    level: 'info', // Set the minimum logging level
    format: winston.format.simple(), // Use a simple log format
    transports: [
      new winston.transports.Console(), // Log to the console
      new winston.transports.File({ filename: 'app.log' }), // Log to a file
    ],
  });

// Middleware for parsing JSON and URL-encoded form data using body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());



// Simple route to test the connection
app.get('/', (req, res) => {
  try {
    // Your route logic

    // Log success
    logger.info('Request to / endpoint successful');

    res.status(200).send('Hello, world!');
  } catch (error) {
    // Log errors
    logger.error('Error during route processing:', error);

    res.status(500).send('Internal Server Error');
  }
});


//Define the API routes 
app.use('/users', userRoutes);

try{
  mongoose.connect(`mongodb://127.0.0.1:27017/photogallery`)
  .then(()=>{
    app.listen(PORT, ()=>console.log(`Server is running on port ${PORT}`)) // start listening on specified port
  })
  ; // connect to the database
} catch(error){
  console.error('Error connecting to the database', error);
  throw error;
}

// Start the server
// app.listen(PORT, () => {
//     console.log(`Server is running on http://localhost:${PORT}`);
//   });