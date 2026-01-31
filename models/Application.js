const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    jobTitle: { type: String, required: true },
    company: { type: String, required: true },
    userId: { type: String, required: true },
    applicantName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    coverLetter: { type: String, default: '' },
    resumeUrl: { type: String, default: '' },
    status: {
        type: String,
        default: 'submitted',
        enum: ['submitted', 'under_review', 'interview_scheduled', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn']
    },
    appliedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    lastUpdated: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, {
    timestamps: true
});

// One application per user per job
applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

applicationSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.jobId = ret.jobId ? ret.jobId.toString() : ret.jobId;
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;
