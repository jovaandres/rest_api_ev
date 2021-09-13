const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'Users'
    },
});

module.exports = mongoose.model('Token', tokenSchema);