# Database Implementation Guide – MongoDB + Mongoose

Follow these steps to add MongoDB to the JobFinder platform.

---

## Step 1: Install MongoDB (if not already)

**Option A – Local MongoDB**

- **macOS (Homebrew):** `brew tap mongodb/brew && brew install mongodb-community`
- **Windows:** Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
- **Linux:** See [docs.mongodb.com/manual/administration/install-on-linux](https://docs.mongodb.com/manual/administration/install-on-linux/)

Start the service (macOS): `brew services start mongodb-community`

**Option B – MongoDB Atlas (cloud)**

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free cluster.
2. Create a database user and note the password.
3. Under **Network Access**, add `0.0.0.0/0` (or your IP) to allow connections.
4. Click **Connect** → **Connect your application** and copy the connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/jobfinder`).

---

## Step 2: Install dependencies

From the project root:

```bash
npm install mongoose
```

(`dotenv` is already in the project for environment variables.)

---

## Step 3: Environment variable

Create a `.env` file in the project root (same folder as `server.js`). You can copy from this template (create a file named `.env` and paste):

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/jobfinder
```

- **Local MongoDB:** use `mongodb://localhost:27017/jobfinder` (database name: `jobfinder`).
- **Atlas:** use the connection string from Step 1 and replace `<password>` with your user password. You can keep the same database name or change the path to `/jobfinder` at the end.

---

## Step 4: Project structure (what was added)

```
GROUP PROJECT/
├── config/
│   └── db.js              # MongoDB connection
├── models/
│   ├── Job.js             # Job schema
│   ├── Application.js     # Application schema
│   └── User.js            # User schema
├── scripts/
│   └── seed.js            # Seed sample data (optional)
├── .env                   # You create this (see Step 3)
├── .env.example           # Template (no secrets)
└── server.js              # Updated to connect to DB
```

- **config/db.js** – Connects to MongoDB using `MONGODB_URI`.
- **models/** – Mongoose schemas and models for Jobs, Applications, Users.
- **scripts/seed.js** – Optional script to insert sample jobs/applications/users.
- **Services** – `jobsService`, `applicationsService`, `usersService` now use these models (async).

---

## Step 5: Start the app

1. Start MongoDB (if local):  
   `brew services start mongodb-community` (macOS) or run `mongod`.

2. Load env and start the server:

```bash
node server.js
```

Or with `nodemon`:

```bash
npm run dev
```

You should see in the console: `MongoDB connected` (or similar). If not, check `MONGODB_URI` in `.env` and that MongoDB is running.

---

## Step 6: Seed sample data (optional)

To pre-fill jobs, applications, and users:

```bash
node scripts/seed.js
```

Run once. It’s safe to run again; it checks for existing data and can skip or update as needed.

---

## Step 7: Verify

- Open `http://localhost:3000`.
- **Job Seeker:** “Find Jobs” should list jobs from the database.
- **Employer:** “Post a Job” should create a job that appears in the list and persists after restart.
- **Apply to a job** and check “View” applications as Employer; data should come from the DB.

Use **MongoDB Compass** or **Atlas UI** to inspect collections: `jobs`, `applications`, `users`.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Install MongoDB locally or create an Atlas cluster |
| 2 | `npm install mongoose` |
| 3 | Create `.env` with `MONGODB_URI` |
| 4 | Use existing `config/db.js`, `models/*.js`, and updated services |
| 5 | Start app: `node server.js` or `npm run dev` |
| 6 | (Optional) Run `node scripts/seed.js` |
| 7 | Test UI and check DB in Compass/Atlas |

If the app starts but you see “MongoDB connection error”, double-check:

- MongoDB is running (local) or Atlas cluster is reachable.
- `MONGODB_URI` in `.env` is correct and has no extra spaces.
- Firewall/network allows connection to MongoDB (especially for Atlas).
