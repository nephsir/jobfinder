# How to Run the JobFinder Platform

## Where the seed data comes from

All sample data is defined in **`scripts/seed.js`**:

- **Jobs**: the `sampleJobs` array in that file (titles, companies, locations, salary, requirements, etc.).
- **Users**: two job-seeker users (John Smith, Sarah Johnson) are inserted in the `seed()` function.
- **Applications**: sample applications are created from the first seeded jobs and user `user-001`.

Running `npm run seed` reads that file and inserts into MongoDB. Change `scripts/seed.js` to add or edit sample jobs/users/applications.

---

## How seeding works (and how it “knows” the data shape)

**1. The models define the shape**

The **kind** of data (fields, types) is defined in the **Mongoose models**, not by the seed script:

- **`models/Job.js`** – defines job fields: `title`, `company`, `location`, `type`, `category`, `salary`, `description`, `requirements`, `benefits`, `postedDate`, `deadline`, `status`, `applicants`, `responseTime`, `interviewProcess`, `logo`, etc.
- **`models/User.js`** – defines user fields: `firstName`, `lastName`, `email`, `phone`, `role`, `location`, `title`, `skills`, `avatar`, etc.
- **`models/Application.js`** – defines application fields: `jobId`, `jobTitle`, `company`, `userId`, `applicantName`, `email`, `phone`, `status`, `appliedDate`, `lastUpdated`, etc.

The seed script doesn’t “discover” this; the seed data was **written to match** these schemas.

**2. The seed script is just code you run**

When you run `npm run seed`:

1. It connects to MongoDB (same URI as the app: `mongodb://localhost:27017/jobfinder`).
2. It uses the **same** `Job`, `User`, and `Application` models the app uses.
3. It checks each collection (e.g. `Job.countDocuments()`). If the count is 0, it inserts the sample data from `scripts/seed.js`; if not, it skips (so it doesn’t duplicate).
4. Jobs: `Job.insertMany(sampleJobs)` – inserts the `sampleJobs` array.
5. Users: `User.insertMany([...])` – inserts the two user objects in the code.
6. Applications: it fetches the first jobs from the DB, then `Application.insertMany([...])` with `jobId`, `jobTitle`, etc., so applications link to real job documents.
7. It disconnects and exits.

**3. Changing what gets seeded**

- To change **which fields** exist: edit the **models** (e.g. `models/Job.js`), then adjust the objects in `scripts/seed.js` to include those fields.
- To change **the sample content** (different job titles, companies, users): edit only **`scripts/seed.js`** (the `sampleJobs` array and the user/application objects). Keep field names and types in line with the models.

---

## 1. Start MongoDB

In MongoDB bin directory run:

```bash
mongod --dbpath ~/mongodb-data
```

Make sure you have a folder called `mongodb-data` in your home directory (or create it: `mkdir -p ~/mongodb-data`).

Leave this terminal running.

---

## 2. Start the app

In a **new terminal**, from the project folder:

```bash
cd "/Users/mac/Documents/GROUP PROJECT"
npm start
```

Open **http://localhost:3000** in your browser (do not open the HTML file directly – login/signup need the server).

---

## 3. Populate the database (seed sample data)

With the app **stopped** (Ctrl+C in the terminal where `npm start` was running), run:

```bash
npm run seed
```

This inserts sample jobs, users, and applications into MongoDB. You only need to run it once (or again if you cleared the database).

Then start the app again:

```bash
npm start
```

---

## Did seeding populate MongoDB?

**Yes.** When you run `npm run seed` successfully, it:

- Connects to MongoDB at `mongodb://localhost:27017/jobfinder`
- Inserts **5 sample jobs** (if the jobs collection is empty)
- Inserts **2 users** (John Smith, Sarah Johnson) if empty
- Inserts **sample applications** if empty

You should see in the terminal: `Inserted 5 jobs`, `Inserted 2 users`, `Inserted sample applications`, and `Seed completed.` If you see "Jobs already exist" etc., the database was already populated (seed skips inserts when data is there).

---

## View the data in MongoDB Compass

1. **Install MongoDB Compass** (if you haven’t): [https://www.mongodb.com/products/compass](https://www.mongodb.com/products/compass)

2. **Start MongoDB** (so Compass can connect):
   ```bash
   mongod --dbpath ~/mongodb-data
   ```

3. **Open Compass** and connect:
   - In the connection box, use: **`mongodb://localhost:27017`**
   - Click **Connect**.

4. **Open the JobFinder database:**
   - In the left sidebar, click the database named **`jobfinder`**.

5. **View collections (tables):**
   - **`jobs`** – the 5 seeded jobs (and any new ones from “Post a Job”).
   - **`users`** – the 2 seeded users.
   - **`applications`** – sample applications.

Click a collection name to see its documents. You can browse, filter, and edit documents there.