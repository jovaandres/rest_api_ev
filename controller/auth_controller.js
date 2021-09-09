const catchAsync = require('../utils/catchAsync');
const {body, validationResult} = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../utils/dbConnection');
const mailer = require('../utils/mailer');

const generateToken = catchAsync(async (user, cb) => {
    const token = jwt.sign({email: user.email}, process.env.SECRET, {expiresIn: '30m'});
    pool.query('INSERT INTO tokens (token, user_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET token=$1 RETURNING *',
        [token, user.id]).then(row => cb(row.rows[0]));
});

let auth = catchAsync(async (req, res, next) => {
    let user = req.session.user;
    if (user) {
        next();
    } else {
        return res.status(401).json({
            error: true,
            message: "User not authenticated"
        });
    }
});

const getAuth = catchAsync(async (req, res) => {
    return res.status(200).json({
        user: req.session.user,
        message: 'Successfully Logged In!'
    });
});

const register = catchAsync(async (req, res) => {
    body('email', 'This field is required!').notEmpty();
    body('password', 'Password is invalid (empty or length less than 8 characters).').notEmpty().isLength({min: 8});
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            message: errors.array()
        })
    }

    const {name, username, email, password} = req.body;

    const row = await pool.query('SELECT email FROM users WHERE email=$1', [email]);

    if (row.rowCount) {
        return res.status(201).json({
            message: "The email already in use!",
        });
    }

    const hashPass = await bcrypt.hash(password, 12);

    const rows = await pool.query('INSERT INTO users(name, email, username, password) VALUES($1, $2, $3, $4) RETURNING *',
        [name, email, username, hashPass]);

    if (rows.rowCount) {
        CreateVerificationEmail(rows.rows[0], res);
        req.session.user = rows.rows[0];
        return res.status(201).json({
            message: "Successfully registered!"
        });
    }
});

const login = catchAsync(async (req, res) => {
    body('email', 'This field is required!').notEmpty();
    body('password', 'Password is invalid (empty or length less than 8 characters).').notEmpty().isLength({min: 8});
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({
            message: errors.array()
        })
    }

    const {email, password} = req.body;

    let user = req.session.user;
    if (user) return res.status(400).json({
        error: true,
        message: "You are already logged in!"
    });
    else {
        const row = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

        if (row.rowCount === 0) {
            return res.status(422).json({
                message: "Invalid email address!"
            });
        }

        const passMatch = await bcrypt.compare(password, row.rows[0].password);
        if (!passMatch) {
            return res.status(422).json({
                message: "Incorrect password!",
            });
        } else {
            req.session.user = row.rows[0];
            res.status(200).json({
                user: row.rows[0],
                message: "Successfully Logged In!"
            });
        }
    }
});

const logout = catchAsync(async (req, res) => {
    req.session.destroy();
    res.sendStatus(200);
});

function CreateVerificationEmail(user, res) {
    if (user.is_verified) return res.status(403).json({
        message: "Email already verified"
    });

    generateToken(user, (tokens) => {
        mailer.send({
            template: 'register',
            message: {
                to: user.email
            },
            locals: {
                name: user.name,
                link: `${process.env.ORIGIN_FRONTEND}/verify/${tokens.token}`
            }
        }).catch(console.error);
    }, "Email verification sent!");
}

const reqEmailVerify = catchAsync(async (req, res) => {
    body('email', 'This field is required!').notEmpty();
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors);
    }

    const email = req.body.email;

    pool.query('SELECT * FROM users WHERE email=$1', [email])
        .then(row => {
            CreateVerificationEmail(row.rows[0], res);

            return res.status(201).json({
                message: "Email verification link sent!"
            });
        });
});

const verifyEmail = catchAsync(async (req, res) => {
    body('email', 'This field is required!').notEmpty();    
    body('token', 'This field is required!').notEmpty();    
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors);
    }

    const email = req.body.email;
    const token = req.body.token;

    const decode = jwt.verify(token, process.env.SECRET);

    if (decode.email === email) {
        await pool.query('UPDATE users SET is_verified=$1 WHERE email=$2', [true, email]);

        res.status(200).json({
            message: "Email verified"
        });
    } else {
        res.status(404).json({
            message: "Invalid token or token is expired"
        });
    }
});

const resetPassword = catchAsync(async (req, res) => {
    body('email', 'This field is required!').notEmpty();
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors);
    }

    const email = req.body.email

    pool.query('SELECT * FROM users WHERE email=$1', [email])
        .then(row => {
            generateToken(row.rows[0], (tokens) => {
                mailer.send({
                    template: 'register',
                    message: {
                        to: email
                    },
                    locals: {
                        name: row.rows[0].name,
                        email: email,
                        link: `${process.env.ORIGIN_FRONTEND}/reset/${tokens.token}`
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

    const {newPass, _, email, token} = req.body;

    let errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(errors);
    }

    const decode = jwt.verify(token, process.env.SECRET);
    if (decode.email === email) {
        const hashPass = await bcrypt.hash(newPass, 12);
        await pool.query('UPDATE users SET password=$1 WHERE email=$2', [hashPass, email]);

        res.status(200).json({
            message: "Password updated"
        });
    } else {
        res.status(404).json({
            message: "Invalid token or token is expired"
        });
    }
})

module.exports = {
    register,
    login,
    logout,
    auth,
    getAuth,
    reqEmailVerify,
    verifyEmail,
    resetPassword,
    changePassword
}