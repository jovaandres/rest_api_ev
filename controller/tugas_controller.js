const catchAsync = require('../utils/catchAsync');
const Reminder = require('../models/reminder.models');

const getAllReminder = catchAsync(async(req, res) => {
    const result = await Reminder.find({});
    res.status(200).json({
        error: false,
        data: result
    });
});

const addReminder = catchAsync(async(req, res) => {
    const newReminder = req.body;
    const reminder = await Reminder.create(newReminder)
    res.status(200).json({
        error: false,
        data: reminder
    });
});

module.exports = {
    getAllReminder,
    addReminder
}