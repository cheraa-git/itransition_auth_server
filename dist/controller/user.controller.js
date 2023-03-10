'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const db = require('../db');
const bcrypt = require("bcrypt");
var jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.PGPASSWORD;
const toCamelcase = (user) => {
    return Object.assign(Object.assign({}, user), { registrationTimestamp: user.registration_timestamp, lastLoginTimestamp: user.last_login_timestamp });
};
class UserController {
    getUsers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const users = (yield db.query('SELECT * from users')).rows;
                const camelcaseUsers = users.map(user => toCamelcase(user));
                res.json(camelcaseUsers);
            }
            catch (error) {
                console.log(error);
                res.status(500).json({ error: 'Server error' });
            }
        });
    }
    setUsersState(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { ids, status } = req.body;
                for (let id of ids) {
                    yield db.query('UPDATE users set status = $1 where id = $2 RETURNING *', [status, id]);
                }
                const users = (yield db.query('SELECT * from users')).rows;
                const camelCaseUsers = users.map(user => toCamelcase(user));
                res.json(camelCaseUsers);
            }
            catch (error) {
                console.log(error);
                res.status(500).json({ error: 'Server error' });
            }
        });
    }
    deleteUsers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { ids } = req.body;
                for (let id of ids) {
                    yield db.query('DELETE from users where id = $1 RETURNING *', [id]);
                }
                const users = (yield db.query('SELECT * from users')).rows;
                const camelCaseUsers = users.map(user => toCamelcase(user));
                res.json(camelCaseUsers);
            }
            catch (error) {
                console.log(error);
                res.status(500).json({ error: 'Server error' });
            }
        });
    }
    registerUser(req, res) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const name = (_a = req.body.name) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
                const email = (_b = req.body.email) === null || _b === void 0 ? void 0 : _b.trim().toLowerCase();
                const password = (_c = req.body.password) === null || _c === void 0 ? void 0 : _c.trim();
                if (!name || !email || !password) {
                    return res.status(500).json({ error: 'Registration data invalid' });
                }
                const emailMatches = (yield db.query('SELECT * from users where email = $1', [email])).rows;
                if (emailMatches.length > 0) {
                    return res.status(500).json({ error: 'Email already exists' });
                }
                const hashPassword = yield bcrypt.hash(password, 10);
                const token = jwt.sign(hashPassword, SECRET_KEY);
                const dateNow = `${Date.now()}`;
                const userData = [name, email, dateNow, dateNow, 'active', hashPassword, token];
                const newUser = yield db.query(`
                  INSERT INTO users (name, email, last_login_timestamp, registration_timestamp, status, password, token)
                  values ($1, $2, $3, $4, $5, $6, $7)
                  RETURNING id, name, email, last_login_timestamp, registration_timestamp, status, token`, userData);
                res.json(toCamelcase(newUser.rows[0]));
            }
            catch (error) {
                console.log(error);
                res.status(500).json({ error: 'Server error' });
            }
        });
    }
    loginUser(req, res) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const email = (_a = req.body.email) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
                const password = (_b = req.body.password) === null || _b === void 0 ? void 0 : _b.trim();
                const emailMatch = (yield db.query('SELECT * from users where email = $1', [email])).rows;
                const user = emailMatch[0];
                if (!email || !password) {
                    return res.status(500).json({ error: 'Registration data invalid' });
                }
                if (emailMatch.length === 0) {
                    return res.status(500).json({ error: 'No user with this email was found' });
                }
                const comparePassword = yield bcrypt.compare(password, user.password);
                if (!comparePassword) {
                    return res.status(500).json({ error: 'The password is invalid' });
                }
                if (!user.status || user.status === 'blocked') {
                    return res.status(500).json({ error: 'The user is blocked' });
                }
                const token = jwt.sign(user.password, SECRET_KEY);
                const uploadData = [`${Date.now()}`, token, user.id];
                let response = yield db.query(`UPDATE users
                                     set last_login_timestamp = $1, token = $2
                                     where id = $3
                                     RETURNING id, name, email, last_login_timestamp, registration_timestamp, status, token`, uploadData);
                res.json(toCamelcase(response.rows[0]));
            }
            catch (error) {
                console.log(error);
                res.status(500).json({ error: 'Server error' });
            }
        });
    }
    autoLogin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = req.body.token;
            const user = (yield db.query('SELECT  id, name, email, last_login_timestamp, registration_timestamp, status, token from users where token = $1', [token])).rows[0];
            res.json(user ? toCamelcase(user) : {});
        });
    }
}
module.exports = new UserController();
