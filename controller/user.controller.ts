'use strict'

import { Request, Response } from "express"
import { User, UserDb } from "../types"

const db = require('../db')
const bcrypt = require("bcrypt")
var jwt = require('jsonwebtoken')
const SECRET_KEY = process.env.PGPASSWORD

const toCamelcase = (user: UserDb) => {
  return {
    ...user,
    registrationTimestamp: user.registration_timestamp,
    lastLoginTimestamp: user.last_login_timestamp,
  } as User
}


class UserController {

  async getUsers(req: Request, res: Response) {
    try {
      const users: UserDb[] = (await db.query('SELECT * from users')).rows
      const camelcaseUsers = users.map(user => toCamelcase(user))
      res.json(camelcaseUsers)
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Server error' })
    }
  }


  async setUsersState(req: Request, res: Response) {
    try {
      const { ids, status } = req.body
      for (let id of ids) {
        await db.query('UPDATE users set status = $1 where id = $2 RETURNING *', [status, id])
      }
      const users: UserDb[] = (await db.query('SELECT * from users')).rows
      const camelCaseUsers = users.map(user => toCamelcase(user))
      res.json(camelCaseUsers)
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Server error' })
    }
  }

  async deleteUsers(req: Request, res: Response) {
    try {
      const { ids } = req.body
      for (let id of ids) {
        await db.query('DELETE from users where id = $1 RETURNING *', [id])
      }
      const users: UserDb[] = (await db.query('SELECT * from users')).rows
      const camelCaseUsers = users.map(user => toCamelcase(user))
      res.json(camelCaseUsers)
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Server error' })
    }
  }

  async registerUser(req: Request, res: Response) {
    try {
      const name = req.body.name?.trim().toLowerCase()
      const email = req.body.email?.trim().toLowerCase()
      const password = req.body.password?.trim()
      if (!name || !email || !password) {
        return res.status(500).json({ error: 'Registration data invalid' })
      }
      const emailMatches = (await db.query('SELECT * from users where email = $1', [email])).rows
      if (emailMatches.length > 0) {
        return res.status(500).json({ error: 'Email already exists' })
      }
      const hashPassword = await bcrypt.hash(password, 10)
      const token = jwt.sign(hashPassword, SECRET_KEY)
      const dateNow = `${Date.now()}`
      const userData = [name, email, dateNow, dateNow, 'active', hashPassword, token]
      const newUser = await db.query(`
                  INSERT INTO users (name, email, last_login_timestamp, registration_timestamp, status, password, token)
                  values ($1, $2, $3, $4, $5, $6, $7)
                  RETURNING id, name, email, last_login_timestamp, registration_timestamp, status, token`,
        userData)
      res.json(toCamelcase(newUser.rows[0]))
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Server error' })
    }
  }

  async loginUser(req: Request, res: Response) {
    try {
      const email = req.body.email?.trim().toLowerCase()
      const password = req.body.password?.trim()
      const emailMatch = (await db.query('SELECT * from users where email = $1', [email])).rows
      const user = emailMatch[0]

      if (!email || !password) {
        return res.status(500).json({ error: 'Registration data invalid' })
      }

      if (emailMatch.length === 0) {
        return res.status(500).json({ error: 'No user with this email was found' })
      }

      const comparePassword = await bcrypt.compare(password, user.password)
      if (!comparePassword) {
        return res.status(500).json({ error: 'The password is invalid' })
      }

      if (!user.status || user.status === 'blocked') {
        return res.status(500).json({ error: 'The user is blocked' })
      }

      const token = jwt.sign(user.password, SECRET_KEY)
      const uploadData = [`${Date.now()}`, token, user.id]
      let response = await db.query(`UPDATE users
                                     set last_login_timestamp = $1, token = $2
                                     where id = $3
                                     RETURNING id, name, email, last_login_timestamp, registration_timestamp, status, token`
        , uploadData)
      res.json(toCamelcase(response.rows[0]))
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Server error' })
    }

  }
  async autoLogin(req: Request, res: Response) {
    const token = req.body.token
    const user = (await db.query('SELECT  id, name, email, last_login_timestamp, registration_timestamp, status, token from users where token = $1', [token])).rows[0]
    res.json(user ? toCamelcase(user) : {})
  }
}


module.exports = new UserController()
