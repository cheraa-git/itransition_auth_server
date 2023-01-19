'use strict'

import { Request, Response } from "express"
import { User, UserDb } from "../types"

const db = require('../db')
const bcrypt = require("bcrypt")

const toCamelcase = ({ id, status, email, registration_timestamp, last_login_timestamp, name }: UserDb) => {
  return {
    id,
    name,
    email,
    registrationTimestamp: registration_timestamp,
    lastLoginTimestamp: last_login_timestamp,
    status
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

      const dateNow = `${Date.now()}`
      const userData = [name, email, dateNow, dateNow, 'active', hashPassword]
      const newUser = await db.query(`
                  INSERT INTO users (name, email, last_login_timestamp, registration_timestamp, status, password)
                  values ($1, $2, $3, $4, $5, $6)
                  RETURNING id, name, email, last_login_timestamp, registration_timestamp, status`,
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
        console.log(email, password)
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

      const uploadData = [`${Date.now()}`, user.id]
      let response = await db.query(`UPDATE users
                                     set last_login_timestamp = $1
                                     where id = $2
                                     RETURNING id, name, email, last_login_timestamp, registration_timestamp, status`
        , uploadData)
      res.json(response.rows[0])
    } catch (error) {
      console.log(error)
      res.status(500).json({ error: 'Server error' })
    }

  }
}

module.exports = new UserController()
