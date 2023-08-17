const express = require('express');
const mongoose = require('mongoose');
const router = express.Router(); 
const fetchuser = require('../middleware/fetchuser');
const Task = require('../models/Task');
const User = require('../models/User');
const { Schema } = mongoose;
const { body, validationResult, param } = require('express-validator');





// ROUTE 0: Get All Users using GET "api/tasks/fetchallusers" Login required
router.get('/fetchallusers', fetchuser, async (req, res) => {
    try {
      const users = await User.find().select('_id name'); // Retrieve only the _id and name fields of users
      res.json(users);
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Internal Server Error');
    }
  });



// // ROUTE 1: Get All the Tasks using GET "api/tasks/fetchalltasks" Login required and query must be given with which field to check
router.get('/fetchalltasks', fetchuser, async (req, res) => {
  try {
      const { dueDate, status, priority, assignedTo, search } = req.query;

      let query = {
          $or: [
              { user: req.user.id }, // Tasks created by the logged-in user
              { assignedMembers: req.user.id }, // Tasks assigned to the logged-in user
          ]
      };

      if (dueDate) {
          query.duedate = new Date(dueDate);
      }
      if (status) {
          query.status = status;
      }
      if (priority) {
          query.priority = priority;
      }
      if (assignedTo) {
          query.assignedMembers = req.user.id; // Change this based on your data structure
      }
      if (search) {
          query.$or = [
              { title: { $regex: search, $options: 'i' } }, // Case-insensitive title search
              { description: { $regex: search, $options: 'i' } }, // Case-insensitive description search
              { 'comments.text': { $regex: search, $options: 'i' } } // Case-insensitive comment search
          ];
      }

      const tasks = await Task.find(query)
          .populate('user', 'name')
          .populate('assignedMembers', 'name');

      // Modify the response to include the assigned members' names for each task
      const tasksWithAssignedMembers = tasks.map(task => {
          const assignedMembersNames = task.assignedMembers.map(member => member.name);
          return {
              _id: task._id,
              user: task.user,
              title: task.title,
              description: task.description,
              tag: task.tag,
              duedate: task.duedate,
              status: task.status,
              priority: task.priority, // Include the priority field
              comments: task.comments, // Include the comments in the response
              assignedMembers: assignedMembersNames
          };
      });

      res.json(tasksWithAssignedMembers);
  } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
  }
});



// Route 2: Add a task and assign it to multiple users using POST "api/tasks/addtask" Login required
router.post('/addtask', fetchuser, [
  body('title', 'Enter a valid Title').isLength({ min: 3 }),
  body('description', 'Description must be of at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
  try {
    const { title, description, tag, duedate, users, comments } = req.body;

    // Validate if the users specified in the users array exist in the database
    const validUserIds = [];
    for (const userId of users) {
      console.log(userId);
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        return res.status(400).json({ error: `User with ID ${userId} does not exist` });
      }
      validUserIds.push(userId);
    }

    // If there are errors, return Bad Request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Create the task with assigned members
    const task = new Task({
      user: req.user.id,
      title,
      description,
      tag,
      duedate,
      assignedMembers: validUserIds, // Assign the valid user IDs to assignedMembers array
      comments: comments,
    });

    const savedTask = await task.save();
    res.json(savedTask);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
});




// // ROUTE 3: Update an existing task using PUT "api/tasks/updatetask/:id" (Login required)
// router.put('/updatetask/:id', fetchuser, async (req, res) => {
//   console.log('Update Task Route Hit');
//   try {
//     const { title, description, tag, duedate, status, priority, comment } = req.body;

//     // Create a newTask object with the updated fields
//     const newTask = {};
//     if (title) newTask.title = title;
//     if (description) newTask.description = description;
//     if (tag) newTask.tag = tag;
//     if (status) newTask.status = status;
//     if (duedate) newTask.duedate = duedate;
//     if (priority) newTask.priority = priority;

//     if (comment) {
//       newTask.comments = [
//         ...req.task.comments,
//         {
//           user: req.user.id,
//           text: comment
//         }
//       ];
//     }

//     // Find the task to be updated and update it
//     const updatedTask = await Task.findByIdAndUpdate(
//       req.params.id,
//       { $set: newTask },
//       { new: true }
//     );

//     if (!updatedTask) {
//       return res.status(404).json({ error: 'Task not found' });
//     }

//     // Ensure that the user making the request is allowed to update the task
//     if (updatedTask.user.toString() !== req.user.id) {
//       return res.status(401).json({ error: 'Not allowed to update this task' });
//     }

//     console.log('Updated Task:', updatedTask);
//     res.json({ task: updatedTask });
//   } catch (error) {
//     console.error(error.message);
//     res.status(500).send('Internal Server Error');
//   }
// });




// ROUTE 3: Update an existing task using PUT "api/tasks/updatetask/:id" (Login required)
router.put('/updatetask/:id', fetchuser, async (req, res) => {
  console.log('Update Task Route Hit');
  try {
    const { title, description, tag, duedate, status, priority, comment } = req.body;

    // Fetch the task to be updated
    const taskToUpdate = await Task.findById(req.params.id);

    if (!taskToUpdate) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Log the user IDs for debugging
    console.log('Task User ID:', taskToUpdate.user);
    console.log('Request User ID:', req.user.id);

    // Check if the user making the request is the owner of the task or an assigned member
    const isOwner = taskToUpdate.user.equals(req.user.id);
    const isAssignedMember = taskToUpdate.assignedMembers.includes(req.user.id);

    if (!isOwner && !isAssignedMember) {
      return res.status(401).json({ error: 'Not allowed to update this task' });
    }

    // Create a newTask object with the updated fields
    const newTask = {
      title,
      description,
      tag,
      status,
      duedate,
      priority,
      comments: comment
        ? [
            ...taskToUpdate.comments,
            {
              user: req.user.id,
              text: comment,
            },
          ]
        : taskToUpdate.comments,
    };

    // Update the task and retrieve the updated task
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: newTask },
      { new: true }
    );

    console.log('Updated Task:', updatedTask);
    res.json({ task: updatedTask });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
});




// ROUTE 4 : Delete an existing task using : DELETE "api/notes/deletetask/:id"   Login required

router.delete('/deletetask/:id', fetchuser, async (req, res) => {
  try {
    // Find the task to be deleted
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check if the authenticated user is an assigned member of the task
    const assignedMembersIds = task.assignedMembers.map(member => member.toString());
    if (!assignedMembersIds.includes(req.user.id)) {
      return res.status(401).json({ error: "Not Allowed" });
    }

    // Delete the task
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: "Task has been deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get('/fetchcomments/:id', fetchuser, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task.comments);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
});


module.exports = router;



module.exports = router