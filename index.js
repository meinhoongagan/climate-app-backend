const express = require('express');
const connectDB = require('./db/db');
const cors = require("cors")
const dotenv = require('dotenv');
const dailyFootprintRoutes = require('./routes/dailyFootprintRoutes');
const userRoutes = require('./routes/userRoutes'); // Import the user router
const postRoutes = require('./routes/Post.routes');
const carbonReport = require('./routes/carbonReport')

const app = express();
const PORT = process.env.PORT || 5000 ;

//environment variables
dotenv.config();

// Connect to MongoDB
connectDB(); 

// Middleware
app.use(express.json({limit:"50mb"}));
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000","https://climate-change-app.vercel.app"],
    credentials: true,
}));

// Use the daily footprint and user routes
app.use('/api/footprint', dailyFootprintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/carbon-report',carbonReport)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
  