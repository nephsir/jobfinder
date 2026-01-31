// Jobs Service – MongoDB via Mongoose

const Job = require('../models/Job');
const mongoose = require('mongoose');

// Static categories (can later be a Category collection)
const categories = [
    { id: 'tech', name: 'Technology', count: 245, icon: 'computer' },
    { id: 'design', name: 'Design', count: 89, icon: 'palette' },
    { id: 'data', name: 'Data Science', count: 156, icon: 'analytics' },
    { id: 'marketing', name: 'Marketing', count: 78, icon: 'campaign' },
    { id: 'management', name: 'Management', count: 112, icon: 'business' },
    { id: 'finance', name: 'Finance', count: 95, icon: 'account_balance' },
    { id: 'healthcare', name: 'Healthcare', count: 67, icon: 'local_hospital' },
    { id: 'education', name: 'Education', count: 43, icon: 'school' }
];

const getAllJobs = async () => {
    const jobs = await Job.find({ status: 'active' }).sort({ createdAt: -1 }).lean();
    return jobs.map(toJobResponse);
};

const getJobsByEmployer = async (employerId) => {
    const jobs = await Job.find({ employerId: employerId }).sort({ createdAt: -1 }).lean();
    return jobs.map(toJobResponse);
};

const searchJobs = async (filters) => {
    const query = { status: 'active' };

    if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        query.$or = [
            { title: new RegExp(keyword, 'i') },
            { company: new RegExp(keyword, 'i') },
            { description: new RegExp(keyword, 'i') }
        ];
    }
    if (filters.location) {
        query.location = new RegExp(filters.location, 'i');
    }
    if (filters.category) {
        query.category = new RegExp(`^${filters.category}$`, 'i');
    }
    if (filters.type) {
        query.type = new RegExp(`^${filters.type}$`, 'i');
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 }).lean();
    return jobs.map(toJobResponse);
};

const getCategories = () => {
    return categories;
};

// Long list of suitable job titles for profile dropdown (merged with DB counts)
const PROFILE_JOB_TITLES = [
    'Software Engineer', 'Senior Software Engineer', 'Junior Software Engineer', 'Full Stack Developer',
    'Frontend Developer', 'Backend Developer', 'DevOps Engineer', 'Data Engineer', 'Machine Learning Engineer',
    'UX Designer', 'UI Designer', 'UX/UI Designer', 'Product Designer', 'Graphic Designer', 'Web Designer',
    'Data Analyst', 'Data Scientist', 'Business Analyst', 'Financial Analyst', 'Marketing Analyst',
    'Project Manager', 'Product Manager', 'Program Manager', 'Scrum Master', 'Technical Lead',
    'Solutions Architect', 'Software Architect', 'System Administrator', 'IT Support', 'Network Engineer',
    'Quality Assurance Engineer', 'QA Engineer', 'Test Engineer', 'Security Engineer', 'Cloud Engineer',
    'Mobile Developer', 'iOS Developer', 'Android Developer', 'Game Developer', 'Embedded Software Engineer',
    'Content Writer', 'Technical Writer', 'Digital Marketing Specialist', 'SEO Specialist', 'Social Media Manager',
    'Human Resources Manager', 'Recruiter', 'Accountant', 'Financial Controller', 'Legal Counsel',
    'Nurse', 'Healthcare Administrator', 'Teacher', 'Lecturer', 'Research Scientist', 'Laboratory Technician',
    'Sales Representative', 'Account Manager', 'Customer Success Manager', 'Operations Manager',
    'Administrative Assistant', 'Executive Assistant', 'Office Manager', 'Receptionist'
];

const getJobTitlesForProfile = async () => {
    try {
        const fromDb = await Job.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$title', count: { $sum: 1 } } }
        ]).exec();
        const countByTitle = {};
        (fromDb || []).forEach(({ _id, count }) => { countByTitle[_id] = count; });
        const allTitles = [...new Set([...Object.keys(countByTitle), ...PROFILE_JOB_TITLES])].sort();
        return allTitles.map(title => ({
            title,
            count: countByTitle[title] ?? 0
        })).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
    } catch (err) {
        console.error('getJobTitlesForProfile error:', err);
        return PROFILE_JOB_TITLES.map(title => ({ title, count: 0 }));
    }
};

const getJobById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const job = await Job.findById(id).lean();
    return job ? toJobResponse(job) : null;
};

const createJob = async (jobData) => {
    const doc = await Job.create({
        ...jobData,
        requirements: Array.isArray(jobData.requirements) ? jobData.requirements : (jobData.requirements ? [jobData.requirements] : []),
        benefits: Array.isArray(jobData.benefits) ? jobData.benefits : (jobData.benefits ? [jobData.benefits] : []),
        postedDate: jobData.postedDate || new Date().toISOString().split('T')[0],
        status: 'active',
        applicants: 0
    });
    return toJobResponse(doc.toObject());
};

const updateJob = async (id, jobData) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const job = await Job.findByIdAndUpdate(id, { $set: jobData }, { new: true }).lean();
    return job ? toJobResponse(job) : null;
};

const deleteJob = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await Job.findByIdAndDelete(id);
    return !!result;
};

function toJobResponse(doc) {
    return {
        id: doc._id.toString(),
        title: doc.title,
        company: doc.company,
        location: doc.location,
        type: doc.type,
        category: doc.category,
        salary: doc.salary,
        description: doc.description,
        requirements: doc.requirements || [],
        benefits: doc.benefits || [],
        postedDate: doc.postedDate,
        deadline: doc.deadline,
        status: doc.status,
        applicants: doc.applicants ?? 0,
        responseTime: doc.responseTime,
        interviewProcess: doc.interviewProcess,
        logo: doc.logo,
        employerId: doc.employerId ? doc.employerId.toString() : null
    };
}

module.exports = {
    getAllJobs,
    getJobsByEmployer,
    searchJobs,
    getCategories,
    getJobTitlesForProfile,
    getJobById,
    createJob,
    updateJob,
    deleteJob
};
