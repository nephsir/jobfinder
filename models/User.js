const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false }, // select: false so it's not returned by default
    phone: { type: String, default: '' },
    role: { type: String, default: 'jobseeker', enum: ['jobseeker', 'employer', 'admin'] },
    avatar: { type: String, default: '' },
    location: { type: String, default: '' },
    // Job seeker fields
    title: { type: String, default: '' },
    skills: [{ type: String }],
    experience: { type: String, default: '' },
    education: { type: String, default: '' },
    // Employer fields
    companyName: { type: String, default: '' },
    industry: { type: String, default: '' },
    // Shared fields
    bio: { type: String, default: '' },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
    skippedJobIds: { type: [String], default: [] },
    lastLogin: { type: String, default: '' }
}, {
    timestamps: true
});

userSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
    }
});

const User = mongoose.model('User', userSchema);
module.exports = User;
