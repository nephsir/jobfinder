// Applications Service – MongoDB via Mongoose

const Application = require('../models/Application');
const Job = require('../models/Job');
const mongoose = require('mongoose');

const getAllApplications = async () => {
    const apps = await Application.find().sort({ createdAt: -1 }).lean();
    return apps.map(toAppResponse);
};

const getApplicationsByUser = async (userId) => {
    const apps = await Application.find({ userId }).sort({ createdAt: -1 }).lean();
    return apps.map(toAppResponse);
};

const getApplicationById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const app = await Application.findById(id).lean();
    return app ? toAppResponse(app) : null;
};

const createApplication = async (appData) => {
    const jobId = mongoose.Types.ObjectId.isValid(appData.jobId) ? appData.jobId : null;
    if (!jobId) throw new Error('Invalid jobId');

    // One application per user per job: return existing if already applied
    const existing = await Application.findOne({ userId: appData.userId, jobId }).lean();
    if (existing) {
        return toAppResponse(existing);
    }

    const doc = await Application.create({
        jobId,
        jobTitle: appData.jobTitle,
        company: appData.company,
        userId: appData.userId,
        applicantName: appData.applicantName,
        email: appData.email,
        phone: appData.phone || '',
        location: appData.location || '',
        coverLetter: appData.coverLetter || '',
        resumeUrl: appData.resumeUrl || '',
        status: 'submitted',
        appliedDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0]
    });

    await Job.findByIdAndUpdate(jobId, { $inc: { applicants: 1 } });

    return toAppResponse(doc.toObject());
};

const updateApplicationStatus = async (id, status) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const app = await Application.findByIdAndUpdate(
        id,
        { $set: { status, lastUpdated: new Date().toISOString().split('T')[0] } },
        { new: true }
    ).lean();
    return app ? toAppResponse(app) : null;
};

const deleteApplication = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const app = await Application.findById(id).lean();
    if (app && app.jobId) {
        await Job.findByIdAndUpdate(app.jobId, { $inc: { applicants: -1 } });
    }
    const result = await Application.findByIdAndDelete(id);
    return !!result;
};

const deleteApplicationByUserAndJob = async (userId, jobId) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(jobId)) return false;
    const app = await Application.findOne({ userId, jobId }).lean();
    if (!app) return false;
    await Job.findByIdAndUpdate(app.jobId, { $inc: { applicants: -1 } });
    const result = await Application.findByIdAndDelete(app._id);
    return !!result;
};

function toAppResponse(doc) {
    return {
        id: doc._id.toString(),
        jobId: doc.jobId ? doc.jobId.toString() : doc.jobId,
        jobTitle: doc.jobTitle,
        company: doc.company,
        userId: doc.userId,
        applicantName: doc.applicantName,
        email: doc.email,
        phone: doc.phone,
        coverLetter: doc.coverLetter,
        resumeUrl: doc.resumeUrl,
        status: doc.status,
        appliedDate: doc.appliedDate,
        lastUpdated: doc.lastUpdated
    };
}

module.exports = {
    getAllApplications,
    getApplicationsByUser,
    getApplicationById,
    createApplication,
    updateApplicationStatus,
    deleteApplication,
    deleteApplicationByUserAndJob
};
