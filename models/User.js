const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING(30),
    primaryKey: true,
    // Custom ID will be generated: Date + Role + Random + Sequence
    // Example: 20251122P12345001 (Professor), 20251122S98765002 (Student)
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('student', 'professor', 'admin'),
    defaultValue: 'student'
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  bio: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  // Personal Information
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  // Student-specific fields
  highestEducation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fieldOfStudy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: true
  },
  yearOfPassing: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1950, // Minimum reasonable year
      max: new Date().getFullYear() + 5, // Allow future years for current students (e.g., 2029 if currently 2024)
      isInt: true
    },
    comment: 'Year of graduation/completion. Can be future year for currently studying students'
  },
  workExperience: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  learningGoals: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Professor-specific fields
  qualification: {
    type: DataTypes.STRING,
    allowNull: true
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: true
  },
  teachingExperience: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  expertise: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  certifications: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  linkedinUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Emergency contact
  emergencyContactName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emergencyRelation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emergencyPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Password Management
  lastPasswordChange: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  passwordExpired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true
});

// Hash password before saving (only if not already hashed)
User.beforeCreate(async (user) => {
  if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    // Password is not hashed yet
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
  // Set password change date
  if (!user.lastPasswordChange) {
    user.lastPasswordChange = new Date();
  }
  if (user.passwordExpired === undefined) {
    user.passwordExpired = false;
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password') && user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
    // Password is not hashed yet
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    user.lastPasswordChange = new Date();
    user.passwordExpired = false;
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password is expired (older than 90 days)
User.prototype.isPasswordExpired = function () {
  if (!this.lastPasswordChange) return true;

  const daysSinceChange = Math.floor(
    (new Date() - new Date(this.lastPasswordChange)) / (1000 * 60 * 60 * 24)
  );

  return daysSinceChange >= 90;
};

module.exports = User;
