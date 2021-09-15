const {check, validationResult} = require('express-validator');

const createValidationFor = (named) => {
    switch (named) {
        case 'register':
            return [
                check('name').notEmpty(),
                check('username').notEmpty(),
                check('email').isEmail().notEmpty(),
                check('password').notEmpty().isLength({min: 8})
            ];
        case 'login':
            return [
                check('email').isEmail().notEmpty(),
                check('password', ).notEmpty().isLength({min: 8})
            ];
        case 'reqverify':
            return [
                check('email').notEmpty()
            ]
        case 'verify':
            return [
                check('email').notEmpty(),
                check('token').notEmpty()
            ];
        case 'reset':
            return [
                check('email').notEmpty()
            ];
        case 'change':
            return [
                check('newPass').notEmpty().isLength({min: 8}),
                check('confirmPass').notEmpty(),
                check("email").notEmpty(),
                check("token").notEmpty()
            ];
        case 'reminder':
            return [
                check('title').notEmpty(),
                check('time').notEmpty().custom((value) => {
                    if (!value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+$/)) {
                        throw new Error('Datetime not match');
                    }

                    const date = new Date(value);
                    if (!date.getTime()) {
                        throw new Error('Datetime not match');
                    }
                    return true;
                }),
                check("major").notEmpty()
            ];
        default:
            return [];
    }
}

const checkValidationResult = (req, res, next) => {
    const result = validationResult(req);
    console.log(result.errors);
    if (result.isEmpty()) next();
    else {
        let msg = ''
        result.errors.forEach((err) => {
            msg += `(${err.param}) ` + err.msg + '; ';
        });
        res.status(422).json({
            message: msg
        });
    }
}

module.exports = {
    createValidationFor,
    checkValidationResult
}