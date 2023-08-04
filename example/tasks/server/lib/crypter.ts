import { hash as bcryptHash, compare as bcryptCompare } from 'bcrypt'

const saltRounds = 10
export const hash = async (password: string) => await bcryptHash(password, saltRounds)
export const compare = async (password: string, hashedPassword: string) => bcryptCompare(password, hashedPassword)
