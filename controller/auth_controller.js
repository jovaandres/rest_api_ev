const catchAsync = require('../utils/catchAsync');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../utils/dbConnection');

const generateToken = catchAsync(async (_id, cb) => {
    const token = jwt.sign({id: _id}, process.env.SECRET);
    pool.query('UPDATE users SET token=$1 WHERE id=$2 RETURNING *', [token, _id])
        .then(row => cb(row.rows[0]));
});

const findByToken = catchAsync(async (token, cb) => {
    pool.query('SELECT * FROM users WHERE token=$1',[token])
        .then((row) => {
            cb(null, row.rows[0]);
        });
});

const deleteToken = catchAsync(async (token, cb) => {
    pool.query('UPDATE users SET token=$1 WHERE token=$2', [null, token])
        .then((row) => {
            cb(null, row.rows[0]);
        });
});

let auth = async (req, res, next) => {
    let token = req.cookies.auth;
    await findByToken(token, (err, user) => {
        if (err) throw err;
        if (!user) return res.json({
            error: true
        });

        req.token = token;
        req.user = user;
        next();
    });
}

const register = catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            message: errors.array()
        })
    }

    const row = await pool.query('SELECT email FROM users WHERE email=$1',
        [req.body.email]);

    if (row.rowCount) {
        return res.status(201).json({
            message: "The email already in use!",
        });
    }

    const hashPass = await bcrypt.hash(req.body.password, 12);

    const rows = await pool.query('INSERT INTO users(name, email, username, password) VALUES($1, $2, $3, $4)',
        [req.body.name, req.body.email, req.body.username, hashPass]);
    if (rows.rowCount) {
        return res.status(201).json({
            message: "Successfully registered!"
        });
    }
});

const login = catchAsync(async(req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({
            message: errors.array()
        })
    }

    let token = req.cookies.auth;
    await findByToken(token, async (err, user) => {
        if (err) return res(err);
        if (user) return res.status(400).json({
            error: true,
            message: "You are already logged in!"
        });
        else {
            const row = await pool.query("SELECT * FROM users WHERE email=$1",
                [req.body.email]);

            if (row.rowCount === 0) {
                return res.status(422).json({
                    message: "Invalid email address!"
                });
            }

            const passMatch = await bcrypt.compare(req.body.password, row.rows[0].password);
            if (!passMatch) {
                return res.status(422).json({
                    message: "Incorrect password!",
                });
            }

            await generateToken(row.rows[0].id, (user) => {
                res.cookie('auth', user.token).json({
                    isAuth: true,
                    id: user.id,
                    email: user.email
                });
            });
        }
    });
});

const logout = catchAsync(async(req, res) => {
    await deleteToken(req.token, (err, user) => {
        if (err) return res.status(400).send(err);
        res.sendStatus(200);
    });
});

module.exports = {
    register,
    login,
    logout,
    auth
}