const mongoose = require('mongoose');
const { Schema } = mongoose;

const TasksSchema = new Schema({
    user : {
         type : mongoose.Schema.Types.ObjectId,
          ref: 'user'
    },
    title :  {
        type: String,
        required: true
    },
    description : {
        type: String,
        required: true,

    },
    tag : {
        type: String,
        default: "General"
    },
    duedate : {
        type: Date, 
        required : true
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started',
      },
      priority: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        default: 'Low',
      },
      reminder: {
        type: String,
        default: null,
    },
    assignedMembers: [
        {
          type: Schema.Types.ObjectId,
          ref: 'user',
        },
      ],
    comments: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
          },
          text: {
            type: String,
            required: true
          },
          createdAt: {
            type: Date,
            default: Date.now
          }
        }
      ]
})


module.exports = mongoose.model('tasks', TasksSchema);
