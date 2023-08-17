// const connectToMongo  = require('./db');
// const express = require('express')
// var cors = require('cors')

// connectToMongo();

// const app = express()
// const port = 5500

// app.use(cors())
// app.use(express.json());

// // Available Routes
// app.use ('/api/auth', require('./routes/auth'));
// app.use ('/api/tasks', require('./routes/tasks'));





// app.listen(port, () => {
//   console.log(`Task Manager Backend listening on port ${port}`)
// })



const connectToMongo = require('./db');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const mongoose = require('mongoose');
const Task = require('./models/Task');

connectToMongo();

const app = express();
const port = process.env.PORT || 5500;

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

// Notification Schedules and Priority Update
cron.schedule("0 */12 * * *", async () => {
  try {
    const date = new Date();
    const tasks = await Task.find();
    tasks.forEach(async (item) => {
      if (item.duedate.getDate() - date.getDate() < 0) {
        // If the due date has passed, update the priority to "High"
        await Task.findByIdAndUpdate(item._id, {
          $set: {
            reminder: "DeadLine Exceeded !!",
            priority: "High",
          },
        });
      } else if (item.duedate.getDate() - date.getDate() == 1) {
        // If the due date is tomorrow, update the priority to "High"
        await Task.findByIdAndUpdate(item._id, {
          $set: {
            reminder: "DeadLine Tomorrow.",
            priority: "High",
          },
        });
      } else if (item.duedate.getDate() - date.getDate() == 0) {
        // If the due date is today, update the priority to "High"
        await Task.findByIdAndUpdate(item._id, {
          $set: {
            reminder: "Today is the DeadLine !!",
            priority: "High",
          },
        });
      } else if (item.duedate.getDate() - date.getDate() <= 3) {
        // If the due date is approaching within 3 days, update the priority to "Medium"
        await Task.findByIdAndUpdate(item._id, {
          $set: {
            reminder: "Due Date Approaching.",
            priority: "Medium",
          },
        });
      } else if (item.duedate.getDate() - date.getDate() > 3) {
        // If the due date is more than 3 days away, update the priority to "Low"
        await Task.findByIdAndUpdate(item._id, {
          $set: {
            reminder: "Due Date Approaching.",
            priority: "Low",
          },
        });
      }
    });
    console.log("Priority update complete.");
  } catch (error) {
    console.error("Error in priority update:", error);
  }
});

app.listen(port, () => {
  console.log(`Task Manager Backend listening on port ${port}`);
});
