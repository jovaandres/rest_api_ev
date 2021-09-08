const catchAsync = require('../utils/catchAsync');
const {body, validationResult} = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../utils/dbConnection');
const mailer = require('../utils/mailer');

const generateToken = catchAsync(async (_id, cb) => {
    const token = jwt.sign({id: _id}, process.env.SECRET, {expiresIn: '30m'});
    pool.query('UPDATE users SET token=$1 WHERE id=$2 RETURNING *', [token, _id])
        .then(row => cb(row.rows[0]));
});

const findByToken = catchAsync(async (token, cb) => {
    pool.query('SELECT * FROM users WHERE token=$1', [token])
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
    body('password', 'Password is invalid (empty or length less than 8 characters).').notEmpty().isLength({min: 8});
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

    const rows = await pool.query('INSERT INTO users(name, email, username, password) VALUES($1, $2, $3, $4) RETURNING *',
        [req.body.name, req.body.email, req.body.username, hashPass]);
    if (rows.rowCount) {
        CreateVerificationEmail(rows.rows[0], res);
        return res.status(201).json({
            message: "Successfully registered!"
        });
    }
});

const login = catchAsync(async (req, res) => {
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

            generateToken(row.rows[0].id, (user) => {
                res.cookie('auth', user.token).json({
                    isAuth: true,
                    id: user.id,
                    email: user.email
                });
            });
        }
    });
});

const logout = catchAsync(async (req, res) => {
    deleteToken(req.token, (err, user) => {
        if (err) return res.status(400).send(err);
        res.sendStatus(200);
    });
});

function CreateVerificationEmail(user, res) {
    if (user.is_verified) return res.status(403).json({
        message: "Email already verified"
    });

    generateToken(user.id, (row) => {
        mailer.send({
            template: 'register',
            message: {
                to: user.email
            },
            locals: {
                name: user.name,
                link: `${process.env.ORIGIN_URL}/verify/${user.email}/${row.token}`
            }
        }).catch(console.error);
    }, "Email verification sent!");
}

const reqEmailVerify = catchAsync(async (req, res) => {
    const email = req.params.email;
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors);
    }

    pool.query('SELECT * FROM users WHERE email=$1', [email])
        .then(row => {
            CreateVerificationEmail(row.rows[0], res);

            return res.status(201).json({
                message: "Email verification link sent!"
            });
        });
});

const verifyEmail = catchAsync(async (req, res) => {
    const email = req.params.email;
    const token = req.params.token;
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors);
    }

    pool.query('SELECT * FROM users WHERE email=$1', [email])
        .then(async (row) => {
            if (row.rows[0].token === token) {
                await pool.query('UPDATE users SET is_verified=$1 WHERE email=$2 RETURNING *',
                    [true, email]);
            }
            res.status(200).json({
                message: "Email verified"
            });
        });
});

const resetPassword = catchAsync(async (req, res) => {
    const email = req.params.email;
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors);
    }

    pool.query('SELECT * FROM users WHERE email=$1', [email])
        .then(row => {
            generateToken(row.rows[0].id, (user) => {
                mailer.send({
                    template: 'register',
                    message: {
                        to: user.email
                    },
                    locals: {
                        name: user.name,
                        email: user.email,
                        link: `${process.env.ORIGIN_URL}/reset/${email}/${user.token}`
                    }
                }).catch(console.error);
            }, "Email reset sent!");
        });

    return res.status(200).json({
        message: "Email reset link sent!"
    })
});

const changePassword = catchAsync(async (req, res) => {
    body('newPass', 'Password is invalid (empty or length less than 8 characters).').notEmpty().isLength({min: 8});
    body('confirmPass', 'Password confirmation is required.').notEmpty();
    body("email", "Team email is required!").notEmpty();
    body("token", "Token is required!").notEmpty();

    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors);
    }

    pool.query('SELECT * FROM users WHERE email=$1', [req.body.email])
        .then(async (row) => {
            if (row.rows[0].token === req.body.token) {
                const hashPass = await bcrypt.hash(req.body.newPass, 12);
                await pool.query('UPDATE users SET password=$1 WHERE email=$2 RETURNING *',
                    [hashPass, req.body.email]);

                res.status(200).json({
                    message: "Password updated"
                });
            }
        });
})

module.exports = {
    register,
    login,
    logout,
    auth,
    reqEmailVerify,
    verifyEmail,
    resetPassword,
    changePassword
}