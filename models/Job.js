const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, required: true, enum: ['Full-time', 'Part-time', 'Contract', 'Remote'] },
    category: { type: String, default: 'Technology' },
    salary: { type: String, default: '' },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    benefits: [{ type: String }],
    postedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    deadline: { type: String, default: '' },
    status: { type: String, default: 'active', enum: ['active', 'closed', 'draft'] },
    applicants: { type: Number, default: 0 },
    responseTime: { type: String, default: '' },
    interviewProcess: { type: String, default: '' },
    logo: { type: String, default: '' },
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Return id as string and remove __v for API responses
jobSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
