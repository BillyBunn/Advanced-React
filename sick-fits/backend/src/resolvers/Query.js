const { forwardTo } = require('prisma-binding')
const { hasPermission } = require('../utils')

const Query = {
  items: forwardTo('db'),
  item: forwardTo('db'),
  itemsConnection: forwardTo('db'),
  me(parent, args, ctx, info) {
    // check if there is a current user ID
    if (!ctx.request.userId) {
      return null // don't throw error in case not logged in
    }
    return ctx.db.query.user(
      // returns a promise
      {
        where: { id: ctx.request.userId }
      },
      info // the actual query from the client side
    )
  },
  async users(parent, args, ctx, info) {
    // 1. check if they are logged in
    if (!ctx.request.userId) {
      throw new Error('You must be logged in!')
    }

    // 2. check if the user has the permissions to query users
    hasPermission(ctx.request.user, ['ADMIN', 'PERMISSIONUPDATE'])

    // 3. if they do, query all the users
    return ctx.db.query.users({}, info)
  }
}

module.exports = Query
