const { forwardTo } = require('prisma-binding');

const Query = {
  items: forwardTo('db'),
  item: forwardTo('db'),
  itemsConnection: forwardTo('db'),
  me(parent, args, ctx, info) {
    // check if there is a current user ID
    if (!ctx.request.userId) {
      return null; // don't throw error in case not logged in
    }
    return ctx.db.query.user( // returns a promise
      {
        where: { id: ctx.request.userId }
      },
      info // the actual query from the client side
    );
  }
};

module.exports = Query;
