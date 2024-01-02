const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  bio: { type: String },
  profilePicture: { type: String }, // URL or file path
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  registrationDate: { type: Date, default: Date.now },
});

// Use pre-save middleware to hash the password before saving it to the database
userSchema.pre('save', async function (next) {
  try {
    // Only hash the password if it has been modified or is new
    if (!this.isModified('password')) {
      return next();
    }

    // Hash the password with a salt
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    return next(error);
  }
});

// Method to compare a candidate password with the stored hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = model('User', userSchema);

module.exports = User;
