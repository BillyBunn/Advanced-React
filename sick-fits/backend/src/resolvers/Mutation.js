const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { randomBytes } = require('crypto')
const { promisify } = require('util')

const { transport, makeANiceEmail } = require('../mail')
const { hasPermission } = require('../utils')

const Mutations = {
  async createItem(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error(`You must be logged in to do that!`)
    }
    console.log('userID in create item', ctx.request.userId)
    const item = await ctx.db.mutation.createItem(
      {
        data: {
          // creates relationship between item & user
          user: {
            connect: {
              id: ctx.request.userId
            }
          },
          ...args
        }
      },
      info
    )
    console.log('userID on item:', item)
    return item
  },

  updateItem(parent, args, ctx, info) {
    // first take a copy of the updates
    const updates = { ...args }
    // remove the ID from the updates (we can't update that)
    delete updates.id
    // run the update method
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: args.id
        }
      },
      info
    )
  },

  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id }
    // 1. find the item
    const item = await ctx.db.query.item({ where }, `{id title user { id}}`)
    // 2. Check if they own that item or have the permissions
    const ownsItem = item.user.id === ctx.request.userId
    const hasPermissions = ctx.request.user.permissions.some(permission =>
      ['ADMIN', 'ITEMDELETE'].includes(permission)
    )

    if (!ownsItem && !hasPermissions) {
      throw new Error(`You don't have permission to do that!`)
    }

    // 3. Delete it!
    return ctx.db.mutation.deleteItem({ where }, info)
  },

  async signup(parent, args, ctx, info) {
    // lowercase email
    args.email = args.email.toLowerCase()
    // hash their password
    const password = await bcrypt.hash(args.password, 10)
    //  create the user in the database
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ['USER'] }
        }
      },
      info
    )
    // create the JWT token for them
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)
    // set the JWT as a cookie on teh response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year token
    })
    // return the user to the browser
    return user
  },

  async signin(parent, { email, password }, ctx, info) {
    // 1. check if there is a user with that email
    const user = await ctx.db.query.user({ where: { email } })
    if (!user) {
      throw new Error(`No such user found for email ${email}`)
    }
    // 2. check if their password is correct
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw new Error(`Invalid password!`)
    }
    // 3. generate the jwt token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET)
    // 4. set the cookie with the token
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    })
    // 5. return the user
    return user
  },

  async signout(parent, args, ctx, info) {
    // 'clearCookie' method from cookie-parser MW
    ctx.response.clearCookie('token')
    return { message: 'Goodbye!' }
  },

  async requestReset(parent, args, ctx, info) {
    // 1. check if it's a real user
    const user = await ctx.db.query.user({ where: { email: args.email } })
    if (!user) {
      throw new Error(`No such user found for email ${args.email}`)
    }
    // 2. set a reset token & expiry on that user
    const randomBytesPromisified = promisify(randomBytes)
    const resetToken = (await randomBytesPromisified(20)).toString('hex')
    const resetTokenExpiry = Date.now() + 3600000 // 1 hour from now
    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    })
    // 3. email the reset token
    const mailRes = await transport.sendMail({
      from: 'billy@billybunn.com',
      to: user.email,
      subject: 'Your password reset token',
      html: makeANiceEmail(`Your Password Reset Token is here!

      <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click Here to Reset</a>`)
    })

    // 4. return the message
    return { message: 'Thanks!' }
  },

  async resetPassword(parent, args, ctx, info) {
    // 1. check if passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error(`Passwords don't match!`)
    }
    // 2. check if resetToken is valid
    // 3. check if resetToken is expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    })
    if (!user) {
      throw new Error(`This token is either invalid or expired!`)
    }
    // 4. hash their new password
    const password = await bcrypt.hash(args.password, 10)
    // 5. save new password to user & remove old resetToken fields
    const updatedUser = await ctx.db.mutation.updateUser({
      where: {
        email: user.email
      },
      data: {
        password: password,
        resetToken: null,
        resetTokenExpiry: null
      }
    })
    // 6. generate jwt
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET)
    // 7. set the jwt cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    })
    // 8. return the new user
    return updatedUser
  },
  async updatePermissions(parent, args, ctx, info) {
    // 1. check if they're logged in
    if (!ctx.request.userId) {
      throw new Error('You must be logged in!')
    }

    // 2. query the current user
    const currentUser = await ctx.db.query.user(
      {
        where: { id: ctx.request.userId }
      },
      info
    )

    // 3. check if they have permissions to do this
    hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE'])

    // 4. update the  permissions
    return ctx.db.mutation.updateUser(
      {
        where: {
          id: args.userId
        },
        data: {
          permissions: {
            set: args.permissions
          }
        }
      },
      info
    )
  }
}

module.exports = Mutations
