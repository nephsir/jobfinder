/**
 * Seed script – populates the database with sample jobs, applications, and users.
 *
 * WHERE THE SEED DATA COMES FROM:
 * All sample data is defined in this file:
 *   - sampleJobs  = array of job objects (below)
 *   - Users       = inserted in the seed() function (John Smith, Sarah Johnson)
 *   - Applications = built from the first 2 seeded jobs + user 'user-001'
 *
 * Run once: npm run seed   (or: node scripts/seed.js)
 * Requires: MONGODB_URI in .env or default mongodb://localhost:27017/jobfinder
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobfinder';
const SEED_PASSWORD = 'password123'; // default password for seeded users (change after first login in production)

/** Sample jobs – source of "seed data" for the jobs collection */
const sampleJobs = [
    { title: 'Senior Software Engineer', company: 'TechCorp Australia', location: 'Melbourne, VIC', type: 'Full-time', category: 'Technology', salary: '$120,000 - $150,000', description: 'Join our innovative team. Expect to hear back within 24 hours.', requirements: ['5+ years', 'Node.js', 'React', 'AWS'], benefits: ['Flexible hours', 'Remote', 'Health insurance'], postedDate: '2026-01-25', deadline: '2026-02-28', applicants: 4, responseTime: '24 hours', interviewProcess: '2 stages', logo: 'https://ui-avatars.com/api/?name=TC&background=1565c0&color=fff&size=100' },
    { title: 'UX/UI Designer', company: 'Creative Studio', location: 'Sydney, NSW (Hybrid)', type: 'Full-time', category: 'Design', salary: '$90,000 - $110,000', description: 'Apply today, interview this week!', requirements: ['3+ years', 'Figma', 'Adobe XD'], benefits: ['Creative environment', 'Learning budget'], postedDate: '2026-01-27', deadline: '2026-02-05', applicants: 3, responseTime: '48 hours', logo: 'https://ui-avatars.com/api/?name=CS&background=7b1fa2&color=fff&size=100' },
    { title: 'Data Analyst', company: 'Analytics Plus', location: 'Brisbane, QLD (Hybrid)', type: 'Full-time', category: 'Data Science', salary: '$85,000 - $100,000', description: 'Interview within 3 days.', requirements: ['2+ years', 'Python', 'SQL', 'Tableau'], benefits: ['Mentorship', 'Flexible schedule'], postedDate: '2026-01-28', deadline: '2026-02-10', applicants: 7, responseTime: '48 hours', logo: 'https://ui-avatars.com/api/?name=AP&background=00897b&color=fff&size=100' },
    { title: 'Junior Web Developer', company: 'WebStart Inc', location: 'Remote (Australia)', type: 'Part-time', category: 'Technology', salary: '$55,000 - $65,000', description: 'One video interview and you could start next week.', requirements: ['0-2 years', 'HTML/CSS', 'JavaScript'], benefits: ['Training', 'Mentorship'], postedDate: '2026-01-29', deadline: '2026-02-03', applicants: 6, responseTime: '24 hours', logo: 'https://ui-avatars.com/api/?name=WI&background=43a047&color=fff&size=100' },
    { title: 'Project Manager', company: 'Enterprise Solutions', location: 'Sydney, NSW', type: 'Contract', category: 'Management', salary: '$130,000 - $160,000', description: 'Urgent hiring! Direct interview with hiring manager.', requirements: ['7+ years', 'PMP', 'Agile/Scrum'], benefits: ['High day rate', 'Remote options'], postedDate: '2026-01-24', deadline: '2026-02-01', applicants: 2, responseTime: 'Same day', logo: 'https://ui-avatars.com/api/?name=ES&background=5e35b1&color=fff&size=100' }
];

async function seed() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        let jobCount = await Job.countDocuments();
        if (jobCount === 0) {
            const inserted = await Job.insertMany(sampleJobs);
            jobCount = inserted.length;
            console.log(`Inserted ${inserted.length} jobs`);
        } else {
            console.log(`Jobs already exist (${jobCount}). Skipping job seed.`);
        }

        const userCount = await User.countDocuments();
        if (userCount === 0) {
            const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);
            await User.insertMany([
                { firstName: 'John', lastName: 'Smith', email: 'john.smith@email.com', password: hashedPassword, phone: '+61 412 345 678', role: 'jobseeker', location: 'Melbourne, VIC', title: 'Software Developer', skills: ['JavaScript', 'Node.js', 'React'], avatar: 'https://ui-avatars.com/api/?name=John+Smith&background=1976d2&color=fff' },
                { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@email.com', password: hashedPassword, phone: '+61 423 456 789', role: 'jobseeker', location: 'Sydney, NSW', title: 'Recent Graduate', skills: ['HTML', 'CSS', 'JavaScript'], avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=7b1fa2&color=fff' }
            ]);
            console.log('Inserted 2 users (login with email + password: ' + SEED_PASSWORD + ')');
        } else {
            console.log(`Users already exist (${userCount}). Skipping user seed.`);
        }

        const appCount = await Application.countDocuments();
        if (appCount === 0 && jobCount > 0) {
            const jobs = await Job.find().limit(3).lean();
            if (jobs.length) {
                await Application.insertMany([
                    { jobId: jobs[0]._id, jobTitle: jobs[0].title, company: jobs[0].company, userId: 'user-001', applicantName: 'John Smith', email: 'john.smith@email.com', phone: '+61 412 345 678', status: 'under_review', appliedDate: '2026-01-26', lastUpdated: '2026-01-28' },
                    { jobId: jobs[1]._id, jobTitle: jobs[1].title, company: jobs[1].company, userId: 'user-001', applicantName: 'John Smith', email: 'john.smith@email.com', phone: '+61 412 345 678', status: 'interview_scheduled', appliedDate: '2026-01-27', lastUpdated: '2026-01-29' }
                ]);
                console.log('Inserted sample applications');
            }
        } else if (appCount > 0) {
            console.log(`Applications already exist (${appCount}). Skipping.`);
        }

        console.log('Seed completed.');
    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seed();
