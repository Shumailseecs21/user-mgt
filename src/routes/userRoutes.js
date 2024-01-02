const express = require('express');
const router = express.Router();
const User = require('../db/models/user');
const bcrypt = require('bcrypt');
const winston = require('winston'); // Import Winston for logging
const jwt = require('jsonwebtoken'); // Import JWT for creating tokens
const passport = require('../passport-config');

// Create a logger instance
const logger = winston.createLogger({
  level: 'info', // Set the minimum logging level
  format: winston.format.simple(), // Use a simple log format
  transports: [
    new winston.transports.Console(), // Log to the console
    new winston.transports.File({ filename: 'userRoutes.log' }), // Log to a file
  ],
});

// Define your routes and middleware here

// User registration routes
router.get('/register', (req, res) => {
  res.status(200).json({"message":'User registration page'});
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;
    console.log(username,email,password,fullName);
    
    logger.info('Received registration request:', { username, email, fullName });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password complexity
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }


    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      logger.warn('User already exists:', { username, email });
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = new User({ username, email, password, fullName });
    await newUser.save();

    logger.info('User created successfully:', { username, email });
    res.status(201).json({ message: 'User created successfully' ,user:newUser});
  } catch (error) {
    logger.error('Error during user registration:', { error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// User login routes
router.get('/login', (req, res) => {
  res.status(200).json({"message":'return login page'});
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(password,username);

    logger.info('Received login request:', { username });

    const user = await User.findOne({ username });

    if (!user) {
      logger.warn('User does not exist:', { username });
      return res.status(400).json({ message: 'User does not exist' });
    }

    // use bcrypt to compare the password entered by the user with the password stored in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn('Incorrect password:', { username });
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Create a new JSON Web Token with the updated password
    const token = jwt.sign({ sub: user._id, username: user.username }, 'your-secret-key', { expiresIn: '7d' });

    logger.info('User logged in successfully:', { username });
    res.status(200).json({ message: 'User logged in successfully', token, user:user});

  } catch (error) {
    logger.error('Error during user login:', { error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//User profile management routes

//get user profile
router.get('/profile',passport.authenticate('jwt', {session : false}), async (req, res) => {
        try{
          //fetch user profile from the database
          const userProfile = await User.findOne({username: req.user.username});

          if (!userProfile){
            return res.status(404).json({message: 'User profile not found'});
          }

          //send the user profile to the user
          //console.log('userProfile:', userProfile);
          res.status(200).json({userProfile}); //replace this with your user profile page HTML file
        } catch(error){
          console.error('Error fetching user profile:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
    });

// Route to update user profile information
router.put('/profile',passport.authenticate('jwt',{ session : false }) ,async (req, res) => {
  try {
    const { username, email, fullName, bio } = req.body;

    // Validate that at least one field is provided for the update
    if (!fullName && !bio && !email && !username) {
      return res.status(400).json({ error: 'At least one field is required for the update' });
    }

    // Build the update object based on the fields provided in the request body
    const updateObject = {};
    if (fullName) updateObject.fullName = fullName;
    if (bio) updateObject.bio = bio;

    if (email) updateObject.email = email;
    if (username) updateObject.username = username;

    // Update user profile information in the database
    const updatedProfile = await User.findOneAndUpdate(
      { email: email }, // Find the user profile by email
      { $set: updateObject }, // Update the user profile with the updateObject
      { new: true } // Return the updated user profile
    );

    if (!updatedProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Respond with the updated user profile information
    res.status(200).json({
      message: 'User profile updated successfully',
      userProfile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

 // Route to delete user profile
router.delete('/profile', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const usernameToDelete = req.user.username;

    // Delete user profile information from the database based on the username
    const deletedProfile = await User.findOneAndDelete({ username: usernameToDelete });

    if (!deletedProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Respond with a success message or additional information as needed
    res.status(200).json({ message: 'User profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting user profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

  
  //change user password
router.put('/change-password', async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    // Validate current password
    if (!currentPassword || currentPassword.length < 8) {
      return res.status(400).json({ error: 'Current password must be provided and at least 8 characters long' });
    }

    // Validate new password complexity
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    // Find the user in the database
    const user = await User.findOne({ username });

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify the current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    // Update the password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Respond with a success message
    res.status(200).json({ message: 'Password changed successfully' }); //show this message on the user profile page
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;
