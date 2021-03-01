const Parameter = require('./Parameter.js')
const CommandError = require('../../CommandError.js')
const PermissionUtils = require('../../../../utils/PermissionUtils.js')

const MENTION_REGEX = /^(?:<@!?)?([0-9]{16,18})(?:>)?$/
const defVal = (o, k, d) => typeof o[k] === 'undefined' ? d : o[k]

module.exports = class UserParameter extends Parameter {
  static parseOptions (options = {}) {
    return {
      ...super.parseOptions(options),
      acceptBot: !!options.acceptBot,
      acceptUser: defVal(options, 'acceptUser', true),
      acceptDeveloper: defVal(options, 'acceptDeveloper', true),
      acceptSelf: !!options.acceptSelf,
      acceptPartial: !!options.acceptPartial,
      errors: {
        invalidUser: 'errors:invalidUser',
        acceptSelf: 'errors:sameUser',
        acceptBot: 'errors:invalidUserBot',
        acceptUser: 'errors:invalidUserNotBot',
        acceptDeveloper: 'errors:userCantBeDeveloper',
        acceptPartial: 'errors:userPartial',
        ...(options.errors || {})
      }
    }
  }

  static async parse (arg, { t, client, author, guild }) {
    if (!arg) return

    const regexResult = MENTION_REGEX.exec(arg)
    const id = regexResult && regexResult[1]
    const findMember = guild.members.cache.get(id) || guild.members.cache.find(m => m.user.username.toLowerCase().includes(arg.toLowerCase()) || m.displayName.toLowerCase().includes(arg.toLowerCase()))
    const partialUser = this.acceptPartial && await client.users.fetch(id).catch(() => null)
    const user = (!!findMember && findMember.user) || client.users.cache.get(id)

    if (!user) {
      if (!this.acceptPartial) throw new CommandError(t(this.errors.acceptPartial))
      if (partialUser) {
        return partialUser
      }
      throw new CommandError(t(this.errors.invalidUser))
    }

    if (!this.acceptSelf && user.id === author.id) throw new CommandError(t(this.errors.acceptSelf))
    if (!this.acceptBot && user.bot) throw new CommandError(t(this.errors.acceptBot))
    if (!this.acceptUser && !user.bot) throw new CommandError(t(this.errors.acceptUser))
    if (!this.acceptDeveloper && PermissionUtils.isDeveloper(client, user)) throw new CommandError(t(this.errors.acceptDeveloper), false)

    return user
  }
}
