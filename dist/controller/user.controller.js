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
const camelcase = (str) => {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
};
const toCamelcase = ({ id, status, email, registration_timestamp, last_login_timestamp, name }) => {
    return {
        id,
        name,
        email,
        registrationTimestamp: registration_timestamp,
        lastLoginTimestamp: last_login_timestamp,
        status
    };
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
                res.json(users);
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
                const dateNow = `${Date.now()}`;
                const userData = [name, email, dateNow, dateNow, 'active', hashPassword];
                const newUser = yield db.query(`
                  INSERT INTO users (name, email, last_login_timestamp, registration_timestamp, status, password)
                  values ($1, $2, $3, $4, $5, $6)
                  RETURNING id, name, email, last_login_timestamp, registration_timestamp, status`, userData);
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
                    console.log(email, password);
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
                const uploadData = [`${Date.now()}`, user.id];
                let response = yield db.query(`UPDATE users
                                     set last_login_timestamp = $1
                                     where id = $2
                                     RETURNING id, name, email, last_login_timestamp, registration_timestamp, status`, uploadData);
                res.json(response.rows[0]);
            }
            catch (error) {
                console.log(error);
                res.status(500).json({ error: 'Server error' });
            }
        });
    }
}
module.exports = new UserController();
