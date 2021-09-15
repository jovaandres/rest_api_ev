const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mailer = require('../utils/mailer');
const User = require('../models/users.models');
const Token = require('../models/tokens.models');

const generateToken = catchAsync(async (user, cb) => {
    const jwToken = jwt.sign({email: user.email}, process.env.SECRET, {expiresIn: '1h'});
    const result = await Token.findOneAndUpdate({user_id: user}, {token: jwToken}, {
        new: true,
        upsert: true,
        rawResult: true
    });
    cb(result.value);
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
    const {name, username, email, password} = req.body;

    const user = await User.findOne({email: email});

    if (user) {
        return res.status(201).json({
            message: "The email already in use!",
        });
    } else {
        const hashPass = await bcrypt.hash(password, 12);

        let newUser = new User({
            name: name,
            username: username,
            email: email,
            password: hashPass
        });

        const result = await newUser.save();
        if (result) {
            CreateVerificationEmail(result, res);
            req.session.user = result;
            return res.status(201).json({
                message: "Successfully registered!"
            });
        }
    }
});

const login = catchAsync(async (req, res) => {
    const {email, password} = req.body;

    let user = req.session.user;
    if (user) return res.status(400).json({
        error: true,
        message: "You are already logged in!"
    });
    else {
        let user = await User.findOne({email: email});

        if (!user) {
            return res.status(422).json({
                message: "Invalid email address!"
            });
        }

        const passMatch = await bcrypt.compare(password, user.password);
        if (!passMatch) {
            return res.status(422).json({
                message: "Incorrect password!",
            });
        } else {
            req.session.user = user;
            res.status(200).json({
                user: user,
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
    const email = req.body.email;

    const user = await User.findOne({email: email});
    if (user) {
        CreateVerificationEmail(user, res);

        return res.status(201).json({
            message: "Email verification link sent!"
        });
    } else {
        res.json({
            message: "User not found!"
        });
    }
});

const verifyEmail = catchAsync(async (req, res) => {
    const email = req.body.email;
    const token = req.body.token;

    const decode = jwt.verify(token, process.env.SECRET);

    if (decode.email === email) {
        await User.findOneAndUpdate({email: email}, {is_verified: true});

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
    const email = req.body.email

    const user = await User.findOne({email: email});

    if (user) {
        generateToken(user, (tokens) => {
            mailer.send({
                template: 'register',
                message: {
                    to: email
                },
                locals: {
                    name: user.name,
                    email: email,
                    link: `${process.env.ORIGIN_FRONTEND}/reset/${email}/${tokens.token}`
                }
            });
        });
    } else {
        return res.status(404).json({
            message: "Email not found"
        })
    }

    return res.status(200).json({
        message: "Email reset link sent!"
    })
});

const changePassword = catchAsync(async (req, res) => {
    const {newPass, _, email, token} = req.body;

    const decode = jwt.verify(token, process.env.SECRET);
    if (decode.email === email) {
        const hashPass = await bcrypt.hash(newPass, 12);
        await User.findOneAndUpdate({email: email}, {password: hashPass});

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