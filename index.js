const express = require('express');
const connectDB = require('./db/db');
const cors = require("cors")
const dotenv = require('dotenv');
const dailyFootprintRoutes = require('./routes/dailyFootprintRoutes');
const userRoutes = require('./routes/userRoutes'); // Import the user router
const postRoutes = require('./routes/Post.routes');
const carbonReport = require('./routes/carbonReport');
const pdfRouter = require('./routes/pdfRoute');
const { v2: cloudinary } = require('cloudinary');

const app = express();
const PORT = process.env.PORT || 5000 ;

//environment variables
dotenv.config();

// Connect to MongoDB
connectDB(); 

// Middleware
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:3000","https://climate-change-app.vercel.app"],
    credentials: true,
}));

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use the daily footprint and user routes
app.use('/api/footprint', dailyFootprintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/carbon-report',carbonReport);
app.use('/api/pdf', pdfRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
  