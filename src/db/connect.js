// src/db/connect.js

const mongoose = require('mongoose'); // import mongoose

async function connectToDatabase(){
    try{
        await mongoose.connect('mongodb://localhost:27017/photogallery') // connect to the database
    } catch(error){
        console.error('Error connecting to the database', error);
        throw error;
    }
}

module.exports = connectToDatabase; // export the function