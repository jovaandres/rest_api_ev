const mongoose = require('mongoose')

const reminderSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    major: {
        type: String,
        required: true
    },
    time: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model('Reminder', reminderSchema);